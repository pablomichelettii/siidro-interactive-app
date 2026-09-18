// SMARTPHONE — accoglienza (solo il nome), voto, riepilogo finale.
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

  show("chatBox", voting && view.chat);
  if (!voting) $("chatStato").textContent = "";
  if (voting && view.chat) $("chatTesto").maxLength = view.chatMaxChars || 140;
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
    // Una riga per esempio: la tua risposta accanto a quella del tavolo, e il
    // bordo acceso dove sei andato per conto tuo.
    $("scelte").innerHTML = e.scelte.map(s => `<div class="riga${s.minoranza ? " diverso" : ""}">
      <div class="tit">${esc(s.titolo)}</div>
      <div class="coppia">
        <span class="tu"><b>Tu</b>${s.voto ? esc(s.scelta) : "non hai votato"}</span>
        <span class="sala"><b>Il tavolo</b>${esc(s.vinse)}</span>
      </div>
    </div>`).join("");

    $("sceltePie").textContent = e.voti_espressi === 0
      ? "Non hai votato niente: quello che vedi è solo il tavolo."
      : e.voti_in_minoranza
        ? `${e.voti_in_minoranza} volte su ${e.voti_espressi} hai risposto diverso dal tavolo.`
        : "Hai risposto sempre come il tavolo.";
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

// ---- chat ----------------------------------------------------------------
// Tre stati, perché il mittente deve sapere che fine ha fatto il suo messaggio:
// senza, lo riscrive, e la coda del regista raddoppia da sola.
const MOTIVI = {
  chiuso: "Il voto è chiuso: adesso non si scrive.",
  chiusa: "La chat è spenta per questa serata.",
  silenziato: "La regia ha silenziato questo telefono.",
  vuoto: "Scrivi qualcosa prima di mandare.",
  aspetta: "Aspetta qualche secondo: ne hai già uno in coda.",
  "coda piena": "Troppi messaggi in attesa. Riprova tra poco.",
  "senza nome": "Serve un nome per firmare: ricarica la pagina."
};
function stato(txt, ok) {
  $("chatStato").textContent = txt;
  $("chatStato").className = ok ? "ok" : "no";
}
$("chatTesto").addEventListener("input", () => {
  const max = $("chatTesto").maxLength || 140;
  $("chatResta").textContent = max - $("chatTesto").value.length;
});
$("chatBox").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const testo = $("chatTesto").value.trim();
  if (!testo) return;
  socket.emit("device:chat", { testo }, (r) => {
    if (r && r.ok) { $("chatTesto").value = ""; $("chatResta").textContent = $("chatTesto").maxLength || 140; }
    stato(r && r.ok ? "In attesa che la regia lo pubblichi." : (MOTIVI[r && r.motivo] || "Non è partito. Riprova."), !!(r && r.ok));
  });
});
socket.on("device:chatState", ({ stato: st }) => {
  if (st === "pubblicato") stato("È sullo schermo.", true);
  else if (st === "rifiutato") stato("La regia non lo ha pubblicato.", false);
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
  const nome = $("fNome").value.trim();
  if (!nome) return;
  show("fErr", false);
  localStorage.setItem("nome", nome);
  entra({ nome });
});

// Il nome si rimanda SEMPRE al rientro, non solo la prima volta: lo stato del
// server vive in memoria e muore col processo (e col reset della regia), quindi
// un cid vecchio può benissimo non esistere più dall'altra parte. Senza nome
// riemesso, quel telefono resta muto in chat e non ha modo di rimediare.
function rientra() {
  const nome = localStorage.getItem("nome");
  if (cid && nome) return entra({ nome });
  show("onboarding", true);          // niente nome salvato: si ripassa dall'accoglienza
  show("wait", false);
}
socket.on("connect", rientra);
// il regista ha azzerato la serata: i partecipanti non esistono più, si rientra
socket.on("device:rientra", rientra);
socket.on("device:sync", render);
