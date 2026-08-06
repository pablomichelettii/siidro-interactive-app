// ==========================================================================
// PROVA EPILOGHI — genera profili sintetici e li stampa da rileggere.
// È il requisito del §8.4: «generare qualche centinaio di profili sintetici
// coprendo le combinazioni estreme, e rileggerli. È l'unico modo di sapere
// cosa produce il modello quando la sala ha fatto un disastro».
//
//   npm run epiloghi              8 profili (uno per combinazione) — verifica la chiave
//   npm run epiloghi -- 40        40 profili, combinazioni ripetute
//   npm run epiloghi -- 200 json  anche in JSON, per analizzarli altrove
//   npm run epiloghi -- 1 prompt  stampa il prompt esatto, senza chiamare nulla
//
// SALVA SEMPRE UN FILE in data/prove-epiloghi/ e ne stampa il percorso:
// duecento epiloghi non si leggono a terminale, e redirigere con `>` non
// funziona — ci finirebbe dentro anche l'intestazione di npm.
//
// Senza OPENROUTER_API_KEY genera i fallback: utile per rileggere quelli, non
// per giudicare il modello.
// ==========================================================================

import { mkdir, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VOTABILI } from "../server/engine.js";
import { Session } from "../server/session.js";
import { generaUno, payload, scelteChiave, SYSTEM, MODEL_DEFAULT } from "../server/epilogo.js";

const RADICE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARTELLA = path.join(RADICE, "data", "prove-epiloghi");
const STAMPO = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");

const N = parseInt(process.argv[2] || "8", 10);
const FORMATO = (process.argv[3] || "testo").toLowerCase();

// Le combinazioni estreme: le sale che rompono le cose, non quelle di mezzo.
const SALE = [
  { nome: "cede sempre",        voto: () => "facile" },
  { nome: "regge sempre",       voto: () => "difficile" },
  { nome: "si pente a metà",    voto: (n) => n <= 6 ? "facile" : "difficile" },
  { nome: "si stanca a metà",   voto: (n) => n <= 6 ? "difficile" : "facile" },
  { nome: "divisa",             voto: (n) => n % 2 ? "facile" : "difficile" }
];
const STUDENTI = [
  { nome: "sempre in maggioranza", segue: true,  salta: 0 },
  { nome: "sempre in minoranza",   segue: false, salta: 0 },
  { nome: "entrato al capitolo 6", segue: false, salta: 5 },
  { nome: "non ha mai votato",     segue: null,  salta: 12 }
];
const ETA = ["32 anni, 6 mesi, 1 giorno", "31 anni, 11 mesi, 29 giorni", "32 anni, 7 mesi, 22 giorni"];

// Il profilo lo produce una Session vera, non una copia della sua logica:
// la prima versione se lo costruiva a mano ed è andata alla deriva appena ho
// arricchito le scelte — il prompt è uscito pieno di `undefined`. Un solo
// percorso di codice, così non può succedere di nuovo.
const ioFinto = { to: () => ({ emit: () => {} }) };
const socketFinto = (id) => ({ id, data: {}, join() {} });

function profilo(sala, studente, eta) {
  const s = new Session(ioFinto);
  const soggetto = s.addParticipant(null, socketFinto("x"), { nome: "Prova", data_nascita: "2008-04-20" });
  const gregge = [1, 2].map(i => s.addParticipant(null, socketFinto("g" + i)));
  s.start();
  for (const c of VOTABILI) {
    s.openVote();
    const maggioranza = sala.voto(c.n);
    gregge.forEach(g => s.vote(g, maggioranza));                     // la sala decide
    const salta = c.n <= studente.salta || studente.segue === null;
    if (!salta) s.vote(soggetto, studente.segue                      // lo studente segue o va contro
      ? maggioranza
      : (maggioranza === "facile" ? "difficile" : "facile"));
    s.closeVote();
    s.skip();
  }
  return { ...s.personalView(soggetto), eta, _sala: sala.nome, _studente: studente.nome };
}

