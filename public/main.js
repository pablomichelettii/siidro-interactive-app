// MAIN SCREEN — rende lo stato spinto dal server + sistema particellare (Canvas 2D).
const socket = io({ query: { role: "main" } });
const OCHRE = "#ecae31", TERRA = "#e18e74", WHITE = "rgba(255,255,255,0.8)";
const $ = (id) => document.getElementById(id);

// QR verso la root (default role=device)
$("qr").src = "/qr?data=" + encodeURIComponent(location.origin + "/");

// ---- particelle -----------------------------------------------------------
const canvas = $("fx"), ctx = canvas.getContext("2d");
const particles = new Map();            // cid -> {x,y,vx,vy,target,color}
let poles = { facile: null, difficile: null };
function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
addEventListener("resize", resize); resize();

function ensure(cid) {
  if (!particles.has(cid))
    particles.set(cid, { x: canvas.width * (.35 + Math.random() * .3), y: canvas.height * (.3 + Math.random() * .4),
      vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, target: null, color: WHITE });
}
function reconcile(cids) {
  const set = new Set(cids);
  for (const cid of particles.keys()) if (!set.has(cid)) particles.delete(cid);
  cids.forEach(ensure);
}
function polePos() {
  // agganciate alle due colonne di voto se visibili, altrimenti al centro
  const pf = $("poleFacile"), pd = $("poleDifficile");
  if (!$("voteArea").classList.contains("hidden")) {
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
    poles.facile = r(pf); poles.difficile = r(pd);
  } else { poles.facile = null; poles.difficile = null; }
}
function frame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of particles.values()) {
    const tgt = p.target && poles[p.target];
    if (tgt) { p.x += (tgt.x - p.x) * .06; p.y += (tgt.y - p.y) * .06; p.x += (Math.random() - .5) * 1.2; p.y += (Math.random() - .5) * 1.2; }
    else {
      p.vx += (Math.random() - .5) * .15; p.vy += (Math.random() - .5) * .15;
      p.vx *= .96; p.vy *= .96; p.x += p.vx; p.y += p.vy;
      if (p.x < 20 || p.x > canvas.width - 20) p.vx *= -1;
      if (p.y < 20 || p.y > canvas.height - 20) p.vy *= -1;
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 7); ctx.fillStyle = p.color; ctx.fill();
    ctx.shadowBlur = 12; ctx.shadowColor = p.color; ctx.fill(); ctx.shadowBlur = 0;
  }
  requestAnimationFrame(frame);
}
frame();

// ---- render ---------------------------------------------------------------
function beatHTML(b) {
  if (typeof b === "string") return `<p class="beat">${b}</p>`;
  if (b.sig) return `<p class="signal">${b.sig}</p>`;
  if (b.counter) return `<div class="counter">${b.counter.to.toLocaleString("it-IT")}${b.counter.unit || ""}<small>${b.counter.label}</small></div>`;
  return "";
}
function firedHTML(list) {
  return list.length ? list.map(f => `<div class="fired ${f.kind}">${f.txt}</div>`).join("")
    : `<div class="muted" style="font-size:0.85rem">Niente si è ancora saldato. Gli eventi si sommeranno.</div>`;
}

socket.on("main:participant", ({ cid, action, connected }) => {
  if (action === "join") ensure(cid); else particles.delete(cid);
  $("lobbyCount").textContent = connected;
});
socket.on("main:particle", ({ cid, tag }) => {
  ensure(cid); const p = particles.get(cid);
  p.target = tag; p.color = tag === "facile" ? TERRA : OCHRE;
});
socket.on("main:tally", ({ facile, difficile }) => {
  $("poleFacile").querySelector(".n").textContent = facile;
  $("poleDifficile").querySelector(".n").textContent = difficile;
});

socket.on("main:sync", (s) => {
  reconcile(s.participants || []);
  const show = (id, on) => $(id).classList.toggle("hidden", !on);
  show("lobby", s.phase === "lobby");
  show("game", s.phase === "narrating" || s.phase === "voting");
  show("ended", s.phase === "ended");
  $("lobbyCount").textContent = s.connected;

  if (s.phase === "narrating" || s.phase === "voting") {
    $("chYear").textContent = s.chapter.year;
    $("chTitle").textContent = s.chapter.title;
    $("chBody").innerHTML = (s.chapter.beats || []).map(beatHTML).join("");
    // pannello stato
    $("delegaFill").style.width = s.delega + "%";
    $("worldName").textContent = s.attractor.name;
    $("worldSub").textContent = s.attractor.sub;
    $("progress").textContent = `Capitolo ${Math.min(s.index + 1, s.bivi)} di ${s.bivi}`;
    $("firedList").innerHTML = firedHTML(s.fired);

    const voting = s.phase === "voting" && s.options;
    show("voteArea", voting);
    if (voting) {
      $("voteQ").textContent = s.options.q;
      const fa = s.options.opts.find(o => o.tag === "facile"), di = s.options.opts.find(o => o.tag === "difficile");
      $("poleFacile").querySelector(".opt").textContent = fa ? fa.text : "";
      $("poleDifficile").querySelector(".opt").textContent = di ? di.text : "";
      $("poleFacile").querySelector(".n").textContent = s.tally.facile;
      $("poleDifficile").querySelector(".n").textContent = s.tally.difficile;
      $("poleFacile").classList.remove("win"); $("poleDifficile").classList.remove("win");
    } else {
      // uscendo dal voto azzera i target → le particelle tornano a fluttuare
      for (const p of particles.values()) { p.target = null; p.color = WHITE; }
    }
  }

  if (s.phase === "ended") {
    for (const p of particles.values()) { p.target = null; p.color = WHITE; }
    $("verdict").textContent = s.chapter.verdict;
    $("endName").textContent = s.attractor.name;
    $("endedFired").innerHTML = firedHTML(s.fired);
    if (s.consensus) $("consensus").textContent = `${s.consensus.same} in linea con la sala · ${s.consensus.diverge} su un'altra strada`;
    $("aggregates").innerHTML = (s.aggregates || []).map(a =>
      `<div class="agg"><span>${a.year} · ${a.title}</span><b>${a.winner}</b></div>`).join("");
  }
  polePos();
});
setInterval(polePos, 500);  // riaggancia i poli dopo reflow/resize
