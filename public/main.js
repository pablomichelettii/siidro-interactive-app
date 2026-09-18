// MAIN SCREEN — stato via websocket + particelle (Canvas 2D) + transizioni GSAP
// + interludio (wheel) tra un esempio e l'altro.
const socket = io({ query: { role: "main" } });
// I colori dei poli, nell'ordine delle opzioni (brandboard: --pole-1..4).
// Duplicati qui perché il canvas non legge le custom properties del CSS.
const POLI = ["#4391FF", "#F0EBE1", "#2D63B8", "#8E8E8E"], WHITE = "rgba(240,235,225,0.65)";
const $ = (id) => document.getElementById(id);
const G = window.gsap;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

$("qr").src = "/qr?data=" + encodeURIComponent(location.origin + "/?role=device");

// ==========================================================================
// PARTICELLE — idle: wander libero su tutto lo schermo; voto: orbita sul polo
// ==========================================================================
const canvas = $("fx"), ctx = canvas.getContext("2d");
const particles = new Map();
// Un polo per opzione, chiave = tag. Si popolano da quello che il DOM ha
// davvero disegnato: le coordinate sono del canvas, non si inventano.
let poles = {};
const coloreTag = new Map();      // tag -> colore, per indice dell'opzione
// il canvas copre l'INTERO documento (scrolla coi contenuti), non il viewport
function sizeCanvas() {
  const w = document.documentElement.clientWidth;
  const h = Math.max(innerHeight, document.documentElement.scrollHeight);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}
addEventListener("resize", sizeCanvas); sizeCanvas();

function spawn() {
  const a = Math.random() * Math.PI * 2, s = 0.4 + Math.random() * 0.5;
  return {
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    vx: Math.cos(a) * s, vy: Math.sin(a) * s, target: null, spin: Math.random() < 0.5 ? -1 : 1, color: WHITE, r: 4 + Math.random() * 2
  };
}
function ensure(cid) { if (!particles.has(cid)) particles.set(cid, spawn()); }
function reconcile(cids) {
  const set = new Set(cids);
  for (const cid of particles.keys()) if (!set.has(cid)) particles.delete(cid);
  cids.forEach(ensure);
}
function setOrbit(p, tag) { p.target = tag; p.spin = Math.random() < 0.5 ? -1 : 1; p.color = coloreTag.get(tag) || WHITE; }
function clearOrbits() { for (const p of particles.values()) { p.target = null; p.color = WHITE; const a = Math.random() * Math.PI * 2; p.vx = Math.cos(a) * 0.5; p.vy = Math.sin(a) * 0.5; } }
function polePos() {
  const votingVisible = !$("voteArea").classList.contains("hidden") && !$("game").classList.contains("hidden");
  poles = {};
  if (!votingVisible) return;
  // coordinate-documento (il canvas parte da top:0): aggiungo lo scroll
  for (const el of document.querySelectorAll("#poles .pole")) {
    const b = el.getBoundingClientRect();
    poles[el.dataset.tag] = { x: b.left + b.width / 2 + scrollX, y: b.top + b.height / 2 + scrollY };
  }
}
// --- BOIDS idle: lento e un po' caotico -----------------------------------
// Reynolds (separazione + allineamento + coesione) + wander casuale. O(n²);
// ponytail: naive va bene fino a qualche centinaio di particelle.
const NEIGHBOR = 82, SEP_DIST = 30, MAXSPEED = 1.15, MAXFORCE = 0.035;
const W_SEP = 1.7, W_ALIGN = 0.55, W_COH = 0.5, WANDER = 0.09;
function steer(p, dx, dy) {
  const m = Math.hypot(dx, dy); if (m === 0) return [0, 0];
  let sx = dx / m * MAXSPEED - p.vx, sy = dy / m * MAXSPEED - p.vy;
  const sm = Math.hypot(sx, sy); if (sm > MAXFORCE) { sx = sx / sm * MAXFORCE; sy = sy / sm * MAXFORCE; }
  return [sx, sy];
}
function flock(p, list) {
  let alx = 0, aly = 0, cox = 0, coy = 0, sepx = 0, sepy = 0, n = 0, ns = 0;
  for (const q of list) {
    if (q === p || q.target) continue;
    const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < NEIGHBOR) {
      alx += q.vx; aly += q.vy; cox += q.x; coy += q.y; n++;
      if (d < SEP_DIST) { sepx += dx / d; sepy += dy / d; ns++; }
    }
  }
  let ax = (Math.random() - 0.5) * WANDER, ay = (Math.random() - 0.5) * WANDER;   // caos
  if (ns > 0) { const [x, y] = steer(p, sepx / ns, sepy / ns); ax += x * W_SEP; ay += y * W_SEP; }
  if (n > 0) {
    const [x1, y1] = steer(p, alx / n, aly / n); ax += x1 * W_ALIGN; ay += y1 * W_ALIGN;
    const [x2, y2] = steer(p, cox / n - p.x, coy / n - p.y); ax += x2 * W_COH; ay += y2 * W_COH;
  }
  const m = 80;                          // rientro morbido dai bordi
  if (p.x < m) ax += 0.04; else if (p.x > canvas.width - m) ax -= 0.04;
  if (p.y < m) ay += 0.04; else if (p.y > canvas.height - m) ay -= 0.04;
  p.vx += ax; p.vy += ay;
  const sp = Math.hypot(p.vx, p.vy);
  if (sp > MAXSPEED) { p.vx = p.vx / sp * MAXSPEED; p.vy = p.vy / sp * MAXSPEED; }
  p.x += p.vx; p.y += p.vy;
  if (p.x < 0) { p.x = 0; p.vx *= -0.6; } else if (p.x > canvas.width) { p.x = canvas.width; p.vx *= -0.6; }
  if (p.y < 0) { p.y = 0; p.vy *= -0.6; } else if (p.y > canvas.height) { p.y = canvas.height; p.vy *= -0.6; }
}

