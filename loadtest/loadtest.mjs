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
// COME VOTA LA SALA FINTA.
// Con una probabilità fissa per client (era 0.6) la legge dei grandi numeri
// schiaccia tutto: a 90 votanti un capitolo gira su "difficile" nel 2% dei
// casi, quindi la serata finiva SEMPRE con gli stessi sei esiti negativi e il
// test non ha mai messo piede sui rami positivi o sulle terze vie.
// Ora l'umore della sala si estrae UNA VOLTA PER CAPITOLO: le maggioranze
// girano davvero e ogni run produce un mondo diverso.
// Con SCENARIO si forza la serata: 12 lettere f/d, una per capitolo.
//   SCENARIO=ffffffffffff  → tutto comodo      SCENARIO=dddddddddddd → tutto difficile
//   SCENARIO=fdfdfdfdfdfd  → sala alternata    SCENARIO=ffffffdddddd → si pente a metà
const SCENARIO = (process.env.SCENARIO || "").toLowerCase();
if (SCENARIO && !/^[fd]{12}$/.test(SCENARIO)) {
  console.error(`✗ SCENARIO deve essere 12 lettere f/d (ricevuto: "${SCENARIO}")`);
  process.exit(1);
}
const CONCORDI = 0.85;                // quota che segue lo scenario forzato
// Due livelli, non uno. Con il solo umore per capitolo i valori si mediano
// sui dodici bivi e l'Indice finisce sempre vicino al 50%: gli intrecci
// variavano ma il climax usciva quasi sempre uguale. La disposizione si
// estrae una volta per RUN, l'umore oscilla attorno a quella.
const DISPOSIZIONE = 0.28 + Math.random() * 0.44;   // sala timida ↔ sala coraggiosa
const clamp01 = (v) => Math.max(0.05, Math.min(0.95, v));
const umoreCapitolo = (n) => SCENARIO
  ? (SCENARIO[n - 1] === "f" ? CONCORDI : 1 - CONCORDI)
  : clamp01(DISPOSIZIONE + (Math.random() - 0.5) * 0.7);
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
// `atteso` non è decorazione: senza, un timeout dice solo "regia" e si finisce
// a cercare il token mentre il problema è un'altra cosa.
function waitSync(pred, atteso, timeout = 8000) {
  return new Promise((res, rej) => {
    if (dsync && pred(dsync)) return res(dsync);
    const t = setTimeout(() => {
      director.off("director:sync", h);
      rej(new Error(`timeout: aspettavo ${atteso}, il server è fermo su phase="${dsync && dsync.phase}"`
        + ` (capitolo ${dsync && dsync.chapter ? dsync.chapter.n : "—"})`));
    }, timeout);
    function h(s) { if (pred(s)) { director.off("director:sync", h); clearTimeout(t); res(s); } }
    director.on("director:sync", h);
  });
}

console.log(`\nLoad test → ${URL} · ${N} partecipanti · ritmo ${PACE}s/fase`);
if (PACE > 0) console.log(`(demo guardabile — apri ${URL}/?role=main per vedere lo schermo)`);
console.log();
// Il server rifiuta la regia con "unauthorized"; qualunque altro connect_error
// è il server che non risponde. Distinguerli, o si perde tempo sul token
// sbagliato quando in realtà non è partito niente.
try { await connect(director); } catch (e) {
  if (String(e && e.message) === "unauthorized")
    console.error(`✗ Regia rifiutata: token errato o mancante.\n  DIRECTOR_TOKEN=... npm run loadtest -- ${N}`);
  else
    console.error(`✗ Nessuna risposta da ${URL} (${e && e.message}).\n  Il server è avviato? In un altro terminale: npm start\n  Se è su un'altra porta o macchina: URL=http://host:porta npm run loadtest -- ${N}`);
  process.exit(1);
}
await waitSync(() => !!dsync, "il primo stato dalla regia");

// Node non ricarica i moduli: un server lasciato acceso da ieri risponde
// benissimo e parla un protocollo vecchio. Meglio accorgersene qui che dopo
// dieci minuti di timeout su una fase che quel server non conosce.
const RICHIESTI = ["bivi", "climax", "esitiTutti", "reveal", "voteRestaMs", "puoRiaprire", "scenario"];
const mancanti = RICHIESTI.filter((k) => dsync[k] === undefined);
if (mancanti.length) {
  console.error(`✗ Il server risponde ma parla un protocollo diverso: mancano ${mancanti.join(", ")}.`);
  console.error(`  È rimasto su una versione vecchia del codice. Riavvialo:`);
  console.error(`    locale → ferma npm start e rilancialo · deploy → pm2 restart next5000days\n`);
  process.exit(1);
}

if (dsync.phase !== "lobby") { director.emit("director:reset"); await waitSync((s) => s.phase === "lobby", "il reset in lobby"); }

