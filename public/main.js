// MAIN SCREEN — stato via websocket + particelle (Canvas 2D) + transizioni GSAP.
const socket = io({ query: { role: "main" } });
const OCHRE = "#ecae31", TERRA = "#e18e74", WHITE = "rgba(255,255,255,0.82)";
const $ = (id) => document.getElementById(id);
const G = window.gsap;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

$("qr").src = "/qr?data=" + encodeURIComponent(location.origin + "/");

// ==========================================================================
// PARTICELLE — idle: wander libero su tutto lo schermo; voto: orbita sul polo
// ==========================================================================
const canvas = $("fx"), ctx = canvas.getContext("2d");
const particles = new Map();            // cid -> particle
let poles = { facile: null, difficile: null };
function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
addEventListener("resize", resize); resize();

function spawn() {
  return {
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    heading: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 1.2,        // velocità di crociera variata
    wobble: Math.random() * Math.PI * 2,
    orbit: null, color: WHITE, r: 4 + Math.random() * 2
  };
}
function ensure(cid) { if (!particles.has(cid)) particles.set(cid, spawn()); }
function reconcile(cids) {
  const set = new Set(cids);
  for (const cid of particles.keys()) if (!set.has(cid)) particles.delete(cid);
  cids.forEach(ensure);
}
function setOrbit(p, tag) {
  p.orbit = {
    pole: tag,
    R: 55 + Math.random() * 95,             // raggio d'orbita variato
    omega: (0.018 + Math.random() * 0.03) * (Math.random() < 0.5 ? -1 : 1), // verso casuale
    theta: null                              // inizializzato al primo frame dalla posa attuale
  };
  p.color = tag === "facile" ? TERRA : OCHRE;
}
function clearOrbits() {
  for (const p of particles.values()) { p.orbit = null; p.color = WHITE; p.heading = Math.random() * Math.PI * 2; }
}
function polePos() {
  const votingVisible = !$("voteArea").classList.contains("hidden") && !$("game").classList.contains("hidden");
  if (votingVisible) {
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
    poles.facile = r($("poleFacile")); poles.difficile = r($("poleDifficile"));
  } else { poles.facile = null; poles.difficile = null; }
}

function frame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of particles.values()) {
    const orbiting = p.orbit && poles[p.orbit.pole];
    if (orbiting) {
      const c = poles[p.orbit.pole];
      if (p.orbit.theta === null) p.orbit.theta = Math.atan2(p.y - c.y, p.x - c.x);
      p.orbit.theta += p.orbit.omega;
      const tx = c.x + Math.cos(p.orbit.theta) * p.orbit.R;
      const ty = c.y + Math.sin(p.orbit.theta) * p.orbit.R;
      p.x += (tx - p.x) * 0.12; p.y += (ty - p.y) * 0.12;    // si aggancia morbido all'orbita
    } else {
      // wander: sterza di poco a ogni frame + ondeggia → giravolte su tutto lo schermo
      p.heading += (Math.random() - 0.5) * 0.35;
      p.wobble += 0.05;
      const s = p.speed + Math.sin(p.wobble) * 0.25;
      p.x += Math.cos(p.heading) * s; p.y += Math.sin(p.heading) * s;
      const m = 16;                                           // wrap ai bordi = roaming continuo
      if (p.x < -m) p.x = canvas.width + m; else if (p.x > canvas.width + m) p.x = -m;
      if (p.y < -m) p.y = canvas.height + m; else if (p.y > canvas.height + m) p.y = -m;
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7);
    ctx.fillStyle = p.color; ctx.shadowBlur = orbiting ? 18 : 10; ctx.shadowColor = p.color;
    ctx.fill(); ctx.shadowBlur = 0;
  }
  requestAnimationFrame(frame);
}
frame();

// ==========================================================================
// RENDER + TRANSIZIONI
// ==========================================================================
function beatHTML(b) {
  if (typeof b === "string") return `<p class="beat">${b}</p>`;
  if (b.sig) return `<p class="signal">${b.sig}</p>`;
  if (b.counter) return `<div class="counter" data-to="${b.counter.to}" data-unit="${b.counter.unit || ""}">0<small>${b.counter.label}</small></div>`;
  return "";
}
function firedHTML(list) {
  return list.length ? list.map(f => `<div class="fired ${f.kind}">${f.txt}</div>`).join("")
    : `<div class="muted" style="font-size:0.85rem">Niente si è ancora saldato. Gli eventi si sommeranno.</div>`;
}
function runCounters() {
  document.querySelectorAll("#chBody .counter").forEach(el => {
    const to = +el.dataset.to, unit = el.dataset.unit || "";
    if (REDUCED || !G) { el.childNodes[0].nodeValue = to.toLocaleString("it-IT") + unit; return; }
    const o = { n: 0 };
    G.to(o, { n: to, duration: 1.4, ease: "power2.out", onUpdate: () => { el.childNodes[0].nodeValue = Math.round(o.n).toLocaleString("it-IT") + unit; } });
  });
}