// --- voto: pozzo di gravità (attrazione + vortice + separazione) ----------
const GRAV = 0.34, SWIRL = 0.22, VOTE_SEP = 26, VOTE_MAX = 2.6, VOTE_DAMP = 0.9;
function swarm(p, c, list) {
  const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy) || 1;
  let ax = (dx / d) * GRAV, ay = (dy / d) * GRAV;                     // gravità verso il centro
  ax += (-dy / d) * SWIRL * p.spin; ay += (dx / d) * SWIRL * p.spin;  // vortice attorno al centro
  for (const q of list) {                                            // separazione: niente collasso in un punto
    if (q === p || !q.target) continue;
    const sx = p.x - q.x, sy = p.y - q.y, sd = Math.hypot(sx, sy);
    if (sd > 0 && sd < VOTE_SEP) { ax += sx / sd * 0.3; ay += sy / sd * 0.3; }
  }
  p.vx = (p.vx + ax) * VOTE_DAMP; p.vy = (p.vy + ay) * VOTE_DAMP;
  const sp = Math.hypot(p.vx, p.vy); if (sp > VOTE_MAX) { p.vx = p.vx / sp * VOTE_MAX; p.vy = p.vy / sp * VOTE_MAX; }
  p.x += p.vx; p.y += p.vy;
}
function frame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const list = [...particles.values()];
  for (const p of list) {
    const targeting = p.target && poles[p.target];
    if (targeting) swarm(p, poles[p.target], list);
    else flock(p, list);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7);
    ctx.fillStyle = p.color; ctx.shadowBlur = targeting ? 18 : 9; ctx.shadowColor = p.color;
    ctx.fill(); ctx.shadowBlur = 0;
  }
  requestAnimationFrame(frame);
}
frame();

// ==========================================================================
// HELPER contenuti + interludio giorni
// ==========================================================================
function beatHTML(b) {
  if (typeof b === "string") return `<p class="beat">${b}</p>`;
  if (b.sig) return `<p class="signal">${b.sig}</p>`;
  if (b.counter) return `<div class="counter" data-to="${b.counter.to}" data-unit="${b.counter.unit || ""}">0<small>${b.counter.label}</small></div>`;
  return "";
}
function runCounters() {
  document.querySelectorAll("#chBody .counter").forEach(el => {
    const to = +el.dataset.to, unit = el.dataset.unit || "";
    if (REDUCED || !G) { el.childNodes[0].nodeValue = to.toLocaleString("it-IT") + unit; return; }
    const o = { n: 0 };
    G.to(o, { n: to, duration: 1.4, ease: "power2.out", onUpdate: () => { el.childNodes[0].nodeValue = Math.round(o.n).toLocaleString("it-IT") + unit; } });
  });
}

