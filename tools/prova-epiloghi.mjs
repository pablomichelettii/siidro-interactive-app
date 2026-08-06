// ==========================================================================
// PROVA EPILOGHI — genera profili sintetici e li stampa da rileggere.
// È il requisito del §8.4: «generare qualche centinaio di profili sintetici
// coprendo le combinazioni estreme, e rileggerli. È l'unico modo di sapere
// cosa produce il modello quando la sala ha fatto un disastro».
//
//   npm run epiloghi              1 profilo per combinazione (8) — verifica la chiave
//   npm run epiloghi -- 40        40 profili, combinazioni ripetute
//   npm run epiloghi -- 200 json  in JSON, per rileggerli con calma altrove
//
// Senza OPENROUTER_API_KEY genera i fallback: utile per rileggere quelli, non
// per giudicare il modello.
// ==========================================================================

import { VOTABILI, derive, esitiVisibili, banda } from "../server/engine.js";
import { generaUno } from "../server/epilogo.js";

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

function profilo(sala, studente, eta) {
  const history = VOTABILI.map(c => {
    const f = sala.voto(c.n) === "facile" ? 74 : 16;
    return { n: c.n, facile: f, difficile: 90 - f, winner: f > 45 ? "facile" : "difficile" };
  });
  const w = derive(history);
  const scelte = [], contro = [];
  let facili = 0;
  for (const h of history) {
    const salta = h.n <= studente.salta;
    const voto = salta || studente.segue === null ? null
      : studente.segue ? h.winner : (h.winner === "facile" ? "difficile" : "facile");
    scelte.push({ capitolo: h.n, voto });
    if (voto === "facile") facili++;
    if (voto && voto !== h.winner) contro.push(h.n);
  }
  const espressi = scelte.filter(s => s.voto).length;
  return {
    _sala: sala.nome, _studente: studente.nome,
    eta,
    scelte,
    voti_espressi: espressi,
    voti_in_minoranza: contro.length,
    indice_personale: espressi ? Math.round(facili / espressi * 100) : null,
    banda_sala: w.banda,
    climax: w.climax,
    esiti: esitiVisibili(w.intrecci, 14)
  };
}

// Quello che si può controllare da solo. Il resto — tono, immagini, se chiude
// davvero su un elemento di agentività — lo si legge.
const VIETATE = /\b(mor(irai|te|to|ta)|malatt|tumor|cancro|diagnos|terapi|psichiatr|depress|funeral|lutto|vedov|ospedale)\w*/i;
function controlla(testo) {
  const problemi = [];
  const parole = testo.trim().split(/\s+/).length;
  if (parole > 200) problemi.push(`${parole} parole (max 200)`);
  if (/\{NOME\}|\{ETA\}/.test(testo) === false) problemi.push("segnaposto {NOME}/{ETA} non usati");
  const v = testo.match(VIETATE);
  if (v) problemi.push(`parola vietata: "${v[0]}"`);
  if (/\b(I[1-6])\b|NEGATIVO|POSITIVO|TERZA_VIA/.test(testo)) problemi.push("nomina gli intrecci o i loro stati");
  if (/\bdovresti\b|\bavresti dovuto\b|\bè colpa\b/i.test(testo)) problemi.push("tono giudicante");
  return { parole, problemi };
}

// ---- esecuzione ----------------------------------------------------------
const combinazioni = [];
for (const s of SALE) for (const st of STUDENTI) combinazioni.push([s, st]);
const lavoro = Array.from({ length: N }, (_, i) => {
  const [sala, studente] = combinazioni[i % combinazioni.length];
  return profilo(sala, studente, ETA[i % ETA.length]);
});

if (FORMATO !== "json") {
  console.log(`\nGenero ${N} epiloghi sintetici · ${process.env.OPENROUTER_API_KEY
    ? `modello ${process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5"}` : "NESSUNA CHIAVE → tutti fallback"}\n`);
}

const risultati = [];
let daModello = 0, conProblemi = 0;
for (const p of lavoro) {
  const r = await generaUno(p);
  const c = controlla(r.testo);
  if (r.fonte === "modello") daModello++;
  if (c.problemi.length) conProblemi++;
  risultati.push({ ...r, ...c, sala: p._sala, studente: p._studente, banda: p.banda_sala, climax: p.climax.nome });

  if (FORMATO === "json") continue;
  console.log("─".repeat(78));
  console.log(`sala «${p._sala}» · studente «${p._studente}» · banda ${p.banda_sala} · ${p.climax.nome}`);
  console.log(`${r.fonte}${r.motivo ? ` (${r.motivo})` : ""} · ${c.parole} parole`
    + (c.problemi.length ? `\n⚠ ${c.problemi.join(" · ")}` : ""));
  console.log();
  console.log(r.testo.replace(/^/gm, "  "));
  console.log();
}

if (FORMATO === "json") { console.log(JSON.stringify(risultati, null, 2)); process.exit(0); }

console.log("═".repeat(78));
console.log(`${risultati.length} epiloghi · ${daModello} dal modello · ${risultati.length - daModello} fallback`);
console.log(`controlli automatici: ${conProblemi ? `${conProblemi} con problemi` : "tutti puliti"}`);
if (!daModello && !process.env.OPENROUTER_API_KEY)
  console.log(`\nPer provare il modello vero:\n  OPENROUTER_API_KEY=sk-or-... npm run epiloghi -- ${N}`);
console.log(`\nI controlli automatici non giudicano il tono, le immagini, né se l'epilogo`);
console.log(`chiude davvero su un elemento di agentività. Quelli vanno letti.\n`);