function fillChapter(s) {
  $("chYear").textContent = s.chapter.year;
  $("chTitle").textContent = s.chapter.title;
  $("chBody").innerHTML = (s.chapter.beats || []).map(beatHTML).join("");
}
function animateChapterIn(s) {
  if (REDUCED || !G) { fillChapter(s); runCounters(); return; }
  G.to("#col", { opacity: 0, duration: 0.25, ease: "power2.in", onComplete: () => {
    fillChapter(s);
    G.set("#col", { opacity: 1 });
    G.timeline()
      .from("#chYear", { opacity: 0, y: 24, duration: 0.5, ease: "power3.out" })
      .from("#chTitle", { opacity: 0, y: 48, duration: 0.7, ease: "power4.out" }, "-=0.35")
      .from("#chBody > *", { opacity: 0, y: 28, stagger: 0.1, duration: 0.6, ease: "power2.out" }, "-=0.4")
      .add(runCounters, "-=0.2");
  } });
}
function animateVoteIn() {
  if (REDUCED || !G) return;
  G.from("#voteQ", { opacity: 0, y: 20, duration: 0.5, ease: "power3.out" });
  G.from(".pole", { opacity: 0, y: 44, scale: 0.94, stagger: 0.12, duration: 0.6, ease: "back.out(1.4)" });
}

let lastIndex = -1, lastPhase = null, lastFired = 0;

socket.on("main:participant", ({ cid, action, connected }) => {
  if (action === "join") ensure(cid); else particles.delete(cid);
  $("lobbyCount").textContent = connected;
});
socket.on("main:particle", ({ cid, tag }) => { ensure(cid); setOrbit(particles.get(cid), tag); });
socket.on("main:tally", ({ facile, difficile }) => {
  const set = (id, v) => { const el = $(id).querySelector(".n"); el.textContent = v; if (G && !REDUCED) G.fromTo(el, { scale: 1.25 }, { scale: 1, duration: 0.35, ease: "back.out(2)" }); };
  set("poleFacile", facile); set("poleDifficile", difficile);
});

socket.on("main:sync", (s) => {
  reconcile(s.participants || []);
  const show = (id, on) => $(id).classList.toggle("hidden", !on);
  show("lobby", s.phase === "lobby");
  show("game", s.phase === "narrating" || s.phase === "voting");
  show("ended", s.phase === "ended");
  $("lobbyCount").textContent = s.connected;

  if (s.phase === "narrating" || s.phase === "voting") {
    const newChapter = s.index !== lastIndex;
    if (newChapter) animateChapterIn(s);

    $("delegaFill").style.width = s.delega + "%";       // barra: transizione CSS
    $("worldName").textContent = s.attractor.name;
    $("worldSub").textContent = s.attractor.sub;
    $("progress").textContent = `Capitolo ${Math.min(s.index + 1, s.bivi)} di ${s.bivi}`;

    $("firedList").innerHTML = firedHTML(s.fired);
    if (s.fired.length > lastFired && G && !REDUCED) G.from("#firedList .fired", { opacity: 0, x: 20, stagger: 0.1, duration: 0.5, ease: "power2.out" });
    lastFired = s.fired.length;

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
      if (lastPhase !== "voting") { clearOrbits(); setTimeout(() => { polePos(); animateVoteIn(); }, 30); }
    } else {
      clearOrbits();   // fuori dal voto le particelle tornano a girovagare
    }
  }

  if (s.phase === "ended") {
    clearOrbits();
    $("verdict").textContent = s.chapter.verdict;
    $("endName").textContent = s.attractor.name;
    $("endedFired").innerHTML = firedHTML(s.fired);
    if (s.consensus) $("consensus").textContent = `${s.consensus.same} in linea con la sala · ${s.consensus.diverge} su un'altra strada`;
    $("aggregates").innerHTML = (s.aggregates || []).map(a =>
      `<div class="agg"><span>${a.year} · ${a.title}</span><b>${a.winner}</b></div>`).join("");
    if (G && !REDUCED) G.timeline()
      .from("#verdict", { opacity: 0, y: 30, duration: 0.7, ease: "power3.out" })
      .from("#endedFired .fired", { opacity: 0, x: 20, stagger: 0.12, duration: 0.5 }, "-=0.3")
      .from("#aggregates .agg", { opacity: 0, x: 20, stagger: 0.05, duration: 0.4 }, "-=0.4");
  }

  lastIndex = s.index;
  lastPhase = s.phase;
  polePos();
});
setInterval(polePos, 500);