// --- interludio ----------------------------------------------------------
// Senza un nastro di date da percorrere non c'è più niente da far scorrere:
// resta la wheel, che è l'effetto riconoscibile. Il titolo nasce grande al
// centro, tiene, e si rimpicciolisce nella sua posizione a riposo in alto.
const HOLD = 1.2;           // quanto la wheel resta ferma al centro — da ritarare in sala, col proiettore vero
const GROW = 0.9;           // crescita e rientro
const WHEEL_SCALE = 4.2;    // quanto la wheel è più grande del titolo a riposo (calibrabile)
const REST_SCALE = 1 / WHEEL_SCALE;   // il titolo è la wheel rimpicciolita (downscale = nitido)
const WHEEL_CY = 0.42;      // centro verticale della wheel, in frazione di viewport
let titleShown = false;

// Un solo elemento (#iReadout) fa da titolo persistente in alto e, al cambio
// esempio, cresce al centro come "wheel" e torna titolo. È lo STESSO elemento
// che scala → nessuno scambio, nessuno scatto di dimensioni.
function playInterstitial(occhiello, titolo) {
  if (!titolo) return Promise.resolve();
  const readout = $("iReadout");
  $("iOcchiello").textContent = occhiello || "";
  $("iTitolo").textContent = titolo;
  // stato TITOLO = wheel rimpicciolita in alto; stato WHEEL = scala 1 (nativa, nitida) al centro.
  const restY = (r) => r.height * REST_SCALE / 2 - r.height / 2;   // il titolo (ridotto) si ancora a top:14px
  const wheelY = (r) => innerHeight * WHEEL_CY - (r.top + r.height / 2);
  if (REDUCED || !G) {
    const r = readout.getBoundingClientRect();
    readout.style.transform = `translateY(${restY(r)}px) scale(${REST_SCALE})`;
    readout.style.opacity = 1; titleShown = true; return Promise.resolve();
  }
  return new Promise((resolve) => {
    const genesis = !titleShown;                                   // 1° esempio: nessun titolo precedente, la wheel nasce
    G.set(readout, { clearProps: "transform" });                   // torna a dimensione nativa (wheel) per misurarla
    const r = readout.getBoundingClientRect();
    const tY = restY(r), wY = wheelY(r);
    G.set(readout, { x: 0, y: tY, scale: REST_SCALE, opacity: genesis ? 0 : 1 });   // parte come titolo (o nasce, se genesis)
    G.timeline({ onComplete: () => { titleShown = true; resolve(); } })
      // TITOLO → WHEEL: cresce al centro (fino a scala 1 = nitida)
      .to("#iBg", { opacity: 1, duration: 0.7, ease: "power2.out" }, 0)
      .to(readout, { opacity: 1, y: wY, scale: 1, duration: GROW, ease: "power3.inOut" }, 0)
      .to({}, { duration: genesis ? HOLD + 0.4 : HOLD })
      // WHEEL → TITOLO: torna piccola in alto, e lì resta per tutto l'esempio
      .to(readout, { y: tY, scale: REST_SCALE, duration: GROW, ease: "power3.inOut" })
      .to("#iBg", { opacity: 0, duration: 0.6, ease: "power2.in" }, "<");
  });
}

