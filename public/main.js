// MAIN SCREEN — stato via websocket + particelle (Canvas 2D) + transizioni GSAP
// + interludio "giorni nel futuro" tra un capitolo e l'altro.
const socket = io({ query: { role: "main" } });
const OCHRE = "#ecae31", TERRA = "#e18e74", WHITE = "rgba(255,255,255,0.82)";
const $ = (id) => document.getElementById(id);
const G = window.gsap;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

$("qr").src = "/qr?data=" + encodeURIComponent(location.origin + "/?role=device");

// ==========================================================================
// PARTICELLE — idle: wander libero su tutto lo schermo; voto: orbita sul polo
// ==========================================================================
const canvas = $("fx"), ctx = canvas.getContext("2d");
const particles = new Map();
let poles = { facile: null, difficile: null };
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
function setOrbit(p, tag) { p.target = tag; p.spin = Math.random() < 0.5 ? -1 : 1; p.color = tag === "facile" ? TERRA : OCHRE; }
function clearOrbits() { for (const p of particles.values()) { p.target = null; p.color = WHITE; const a = Math.random() * Math.PI * 2; p.vx = Math.cos(a) * 0.5; p.vy = Math.sin(a) * 0.5; } }
function polePos() {
  const votingVisible = !$("voteArea").classList.contains("hidden") && !$("game").classList.contains("hidden");
  if (votingVisible) {
    // coordinate-documento (il canvas parte da top:0): aggiungo lo scroll
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2 + scrollX, y: b.top + b.height / 2 + scrollY }; };
    poles.facile = r($("poleFacile")); poles.difficile = r($("poleDifficile"));
  } else { poles.facile = null; poles.difficile = null; }
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
  if (b.heatgrid) { const h = b.heatgrid;
    return `<figure class="heatgrid" data-hot="${h.hot}" aria-label="${h.hot} ${h.label}">`
      + `<div class="hg-cal">${heatCells(h.from, h.days, h.hot)}</div>`
      + `<figcaption><b class="hg-count">0</b> ${h.label}</figcaption></figure>`;
  }
  return "";
}
// Calendario del caldo: una RIGA per mese (etichettata), una COLONNA per giorno 1–31.
// I giorni caldi sono addensati a metà stagione (fine luglio) con qualche tregua: look di ondata.
// ponytail: distribuzione illustrativa deterministica, non dati reali.
const MONTHS_IT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
function heatCells(fromISO, days, hot) {
  const center = days * 0.52;                                                    // picco: fine luglio
  const order = [...Array(days).keys()].sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
  const hotSet = new Set();
  for (const i of order) { if (hotSet.size >= hot) break; if (i % 9 === 3) continue; hotSet.add(i); } // qualche tregua
  for (const i of order) { if (hotSet.size >= hot) break; hotSet.add(i); }                            // completa a quota
  const d = new Date(fromISO), end = new Date(fromISO); end.setDate(end.getDate() + days);
  let html = "", idx = 0;
  while (d < end) {                                                              // una riga per mese
    const m = d.getMonth(), y = d.getFullYear(), inMonth = new Date(y, m + 1, 0).getDate();
    html += `<span class="hg-mon">${MONTHS_IT[m]}</span>`;
    for (let dm = 1; dm <= 31; dm++) {                                           // 31 colonne fisse
      if (dm <= inMonth && d < end && d.getDate() === dm) {
        html += `<i class="hg-cell${hotSet.has(idx) ? " hot" : ""}"></i>`;
        idx++; d.setDate(d.getDate() + 1);
      } else html += `<i class="hg-pad"></i>`;                                   // giorno inesistente o fuori range
    }
  }
  return html;
}
function runHeatGrid() {
  document.querySelectorAll("#chBody .heatgrid").forEach(fig => {
    const cells = fig.querySelectorAll(".hg-cell"), hot = fig.querySelectorAll(".hg-cell.hot");
    const countEl = fig.querySelector(".hg-count"), target = +fig.dataset.hot;
    if (REDUCED || !G) { hot.forEach(c => c.classList.add("on")); countEl.textContent = fmtNum(target); return; }
    const dur = hot.length * 0.02 + 0.3, o = { n: 0 };
    G.timeline()
      .from(cells, { opacity: 0, scale: 0.3, transformOrigin: "50% 50%", duration: 0.25, ease: "power1.out", stagger: { each: 0.01, from: "start" } })
      .to(hot, { backgroundColor: "#e18e74", boxShadow: "0 0 8px #e18e74", duration: 0.3, ease: "power1.out", stagger: { each: 0.02, from: "start" } }) // il rosso si accende in ordine cronologico
      .to(o, { n: target, duration: dur, ease: "none", onUpdate: () => countEl.textContent = fmtNum(o.n) }, "<"); // il contatore sale in sincrono
  });
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
  runHeatGrid();
}
const fmtNum = (n) => Math.round(n).toLocaleString("it-IT");
const fmtDate = (iso) => new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