// Quello che si può controllare da solo. Il resto — tono, immagini, se chiude
// davvero su un elemento di agentività — lo si legge.
const VIETATE = /\b(mor(irai|te|to|ta)|malatt|tumor|cancro|diagnos|terapi|psichiatr|depress|funeral|lutto|vedov|ospedale)\w*/i;
// Le parole che il prompt vieta esplicitamente. NON si controllano i numeri:
// l'apertura obbligatoria contiene 2040 e l'età, quindi «niente numeri» non è
// letteralmente verificabile — vale come indicazione di stile, non come regola.
const GERGO = /\bintrecc\w*|\bcapitol\w*|\bvot(o|i|ato|ata)\b|\bpositiv\w*|\bnegativ\w*|\b(I[1-6])\b|TERZA_VIA/i;
const MIN_PAROLE = 180, MAX_PAROLE = 220;
function controlla(testo) {
  const problemi = [];
  const parole = testo.trim().split(/\s+/).length;
  if (parole > MAX_PAROLE) problemi.push(`${parole} parole (max ${MAX_PAROLE})`);
  if (parole < MIN_PAROLE) problemi.push(`${parole} parole (min ${MIN_PAROLE})`);
  if (!/\{NOME\}/.test(testo) || !/\{ETA\}/.test(testo)) problemi.push("segnaposto {NOME}/{ETA} non usati");
  if (!/^\{NOME\}, nel 2040 avrai \{ETA\}\./.test(testo.trim())) problemi.push("apertura non conforme");
  const v = testo.match(VIETATE);
  if (v) problemi.push(`parola vietata: "${v[0]}"`);
  const g = testo.match(GERGO);
  if (g) problemi.push(`gergo dello spettacolo: "${g[0]}"`);
  if (/\bdovresti\b|\bavresti dovuto\b|\bè colpa\b|\bte l'avevo detto\b/i.test(testo)) problemi.push("tono giudicante");
  return { parole, problemi };
}

// Sintesi delle scelte, per verificare che l'epilogo parli davvero di quelle.
// `chiave` è la rosa che il modello ha ricevuto con l'ordine di costruirci
// sopra la scena: se il testo non tocca nessuna di quelle, non ha obbedito.
const FRECCIA = { facile: "↘", difficile: "↗" };
function sintesiScelte(p) {
  return {
    tu: p.scelte.map(s => FRECCIA[s.voto] || "·").join(""),
    sala_frecce: p.scelte.map(s => FRECCIA[s.vinse] || "·").join(""),   // `sala` è già il nome della sala
    minoranza: `${p.voti_in_minoranza}/${p.voti_espressi}`,
    chiave: scelteChiave(p).map(s =>
      `${FRECCIA[s.voto]} ${s.titolo}${s.minoranza ? " [perso]" : ""} — ${s.scelta}`)
  };
}

// ---- esecuzione ----------------------------------------------------------
const combinazioni = [];
for (const s of SALE) for (const st of STUDENTI) combinazioni.push([s, st]);
const lavoro = Array.from({ length: N }, (_, i) => {
  const [sala, studente] = combinazioni[i % combinazioni.length];
  return profilo(sala, studente, ETA[i % ETA.length]);
});

const MODELLO = process.env.OPENROUTER_API_KEY
  ? (process.env.OPENROUTER_MODEL || MODEL_DEFAULT + " (default)")
  : "NESSUNA CHIAVE → tutti fallback";
console.log(`\nGenero ${N} epiloghi sintetici · ${MODELLO}\n`);

// Cosa vede davvero il modello: serve per tarare il prompt senza spendere.
if (FORMATO === "prompt") {
  console.log("═══ SYSTEM ═══\n" + SYSTEM);
  for (const p of lavoro) {
    console.log(`\n═══ USER · sala «${p._sala}» · studente «${p._studente}» ═══`);
    console.log(payload(p));
  }
  process.exit(0);
}

// Il file si apre PRIMA e cresce man mano: duecento epiloghi sono minuti di
// attesa, e se lo interrompi a metà devi tenerti quelli già usciti.
await mkdir(CARTELLA, { recursive: true });
const fTesto = path.join(CARTELLA, `${STAMPO}-${N}.txt`);
await writeFile(fTesto, [
  `PROVA EPILOGHI · ${new Date().toLocaleString("it-IT")}`,
  `${N} epiloghi richiesti · ${MODELLO}`,
  "",
  "Da rileggere a mano: il tono, le immagini, e se l'epilogo chiude davvero su",
  "un elemento di agentività. Quelli i controlli automatici non li vedono.",
  ""
].join("\n"), "utf8");
console.log(`Scrivo in ${path.relative(RADICE, fTesto)} — puoi già aprirlo, cresce da solo.\n`);

const blocco = (r, i) => [
  "─".repeat(78),
  `#${i} · sala «${r.sala}» · studente «${r.studente}» · banda ${r.banda}`,
  `${r.climax}`,
  `${r.fonte}${r.motivo ? ` (${r.motivo})` : ""} · ${r.parole} parole`
    + (r.problemi.length ? `\n⚠ ${r.problemi.join(" · ")}` : ""),
  `   tu ${r.tu}`,
  ` sala ${r.sala_frecce}   in minoranza ${r.minoranza}`,
  "  da cui il modello doveva pescare due scene:",
  ...r.chiave.map(k => `   · ${k}`),
  "",
  r.testo,
  ""
].join("\n");

const risultati = [];
let daModello = 0, conProblemi = 0;
for (const p of lavoro) {
  const r = await generaUno(p);
  const c = controlla(r.testo);
  if (r.fonte === "modello") daModello++;
  if (c.problemi.length) conProblemi++;
  const voce = { ...r, ...c, sala: p._sala, studente: p._studente, banda: p.banda_sala, climax: p.climax.nome,
                 ...sintesiScelte(p) };
  risultati.push(voce);
  await appendFile(fTesto, blocco(voce, risultati.length) + "\n", "utf8");   // subito a disco

  // a terminale solo l'avanzamento quando sono tanti: 200 epiloghi non si
  // leggono scorrendo all'indietro, si leggono nel file
  if (N > 12) { process.stdout.write(`\r  ${risultati.length}/${N}…`); continue; }
  console.log(blocco(voce, risultati.length));
}
if (N > 12) console.log();

// ---- chiusura ------------------------------------------------------------
// Il riepilogo va in coda, non in testa: i conteggi si sanno solo adesso.
const scritti = [fTesto];
await appendFile(fTesto, [
  "═".repeat(78),
  `${risultati.length} epiloghi · ${daModello} dal modello · ${risultati.length - daModello} fallback`,
  `controlli automatici: ${conProblemi ? conProblemi + " con problemi" : "tutti puliti"}`,
  ""
].join("\n"), "utf8");

if (FORMATO === "json") {
  const fJson = path.join(CARTELLA, `${STAMPO}-${risultati.length}.json`);
  await writeFile(fJson, JSON.stringify(risultati, null, 2), "utf8");
  scritti.push(fJson);
}

console.log("═".repeat(78));
console.log(`${risultati.length} epiloghi · ${daModello} dal modello · ${risultati.length - daModello} fallback`);
console.log(`controlli automatici: ${conProblemi ? `${conProblemi} con problemi` : "tutti puliti"}`);
if (!daModello && !process.env.OPENROUTER_API_KEY)
  console.log(`\nPer provare il modello vero: metti OPENROUTER_API_KEY in .env`);
console.log(`\nSalvati in:`);
for (const f of scritti) console.log(`  ${path.relative(RADICE, f)}`);
console.log(`\nI controlli automatici non giudicano il tono, le immagini, né se l'epilogo`);
console.log(`chiude davvero su un elemento di agentività. Quelli vanno letti.\n`);