// ==========================================================================
// RENDER capitolo / voto / finale
// ==========================================================================
// Occhiello e titolo stanno nel readout in alto, lasciati lì dall'interludio:
// qui va solo il corpo dell'esempio.
function fillChapter(s) {
  // senza beats scritti, in narrazione si legge la domanda: mai una slide vuota
  $("chBody").innerHTML = (s.chapter.beats || []).map(beatHTML).join("")
    || (s.chapter.q ? beatHTML({ sig: s.chapter.q }) : "");
}
function animateChapterIn(s) {
  fillChapter(s);
  if (REDUCED || !G) { runCounters(); return; }
  G.set("#col", { opacity: 1 });
  G.timeline()
    .from("#chBody > *", { opacity: 0, y: 28, stagger: 0.1, duration: 0.6, ease: "power2.out" })
    .add(runCounters, "-=0.2");
}
function animateVoteIn() {
  if (REDUCED || !G) return;
  G.from("#voteQ", { opacity: 0, y: 20, duration: 0.5, ease: "power3.out" });
  // box risposta STATICI: nessuna animazione d'ingresso. Solo i numeri pulsano (vedi main:tally).
}

// Timer del voto. Il server manda i ms che restano, non un istante assoluto:
// il countdown parte da quando arriva il messaggio, così l'orologio del browser
// fuori sincrono non sposta niente.
let voteTl = null;
function runVoteTimer(restaMs, durataSec) {
  if (voteTl) { voteTl.kill(); voteTl = null; }
  const bar = $("voteFill");
  if (!restaMs || !durataSec) { bar.parentElement.style.display = "none"; return; }
  bar.parentElement.style.display = "";
  const frazione = Math.min(1, restaMs / (durataSec * 1000));   // chi entra a metà vede la barra già scesa
  if (REDUCED || !G) { bar.style.transform = `scaleX(${frazione})`; return; }
  G.set(bar, { scaleX: frazione });
  voteTl = G.to(bar, { scaleX: 0, duration: restaMs / 1000, ease: "none" });
}

// La rivelazione: cosa ha scelto la sala, la forbice completa di tutti i tag,
// il costo nascosto di quello che ha vinto e la chiusura scritta, se c'è.
let revealShown = false;
function renderReveal(r) {
  $("revChoice").textContent = r.label;
  $("revCosto").textContent = r.costo || "";
  $("revTally").innerHTML = r.opts.map((o, i) =>
    `<div class="voce" style="--c:${POLI[i % POLI.length]}">${r.conteggi[o.tag] ?? 0}<small>${esc(o.label)}</small></div>`).join("");
  $("revChiusura").textContent = r.chiusura || "";
  $("revChiusura").classList.toggle("hidden", !r.chiusura);
  if (revealShown || REDUCED || !G) return;
  revealShown = true;
  G.timeline()
    .from("#revChoice, #revTally .voce, #revCosto", { opacity: 0, y: 20, stagger: 0.12, duration: 0.5, ease: "power3.out" })
    // la chiusura arriva dopo una pausa piena: è il momento in cui si parla
    .from("#revChiusura", { opacity: 0, y: 24, duration: 0.8, ease: "power3.out" }, "+=0.6");
}

// I poli sono generati da qui, non scritti a mano: da 2 a 4, colore per indice.
// Rigenerarli a ogni sync farebbe ripartire le animazioni e perderebbe il DOM
// sotto le particelle: si ridisegnano solo quando cambiano davvero le opzioni.
let poliTags = "";
function renderPoles(opts) {
  const firma = opts.map(o => o.tag).join("|");
  coloreTag.clear();
  opts.forEach((o, i) => coloreTag.set(o.tag, POLI[i % POLI.length]));
  if (firma === poliTags) return;
  poliTags = firma;
  const box = $("poles");
  box.classList.toggle("stretta", opts.length > 2);
  box.innerHTML = opts.map((o, i) => `<div class="pole" data-tag="${esc(o.tag)}" style="--c:${POLI[i % POLI.length]}">
      <div>
        <div class="opt">${esc(o.label)}</div>
        ${o.guadagno ? `<div class="gain"><b>Cosa guadagni</b>${esc(o.guadagno)}</div>` : ""}
        ${o.costo_nascosto ? `<div class="cost"><b>Cosa paghi</b>${esc(o.costo_nascosto)}</div>` : ""}
      </div>
      <div class="n">0</div>
    </div>`).join("");
}