// ---- partecipanti --------------------------------------------------------
let roundVotes = 0;
let umore = 0.5;                      // ridefinito a ogni capitolo, prima di aprire il voto
const devs = Array.from({ length: N }, () => ({ s: io(URL, { ...opt, query: { role: "device" } }), voted: false }));
devs.forEach((d) => {
  d.s.on("device:sync", (v) => {
    if (v.phase === "voting" && v.options && !d.voted) {
      d.voted = true;
      const tag = Math.random() < umore ? "facile" : "difficile";
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
await Promise.all(devs.map((d, i) => new Promise((res) => {
  if (!d.s.connected) return res();
  // accoglienza come in sala: nome e data di nascita di studenti plausibili
  const nascita = `${2006 + (i % 3)}-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`;
  d.s.emit("device:join", { cid: null, nome: `Studente ${i + 1}`, data_nascita: nascita }, (r) => {
    d.cid = r && r.cid; joined++; res();
  });
})));
console.log(`join ok: ${joined}/${connected}\n`);

// ---- flusso completo -----------------------------------------------------
const t0 = now();
director.emit("director:start");
await waitSync((s) => s.phase === "narrating", "l'inizio della serata");
const rounds = dsync.bivi;
let ended = false;

console.log(SCENARIO
  ? `scenario forzato: ${SCENARIO}\n`
  : `sala estratta a caso: disposizione ${(DISPOSIZIONE * 100) | 0}% verso la strada comoda\n`);

for (let r = 0; r < rounds && !ended; r++) {
  roundVotes = 0;
  devs.forEach((d) => (d.voted = false));
  umore = umoreCapitolo(r + 1);         // PRIMA di aprire: i device leggono questo

  await sleep(READ_MS);                 // sosta sul capitolo (leggibile a schermo)

  let p = waitSync((s) => s.phase === "voting", `l'apertura del voto al capitolo ${r + 1}`);
  director.emit("director:openVote");
  await p;

  const tv = now();
  await waitUntil(() => roundVotes >= connected, VOTE_MS + 3500);
  if (now() - tv < VOTE_MS) await sleep(VOTE_MS - (now() - tv)); // tieni aperta la finestra
  const voteMs = (now() - tv) | 0;

  // chiudere il voto NON avanza: il capitolo resta a schermo e mostra l'esito
  const idx = dsync.index;
  p = waitSync((s) => s.phase === "revealing", `la rivelazione del capitolo ${r + 1}`);
  director.emit("director:closeVote");
  const s = await p;
  const esito = s.reveal && s.reveal.esito;

  await sleep(READ_MS);                 // il narratore annuncia l'esito
  p = waitSync((x) => x.phase === "ended" || x.index > idx, `il passaggio oltre il capitolo ${r + 1}`);
  director.emit("director:skip");
  ended = (await p).phase === "ended";

  console.log(`bivio ${String(r + 1).padStart(2)}/${rounds} · voti ${String(roundVotes).padStart(3)}/${connected} in ${String(voteMs).padStart(4)}ms`
    + ` · ha vinto ${s.reveal.winner.padEnd(9)} (${s.reveal.facile}-${s.reveal.difficile})`
    + ` · indice ${String(s.indice).padStart(3)}%`
    + (esito ? ` · ↯ ${esito.id} ${esito.nome}` : ""));
}

// dopo i 12 bivi restano il climax (13) e la chiusura (14): non si votano,
// li avanza il regista
while (!ended) {
  await sleep(READ_MS);
  const idx = dsync.index;
  const p = waitSync((s) => s.phase === "ended" || s.index > idx, `il passaggio oltre il capitolo ${idx + 1}`);
  director.emit("director:skip");
  const s = await p;
  ended = s.phase === "ended";
  console.log(`capitolo ${idx + 1} narrato (nessun voto)`);
}

// ---- epiloghi: la generazione parte alla chiusura del 12 -----------------
let epiloghiVisti = 0;
devs.forEach((d) => d.s.on("device:sync", (v) => { if (v.ended && v.ended.epilogo) epiloghiVisti++; }));

const gen = await waitSync((s) => s.generazione && s.generazione.finita, "la generazione degli epiloghi", 180000)
  .catch(() => null);
if (gen) {
  console.log(`\nepiloghi pronti: ${gen.generazione.fatti}/${gen.generazione.totale}`
    + (gen.generazione.modello ? " (dal modello)" : " (fallback: nessuna chiave)"));
  const t = now();
  director.emit("director:rivelaEpiloghi");
  await waitUntil(() => epiloghiVisti >= connected, 8000);
  console.log(`rivela_epiloghi: ${epiloghiVisti}/${connected} schermi accesi in ${(now() - t) | 0}ms`);
}

// ---- esito ---------------------------------------------------------------
const fin = ended ? dsync : await waitSync((s) => s.phase === "ended", "la fine della serata", 4000).catch(() => dsync);
console.log(`\n── esito ──`);
console.log(`durata partita:   ${((now() - t0) / 1000).toFixed(1)}s`);
console.log(`indice di delega: ${fin.indice}% (banda ${fin.banda})`);
console.log(`climax:           ${fin.climax.nome}`);
console.log(`connessi al voto: ${fin.connected}`);
if (fin.consensus) console.log(`consenso:         ${fin.consensus.same} in linea · ${fin.consensus.diverge} divergenti`);
console.log(`intrecci risolti: ${fin.esiti.map((e) => `${e.id} ${e.nome}`).join(" | ") || "nessuno"}`);

const ok = connected === N && joined === connected && fin.phase === "ended";
console.log(ok ? "\n✓ OK — tutte le connessioni hanno retto il flusso completo.\n"
              : "\n✗ Qualche connessione o fase non è andata a buon fine.\n");

devs.forEach((d) => d.s.close());
director.close();
process.exit(ok ? 0 : 1);