// --- timeline scrollabile ------------------------------------------------
const PPD = 4;              // pixel per giorno (spaziatura del nastro)
const START_HOLD = 0.55;    // pausa sul punto di partenza (fa vedere lo 0)
const SCROLL_DUR = 2.4;     // durata dello scorrimento
const WHEEL_SCALE = 4.2;    // quanto la wheel è più grande del titolo a riposo (calibrabile)
const REST_SCALE = 1 / WHEEL_SCALE;   // il titolo è la wheel rimpicciolita (downscale = nitido)
const WHEEL_CY = 0.42;      // centro verticale della wheel, in frazione di viewport
let trackBuilt = false, titleShown = false;
function buildTrack(startISO, endDays) {
  if (trackBuilt) return;
  const track = $("iTrack"); const start = new Date(startISO);
  const span = isFinite(endDays) ? endDays : 4500;
  let d = new Date(start.getFullYear(), start.getMonth(), 1), html = "", guard = 0;
  while (guard++ < 4000) {                        // una tacca al mese, etichetta a gennaio
    const off = Math.round((d - start) / 86400000);
    if (off > span + 60) break;
    if (off >= -31) {
      const isYear = d.getMonth() === 0;
      html += `<div class="tick${isYear ? " year" : ""}" style="left:${off * PPD}px">${isYear ? `<span class="lab">${d.getFullYear()}</span>` : ""}</div>`;
    }
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  track.innerHTML = html; trackBuilt = true;
}

// Un solo elemento (#iReadout) fa da titolo persistente in alto e, al cambio
// capitolo, cresce al centro come "wheel", conta i giorni, e torna titolo.
// È lo STESSO elemento che scala → titolo e wheel hanno sempre proporzioni
// coerenti, nessuno scambio, nessuno scatto di dimensioni.
function playInterstitial(fromDays, toDays, dateISO, startISO, endISO) {
  const valid = dateISO && !isNaN(new Date(dateISO)) && isFinite(fromDays) && isFinite(toDays);
  if (!valid) return Promise.resolve();
  buildTrack(startISO, daysBetween(startISO, endISO));
  const readout = $("iReadout"), track = $("iTrack"), daysEl = $("iDays"), dateEl = $("iDate");
  const startMs = new Date(startISO).getTime();
  const setAt = (day) => {
    track.style.transform = `translateX(${-day * PPD}px)`;        // scorre il nastro
    daysEl.textContent = fmtNum(day);
    dateEl.textContent = fmtDate(new Date(startMs + Math.round(day) * 86400000));
  };
  // stato TITOLO = wheel rimpicciolita in alto; stato WHEEL = scala 1 (nativa, nitida) al centro.
  const restY = (r) => r.height * REST_SCALE / 2 - r.height / 2;   // il titolo (ridotto) si ancora a top:14px
  const wheelY = (r) => innerHeight * WHEEL_CY - (r.top + r.height / 2);
  if (REDUCED || !G) {
    setAt(toDays);
    const r = readout.getBoundingClientRect();
    readout.style.transform = `translateY(${restY(r)}px) scale(${REST_SCALE})`;
    readout.style.opacity = 1; titleShown = true; return Promise.resolve();
  }
  return new Promise((resolve) => {
    const genesis = !titleShown;                                   // 1° capitolo: nessun titolo precedente, la wheel nasce
    G.set(readout, { clearProps: "transform" });                   // torna a dimensione nativa (wheel) per misurarla
    setAt(fromDays);                                               // il titolo mostra GIÀ i giorni di partenza → nessun numero che salta
    const r = readout.getBoundingClientRect();
    const tY = restY(r), wY = wheelY(r);
    const proxy = { d: fromDays };
    G.set(readout, { x: 0, y: tY, scale: REST_SCALE, opacity: genesis ? 0 : 1 });   // parte come titolo (o nasce, se genesis)
    G.timeline({ onComplete: () => { titleShown = true; resolve(); } })
      // TITOLO → WHEEL: cresce al centro (fino a scala 1 = nitida); sfondo e timeline compaiono insieme
      .to("#iBg", { opacity: 1, duration: 0.7, ease: "power2.out" }, 0)
      .to(readout, { opacity: 1, y: wY, scale: 1, duration: 0.9, ease: "power3.inOut" }, 0)
      .to("#iTimeline", { opacity: 1, duration: 0.6, ease: "power2.out" }, genesis ? 0.35 : 0.2)
      .to({}, { duration: genesis ? START_HOLD + 0.4 : START_HOLD })
      // CONTEGGIO: la timeline scorre e il numero sale da fromDays a toDays
      .to(proxy, { d: toDays, duration: SCROLL_DUR, ease: "power2.inOut", onUpdate: () => setAt(proxy.d) })
      .to({}, { duration: 0.4 })                                   // stop sul target
      // WHEEL → TITOLO: torna piccola in alto; sfondo e timeline svaniscono insieme
      .to(readout, { y: tY, scale: REST_SCALE, duration: 0.9, ease: "power3.inOut" })
      .to("#iBg", { opacity: 0, duration: 0.6, ease: "power2.in" }, "<")
      .to("#iTimeline", { opacity: 0, duration: 0.5, ease: "power2.in" }, "<");
  });
}

// ==========================================================================
// RENDER capitolo / voto / finale
// ==========================================================================
function fillChapter(s) {
  $("chYear").textContent = s.chapter.year;
  $("chTitle").textContent = s.chapter.title;
  $("chBody").innerHTML = (s.chapter.beats || []).map(beatHTML).join("");
}
function animateChapterIn(s) {
  fillChapter(s);
  if (REDUCED || !G) { runCounters(); return; }
  G.set("#col", { opacity: 1 });
  G.timeline()
    .from("#chYear", { opacity: 0, y: 24, duration: 0.5, ease: "power3.out" })
    .from("#chTitle", { opacity: 0, y: 48, duration: 0.7, ease: "power4.out" }, "-=0.35")
    .from("#chBody > *", { opacity: 0, y: 28, stagger: 0.1, duration: 0.6, ease: "power2.out" }, "-=0.4")
    .add(runCounters, "-=0.2");
}
function animateVoteIn() {
  if (REDUCED || !G) return;
  G.from("#voteQ", { opacity: 0, y: 20, duration: 0.5, ease: "power3.out" });
  // box risposta STATICI: nessuna animazione d'ingresso. Solo i numeri pulsano (vedi main:tally).
}

let bodyIndex = -1, voteShown = false;
function renderBody(s) {
  if (bodyIndex !== s.index) { window.scrollTo({ top: 0 }); animateChapterIn(s); bodyIndex = s.index; voteShown = false; }  // nuovo capitolo → torna in cima
  const voting = s.phase === "voting" && s.options;
  $("voteArea").classList.toggle("hidden", !voting);
  if (voting) {
    $("voteQ").textContent = s.options.q;
    const fa = s.options.opts.find(o => o.tag === "facile"), di = s.options.opts.find(o => o.tag === "difficile");
    $("poleFacile").querySelector(".opt").textContent = fa ? fa.text : "";
    $("poleDifficile").querySelector(".opt").textContent = di ? di.text : "";
    $("poleFacile").querySelector(".n").textContent = s.tally.facile;
    $("poleDifficile").querySelector(".n").textContent = s.tally.difficile;
    $("poleFacile").classList.remove("win"); $("poleDifficile").classList.remove("win");
    if (!voteShown) {
      voteShown = true; clearOrbits();
      setTimeout(() => { polePos(); animateVoteIn(); $("voteArea").scrollIntoView({ behavior: "smooth", block: "center" }); }, 30);
    }
  } else { voteShown = false; clearOrbits(); }
  polePos();
}
function renderEnded(s) {
  $("verdict").textContent = s.chapter.verdict;
  $("endName").textContent = s.attractor.name;
  $("endedFired").innerHTML = firedHTML(s.fired);
  if (s.consensus) $("consensus").textContent = `${s.consensus.same} in linea con la sala · ${s.consensus.diverge} su un'altra strada`;
  $("aggregates").innerHTML = (s.aggregates || []).map(a => `<div class="agg"><span>${a.year} · ${a.title}</span><b>${a.winner}</b></div>`).join("");
  if (G && !REDUCED) G.timeline()
    .from("#verdict", { opacity: 0, y: 30, duration: 0.7, ease: "power3.out" })
    .from("#endedFired .fired", { opacity: 0, x: 20, stagger: 0.12, duration: 0.5 }, "-=0.3")
    .from("#aggregates .agg", { opacity: 0, x: 20, stagger: 0.05, duration: 0.4 }, "-=0.4");
}

// ==========================================================================
// SYNC — con serializzazione dell'interludio
// ==========================================================================
let lastIndex = -1, lastFired = 0, transitioning = false, latest = null;

socket.on("main:participant", ({ cid, action, connected }) => {
  if (action === "join") ensure(cid); else particles.delete(cid);
  $("lobbyCount").textContent = connected;
});
socket.on("main:particle", ({ cid, tag }) => { ensure(cid); setOrbit(particles.get(cid), tag); });
socket.on("main:tally", ({ facile, difficile }) => {
  const set = (id, v) => { const el = $(id).querySelector(".n"); el.textContent = v; if (G && !REDUCED) G.fromTo(el, { scale: 1.25 }, { scale: 1, duration: 0.35, ease: "back.out(2)" }); };
  set("poleFacile", facile); set("poleDifficile", difficile);
});

function startTransition(s, reveal) {
  transitioning = true;
  if (G && !REDUCED) G.set("#col", { opacity: 0 });
  const from = daysBetween(s.startDate, s.prevDate), to = daysBetween(s.startDate, s.chapter.date);
  playInterstitial(from, to, s.chapter.date, s.startDate, s.endDate).then(() => { transitioning = false; reveal(latest); });
}

socket.on("main:sync", (s) => {
  latest = s;
  reconcile(s.participants || []);
  const inGame = s.phase === "narrating" || s.phase === "voting";
  $("lobby").classList.toggle("hidden", s.phase !== "lobby");
  $("game").classList.toggle("hidden", !inGame);
  $("ended").classList.toggle("hidden", s.phase !== "ended");
  $("lobbyCount").textContent = s.connected;
  if (s.phase === "lobby") {
    bodyIndex = -1; lastIndex = -1; titleShown = false;   // reset: la lobby non mostra nulla, la prossima wheel "nasce"
    // NESSUN interludio in lobby: l'animazione dei giorni parte al 1° capitolo (lobby → inizio, 0 → N giorni).
    if (G && !REDUCED) G.set(["#iReadout", "#iBg", "#iTimeline"], { opacity: 0, clearProps: "transform" });
    else $("iReadout").style.opacity = 0;
  }

  // pannello di stato (sotto l'overlay): sempre aggiornato
  if (inGame) {
    $("delegaFill").style.width = s.delega + "%";
    $("worldName").textContent = s.attractor.name;
    $("worldSub").textContent = s.attractor.sub;
    $("progress").textContent = `Capitolo ${Math.min(s.index + 1, s.bivi)} di ${s.bivi}`;
    $("firedList").innerHTML = firedHTML(s.fired);
    if (s.fired.length > lastFired && G && !REDUCED) G.from("#firedList .fired", { opacity: 0, x: 20, stagger: 0.1, duration: 0.5, ease: "power2.out" });
    lastFired = s.fired.length;
  }

  const newChapter = s.index !== lastIndex && (inGame || s.phase === "ended");
  if (inGame || s.phase === "ended") lastIndex = s.index;   // NON in lobby, o il 1° capitolo non scatta
  const reveal = (x) => (x.phase === "ended" ? renderEnded(x) : renderBody(x));

  if (transitioning) return;                       // l'interludio in corso mostrerà lo stato più recente al termine
  if (newChapter && (inGame || s.phase === "ended")) startTransition(s, reveal);
  else if (inGame) renderBody(s);
  else if (s.phase === "ended") renderEnded(s);
});
setInterval(() => { polePos(); sizeCanvas(); }, 500);