let bodyIndex = -1, voteShown = false;
function renderBody(s) {
  if (bodyIndex !== s.index) { window.scrollTo({ top: 0 }); animateChapterIn(s); bodyIndex = s.index; voteShown = false; revealShown = false; }  // nuovo capitolo → torna in cima
  const voting = s.phase === "voting" && s.options;
  const revealing = s.phase === "revealing" && s.reveal;
  $("revealArea").classList.toggle("hidden", !revealing);
  if (revealing) {
    renderReveal(s.reveal);
    clearOrbits();                       // il voto è chiuso: le particelle si sciolgono
    runVoteTimer(null);
    $("voteArea").classList.add("hidden");
    $("revealArea").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  $("voteArea").classList.toggle("hidden", !voting);
  revealShown = false;                   // se il regista riapre il voto, l'esito si rigioca
  if (voting) {
    $("voteQ").textContent = s.options.q;
    renderPoles(s.options.opts);
    showTally(s.tally, false);
    if (!voteShown) {
      voteShown = true; clearOrbits();
      runVoteTimer(s.voteRestaMs, s.voteDurata);
      setTimeout(() => { polePos(); animateVoteIn(); $("voteArea").scrollIntoView({ behavior: "smooth", block: "center" }); }, 30);
    }
  } else { voteShown = false; clearOrbits(); runVoteTimer(null); }
  polePos();
}
// La schermata finale: l'elenco degli esempi con quello che ha scelto il tavolo.
function renderEnded(s) {
  $("aggregates").innerHTML = (s.aggregates || []).map(a => {
    const tot = Object.values(a.conteggi).reduce((x, y) => x + y, 0);
    return `<div class="agg"><span>${esc(a.titolo)}</span><b>${esc(a.winnerLabel)}</b><span class="muted">${a.conteggi[a.winner]}/${tot}</span></div>`;
  }).join("");
  if (G && !REDUCED) G.from("#aggregates .agg", { opacity: 0, x: 20, stagger: 0.08, duration: 0.45, ease: "power2.out" });
}

// ==========================================================================
// CHAT — bolle che salgono nella banda bassa. Niente arriva qui se non è
// passato dall'approvazione del regista: il server manda main:chat solo allora.
// ==========================================================================
const MAX_BOLLE = 3;            // tre corsie: di più e la banda bassa diventa rumore
let bollaMs = 12000;            // permanenza, dal server (CHAT_BOLLA_MS)
const codaBolle = [];
const corsie = [null, null, null];   // quale bolla occupa quale corsia

socket.on("main:chat", (m) => { codaBolle.push(m); pompaBolle(); });

function pompaBolle() {
  let c;
  while (codaBolle.length && (c = corsie.indexOf(null)) >= 0) mostraBolla(codaBolle.shift(), c);
}

// Il testo esce da una sequenza di glifi: è un effetto, non una lettura. Se
// costa troppo su un proiettore lento, si toglie e resta la salita.
const GLIFI = "01/#01//10<>01";
function decodifica(el, testo, ms) {
  const t0 = performance.now();
  const passo = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    const fissi = Math.round(k * testo.length);
    el.textContent = testo.slice(0, fissi) + [...testo.slice(fissi)]
      .map(c => c === " " ? " " : GLIFI[(Math.random() * GLIFI.length) | 0]).join("");
    if (k < 1) requestAnimationFrame(passo);
    else { el.textContent = testo; el.parentElement?.classList.add("finita"); }
  };
  requestAnimationFrame(passo);
}

function mostraBolla(m, corsia) {
  corsie[corsia] = m.id;
  const el = document.createElement("div");
  el.className = "bolla c" + corsia;
  el.innerHTML = `<span class="chi">${esc(m.nome)}</span><span class="txt"></span>`;
  $("chat").appendChild(el);
  const via = () => { el.remove(); corsie[corsia] = null; pompaBolle(); };
  if (REDUCED || !G) {                       // niente salita né decodifica: solo dissolvenza
    el.querySelector(".txt").textContent = m.testo;
    el.classList.add("finita");
    el.style.transition = "opacity .4s"; el.style.opacity = 0;
    requestAnimationFrame(() => el.style.opacity = 1);
    setTimeout(() => { el.style.opacity = 0; setTimeout(via, 400); }, bollaMs);
    return;
  }
  decodifica(el.querySelector(".txt"), m.testo, Math.min(1400, 40 * m.testo.length));
  // entra da sotto, poi sale per tutta la banda e svanisce: il tempo in aria è
  // bollaMs, lo stesso che il regista ha impostato per la permanenza
  G.timeline({ onComplete: via })
    .fromTo(el, { y: 60, opacity: 0, filter: "blur(6px)" },
                { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.5, ease: "power3.out" })
    .to(el, { y: "-34vh", duration: bollaMs / 1000, ease: "none" })
    .to(el, { opacity: 0, duration: 1.2, ease: "power2.in" }, "-=1.6");
}

