// ==========================================================================
// LOAD TEST — simula N partecipanti reali (WS → join → voto a ogni bivio) e
// pilota la regia dall'inizio al finale. Verifica connessioni + reattività.
//
//   npm run loadtest -- 80              (veloce, pura verifica di carico)
//   npm run loadtest -- 30 5           (30 utenti, 5s per fase → DEMO guardabile)
//   URL=https://libro.tuodominio.it DIRECTOR_TOKEN=xxx npm run loadtest -- 120
//
// 2° argomento = secondi per fase (lettura capitolo + finestra di voto). 0 = full speed.
// Con ritmo > 0 i voti arrivano scaglionati → sul Main Screen vedi le particelle
// migrare a poco a poco. Apri http://localhost:3000/?role=main per guardare.
//
// NB: c'è UNA sola sessione per processo server → il test la resetta e la guida.
//     Non lanciarlo contro un evento in corso.
// ==========================================================================
import { io } from "socket.io-client";

const N = parseInt(process.argv[2] || "50", 10);
const URL = process.env.URL || "http://localhost:3000";
const TOKEN = process.env.DIRECTOR_TOKEN || "";
const BIAS = 0.6;                     // prob. di votare "facile" (crea divergenza)
const PACE = parseFloat(process.argv[3] || process.env.PACE || "0");   // secondi per fase
const READ_MS = Number(process.env.READ_MS ?? PACE * 1000);  // sosta sul capitolo prima del voto
const VOTE_MS = Number(process.env.VOTE_MS ?? PACE * 1000);  // durata finestra di voto

const opt = { transports: ["websocket"], reconnection: false, forceNew: true };
const now = () => performance.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const waitUntil = (cond, timeout = 4000) => new Promise((res) => {
  const t0 = now();
  (function chk() { (cond() || now() - t0 > timeout) ? res() : setTimeout(chk, 40); })();
});
const connect = (s) => new Promise((res, rej) => { s.once("connect", res); s.once("connect_error", rej); });

// ---- regia ---------------------------------------------------------------
const director = io(URL, { ...opt, query: { role: "director", k: TOKEN } });
let dsync = null;
director.on("director:sync", (s) => { dsync = s; });
function waitSync(pred, timeout = 8000) {
  return new Promise((res, rej) => {
    if (dsync && pred(dsync)) return res(dsync);
    const t = setTimeout(() => { director.off("director:sync", h); rej(new Error("timeout regia")); }, timeout);
    function h(s) { if (pred(s)) { director.off("director:sync", h); clearTimeout(t); res(s); } }
    director.on("director:sync", h);
  });
}

console.log(`\nLoad test → ${URL} · ${N} partecipanti · ritmo ${PACE}s/fase`);
if (PACE > 0) console.log(`(demo guardabile — apri ${URL}/?role=main per vedere lo schermo)`);
console.log();
try { await connect(director); } catch {
  console.error("✗ Regia rifiutata. Se il server ha DIRECTOR_TOKEN, passalo: DIRECTOR_TOKEN=... npm run loadtest -- " + N);
  process.exit(1);
}
await waitSync(() => !!dsync);
if (dsync.phase !== "lobby") { director.emit("director:reset"); await waitSync((s) => s.phase === "lobby"); }

// ---- partecipanti --------------------------------------------------------
let roundVotes = 0;
const devs = Array.from({ length: N }, () => ({ s: io(URL, { ...opt, query: { role: "device" } }), voted: false }));
devs.forEach((d) => {
  d.s.on("device:sync", (v) => {
    if (v.phase === "voting" && v.options && !d.voted) {
      d.voted = true;
      const tag = Math.random() < BIAS ? "facile" : "difficile";
      // con ritmo>0 i voti si spalmano sulla finestra → particelle che migrano a poco a poco
      const delay = VOTE_MS > 0 ? Math.random() * VOTE_MS * 0.7 : 0;
      setTimeout(() => d.s.emit("device:vote", { option: tag }, () => { roundVotes++; }), delay);
    }
  });
});

const tConn0 = now();
const conn = await Promise.allSettled(devs.map((d) => connect(d.s)));
const connected = conn.filter((r) => r.status === "fulfilled").length;
console.log(`connessi: ${connected}/${N}  in ${(now() - tConn0) | 0}ms`);

let joined = 0;
await Promise.all(devs.map((d) => new Promise((res) => {
  if (!d.s.connected) return res();
  d.s.emit("device:join", { cid: null }, () => { joined++; res(); });
})));
console.log(`join ok: ${joined}/${connected}\n`);

// ---- flusso completo -----------------------------------------------------
const t0 = now();
director.emit("director:start");
await waitSync((s) => s.phase === "narrating");
const rounds = dsync.bivi;
let ended = false;

for (let r = 0; r < rounds && !ended; r++) {
  roundVotes = 0;
  devs.forEach((d) => (d.voted = false));

  await sleep(READ_MS);                 // sosta sul capitolo (leggibile a schermo)

  let p = waitSync((s) => s.phase === "voting");
  director.emit("director:openVote");
  await p;

  const tv = now();
  await waitUntil(() => roundVotes >= connected, VOTE_MS + 3500);
  if (now() - tv < VOTE_MS) await sleep(VOTE_MS - (now() - tv)); // tieni aperta la finestra
  const voteMs = (now() - tv) | 0;

  const idx = dsync.index;
  p = waitSync((s) => s.phase === "ended" || s.index > idx);
  director.emit("director:closeVote");
  const s = await p;
  ended = s.phase === "ended";

  console.log(`bivio ${String(r + 1).padStart(2)}/${rounds} · voti ${String(roundVotes).padStart(3)}/${connected} in ${String(voteMs).padStart(4)}ms · delega sala ${s.delega}`);
}

// ---- esito ---------------------------------------------------------------
const fin = ended ? dsync : await waitSync((s) => s.phase === "ended", 4000).catch(() => dsync);
console.log(`\n── esito ──`);
console.log(`durata partita:   ${((now() - t0) / 1000).toFixed(1)}s`);
console.log(`attrattore sala:  ${fin.attractor.name} (delega ${fin.delega})`);
console.log(`connessi al voto: ${fin.connected}`);
if (fin.consensus) console.log(`consenso:         ${fin.consensus.same} in linea · ${fin.consensus.diverge} divergenti`);
console.log(`intrecci scattati: ${fin.fired.map((f) => f.txt.split(" — ")[0]).join(" | ") || "nessuno"}`);

const ok = connected === N && joined === connected && fin.phase === "ended";
console.log(ok ? "\n✓ OK — tutte le connessioni hanno retto il flusso completo.\n"
              : "\n✗ Qualche connessione o fase non è andata a buon fine.\n");

devs.forEach((d) => d.s.close());
director.close();
process.exit(ok ? 0 : 1);
