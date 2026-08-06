// SMARTPHONE — accoglienza, voto, epilogo.
// Il cid sta in localStorage, non in sessionStorage: una scheda chiusa o un
// telefono riavviato a metà serata ritrovano la stessa sessione, con i voti
// già dati (Patch §5, "sessione persa / telefono scarico").
const socket = io({ query: { role: "device" } });
const $ = (id) => document.getElementById(id);
let cid = localStorage.getItem("cid") || null;
let myVote = null;

function show(id, on) { $(id).classList.toggle("hidden", !on); }

// Quanto resta per cambiare idea. Il server manda i ms residui, non un istante:
// la scadenza la calcolo con l'orologio di QUESTO telefono, così non conta se è
// fuori sincrono col server.
let timer = null;
function runTimer(restaMs, durataSec) {
  clearInterval(timer); timer = null;
  const bar = $("voteFill");
  if (!restaMs || !durataSec) { bar.parentElement.style.display = "none"; return; }
  bar.parentElement.style.display = "";
  const fine = Date.now() + restaMs, tot = durataSec * 1000;
  const tick = () => {
    const resta = Math.max(0, fine - Date.now());
    bar.style.transform = `scaleX(${Math.min(1, resta / tot)})`;
    if (resta <= 0) { clearInterval(timer); timer = null; }
  };
  tick();
  timer = setInterval(tick, 200);
}

function render(view) {
  const fine = !!view.ended;                       // epilogo rivelato, o serata finita
  const voting = view.phase === "voting" && view.options;
  show("onboarding", false);
  show("wait", !voting && !fine);
  show("voteBox", voting);
  show("endBox", fine);
  document.body.classList.toggle("fine", fine);
  const ended = fine;

  if (voting) {
    $("q").textContent = view.options.q;
    // opzioni NON etichettate facile/difficile (la comoda deve sembrare ragionevole)
    $("opts").innerHTML = view.options.opts.map(o =>
      `<button class="btn vote-opt ${myVote === o.tag ? "picked" : ""}" data-tag="${o.tag}">${o.label}</button>`).join("");
    show("voteNote", !!myVote);
    runTimer(view.voteRestaMs, view.voteDurata);
  } else {
    runTimer(null);
    if (!ended) myVote = null;  // nuovo capitolo: reset del voto locale
  }

  if (ended && view.ended) {
    const e = view.ended;
    const SEGNO = { NEGATIVO: "neg", POSITIVO: "pos", TERZA_VIA_PENTIMENTO: "terza", TERZA_VIA_RESA: "terza" };
    // il testo generato, quando il regista lo ha rivelato
    $("epilogo").textContent = e.epilogo || "";
    show("epilogo", !!e.epilogo);
    const link = $("epilogoLink");
    link.href = e.link || "#";
    link.style.display = e.link ? "" : "none";
    show("epilogoLink", !!e.link);
    // Due righe di dodici frecce: la tua e quella della sala, incolonnate.
    // Le caselle dove sei andato per conto tuo sono le uniche evidenziate.
    const esc = (t) => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const freccia = (v) => v === "facile" ? "↘" : v === "difficile" ? "↗" : "·";
    const cella = (v, s, diverso) =>
      `<i class="${v || "saltato"}${diverso ? " diverso" : ""}" title="${esc(s.anno)} · ${esc(s.titolo)}">${freccia(v)}</i>`;

    $("scelte").innerHTML =
      `<span class="et">TU</span>` + e.scelte.map(s => cella(s.voto, s, s.minoranza)).join("")
      + `<span class="et">SALA</span>` + e.scelte.map(s => cella(s.vinse, s, s.minoranza)).join("");

    // ↘ comoda · ↗ faticosa, e il dato più forte che ha addosso
    $("sceltePie").innerHTML =
      `<span class="muted">↘ strada comoda · ↗ strada faticosa · · non votato</span><br>`
      + (e.voti_espressi === 0
        ? "Non hai votato nessun capitolo: questo mondo ti è capitato addosso."
        : e.voti_in_minoranza
          ? `<b>${e.voti_in_minoranza}</b> volte hai scelto diverso dalla sala — e ha vinto lei.`
          : "Hai sempre scelto come la sala.");

    $("youClimax").textContent = e.climax.nome;
    $("youVerdict").textContent = e.climax.testo;
    $("youFired").innerHTML = e.esiti.map(x =>
      `<div class="fired ${SEGNO[x.stato]}"><span class="nome">${x.nome}</span>${x.testo}</div>`).join("");
  }
}

// voto
document.addEventListener("click", (ev) => {
  const b = ev.target.closest(".vote-opt");
  if (!b) return;
  myVote = b.dataset.tag;
  document.querySelectorAll(".vote-opt").forEach(x => x.classList.toggle("picked", x === b));
  show("voteNote", true);
  socket.emit("device:vote", { option: myVote });
});

// ---- accoglienza ---------------------------------------------------------
function entra(dati) {
  socket.emit("device:join", { cid, ...dati }, (res) => {
    if (res && res.cid) { cid = res.cid; localStorage.setItem("cid", cid); }
    render(res || { phase: "lobby" });
  });
}

document.getElementById("onboarding").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const nome = $("fNome").value.trim(), nascita = $("fNascita").value;
  if (!nome || !nascita) return;
  // una data futura o assurda qui è quasi sempre un dito scivolato sul picker
  if (new Date(nascita) > new Date()) {
    $("fErr").textContent = "Quella data è nel futuro — controlla l'anno.";
    return show("fErr", true);
  }
  show("fErr", false);
  localStorage.setItem("nome", nome);
  entra({ nome, data_nascita: nascita });
});

socket.on("connect", () => {
  // chi ha già un cid rientra dritto: il server ha ancora nome ed età
  if (cid) return entra(null);
  show("onboarding", true);
  show("wait", false);
});
socket.on("device:sync", render);