// ==========================================================================
// SYNC — con serializzazione dell'interludio
// ==========================================================================
let lastIndex = -1, transitioning = false, latest = null;

socket.on("main:participant", ({ cid, action, connected }) => {
  if (action === "join") ensure(cid); else particles.delete(cid);
  $("lobbyCount").textContent = connected;
});
socket.on("main:particle", ({ cid, tag }) => { ensure(cid); setOrbit(particles.get(cid), tag); });
// A live spento i conteggi arrivano nulli: la sala vede quanti hanno votato,
// non da che parte (§1.5). I numeri spariscono del tutto invece di mostrare un
// segnaposto: caselle vuote dove prima c'erano i numeri sembrano un guasto, e
// dal fondo della sala nessuno può chiedere.
function showTally(t, pulse) {
  const conteggi = t.conteggi || {};
  for (const el of document.querySelectorAll("#poles .pole")) {
    const n = el.querySelector(".n"), v = conteggi[el.dataset.tag];
    n.classList.toggle("hidden", v == null);
    if (v == null || n.textContent === String(v)) continue;
    n.textContent = v;
    if (pulse && G && !REDUCED) G.fromTo(n, { scale: 1.25 }, { scale: 1, duration: 0.35, ease: "back.out(2)" });
  }
  $("voteCount").innerHTML = t.live ? ""
    : `<b>${t.total}</b> hanno votato <span class="pill">i numeri si vedono a voto chiuso</span>`;
}
socket.on("main:tally", (t) => showTally(t, true));

function startTransition(s, reveal) {
  transitioning = true;
  if (G && !REDUCED) G.set("#col", { opacity: 0 });
  playInterstitial(s.chapter.occhiello, s.chapter.titolo).then(() => { transitioning = false; reveal(latest); });
}

socket.on("main:sync", (s) => {
  latest = s;
  reconcile(s.participants || []);
  const inGame = s.phase === "narrating" || s.phase === "voting" || s.phase === "revealing";
  bollaMs = s.chatBollaMs || bollaMs;
  document.body.classList.toggle("conchat", !!s.chatAttiva && s.phase === "voting");
  $("lobby").classList.toggle("hidden", s.phase !== "lobby");
  $("game").classList.toggle("hidden", !inGame);
  $("ended").classList.toggle("hidden", s.phase !== "ended");
  $("lobbyCount").textContent = s.connected;
  if (s.phase === "lobby") {
    bodyIndex = -1; lastIndex = -1; titleShown = false;   // reset: la lobby non mostra nulla, la prossima wheel "nasce"
    // NESSUN interludio in lobby: la wheel nasce sul primo esempio.
    if (G && !REDUCED) G.set(["#iReadout", "#iBg"], { opacity: 0, clearProps: "transform" });
    else $("iReadout").style.opacity = 0;
  }

  const newChapter = inGame && s.index !== lastIndex;
  if (inGame) lastIndex = s.index;                 // NON in lobby, o il 1° capitolo non scatta

  // l'interludio può finire quando il regista è già andato oltre: al termine
  // si mostra lo stato più recente, qualunque sia
  const reveal = (x) => (x.phase === "ended" ? renderEnded(x) : x.chapter ? renderBody(x) : null);

  if (transitioning) return;
  if (newChapter) startTransition(s, reveal);
  else if (inGame) renderBody(s);
  else if (s.phase === "ended") renderEnded(s);
});
setInterval(() => { polePos(); sizeCanvas(); }, 500);
