// ==========================================================================
// EPILOGO INDIVIDUALE (Patch §8) — la "giornata tipo nel 2040" di ogni studente.
//
// Il nome NON entra mai nella chiamata: il modello scrive `{NOME}` e `{ETA}`,
// che si interpolano lato client. Meno token, e il payload resta senza dati
// personali anche se qualcuno guarda i log del provider.
//
// Se manca la chiave, o la chiamata va in errore o in timeout, si consegna il
// fallback pre-scritto. Nessuno resta a mani vuote: è l'ultimo momento della
// serata (Patch §8.4).
// ==========================================================================

import { randomBytes } from "node:crypto";
import { mkdir, writeFile, readFile, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FALLBACK } from "./engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// letto a ogni chiamata, non all'import: così un test può puntarlo altrove
export const dataDir = () => process.env.EPILOGHI_DIR || path.join(__dirname, "..", "data", "epiloghi");

// OpenRouter, API OpenAI-compatibile. Niente SDK: una POST con fetch.
const BASE = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const KEY = process.env.OPENROUTER_API_KEY || "";
// Il default è deliberatamente il modello ECONOMICO: chi gira senza .env non
// deve ritrovarsi novanta chiamate a un modello di fascia alta senza saperlo.
// Il modello buono si sceglie apposta, in .env. Mai il contrario.
export const MODEL_DEFAULT = "deepseek/deepseek-v4-flash-0731";
const MODEL = process.env.OPENROUTER_MODEL || MODEL_DEFAULT;
const TIMEOUT_MS = Number(process.env.EPILOGO_TIMEOUT_MS || 60000);
// Il budget copre ragionamento + testo, non solo il testo. Misurato su
// gpt-5.6-luna: 400-550 token di ragionamento PRIMA di scrivere una parola, e
// con 600 l'epilogo usciva troncato a metà frase o non usciva affatto; a 2000
// ne veniva tagliato ancora uno su quattro.
// È un TETTO, non una prenotazione: si paga quello che si consuma davvero,
// quindi tenerlo largo non costa niente e toglie di mezzo le troncature.
const MAX_TOKENS = Number(process.env.EPILOGO_MAX_TOKENS || 4000);
const RETENTION_GIORNI = Number(process.env.EPILOGHI_RETENTION_GIORNI || 30);
// ponytail: sei alla volta invece delle 90 parallele della patch. I 9 minuti
// del capitolo 13 ne bastano e avanzano, e non si rischia un 429 che
// manderebbe tutti al fallback insieme. Alzare se in prova risulta lento.
const PARALLELE = Number(process.env.EPILOGO_PARALLELE || 6);

export const modelloConfigurato = () => !!KEY;

// --------------------------------------------------------------------------
// I vincoli stanno nel system prompt, non nel messaggio utente: così non sono
// aggirabili da quello che arriva nei dati (Patch §8.4).
// --------------------------------------------------------------------------
export const SYSTEM = `Scrivi l'epilogo personale di uno studente alla fine di uno spettacolo teatrale sul futuro.

IL CONTESTO
Nel 2040 ogni studente vive nel mondo costruito dai voti della sala, ma con la forma esatta data dalle sue decisioni personali. L'epilogo è una micro-scena intima della sua giornata tipo.

REGOLE DI SCRITTURA
- Registro: Intimo, retrospettivo, concreto, in seconda persona singolare ("tu").
- Lunghezza: Tra le 180 e le 220 parole.
- Apertura tassativa: "{NOME}, nel 2040 avrai {ETA}." (lascia i segnaposto letterali). Prosegui subito calando l'azione in un momento preciso della giornata (es. "Sono le otto di sera e...", "Ti svegli con...").

COME TRASFORMARE LE SCELTE IN VITA REALE (Il cuore del testo)
Non riassumere il mondo. Scegli ESATTAMENTE DUE decisioni dello studente e incrociale in una singola scena concreta.
1. INCARTA IL COSTO IN UN OGGETTO O IN UN GESTO:
   - Se ha scelto la comodità o l'AI, non dire "l'algoritmo ti controlla". Mostra la mancanza di attrito: l'assenza di qualcuno con cui litigare, una parete vuota, un silenzio troppo perfetto, una risposta automatica che non ti contraddice mai.
   - Se ha scelto di filtrare la realtà, mostra l'effetto visivo/fisico (es. camminare per strada senza incrociare lo sguardo di chi ti passa accanto).
2. SE È STATO IN MINORANZA: Quella scelta è una ferita o un'isola. Mostra il contrasto tra ciò in cui credeva e il mondo che la maggioranza gli ha costruito intorno.
3. NON USARE MAI le parole "intreccio", "capitolo", "positivo", "negativo", "voto", né percentuali o conteggi. (L'anno 2040 e l'età nell'apertura sono ovviamente ammessi.)

STRUTTURA DELL'EPILOGO (3 ATTI)
- ATTO 1 (I primi 30 secondi della scena): Dove si trova, che ora è, la sensazione fisica della stanza o del luogo.
- ATTO 2 (Il costo delle scelte): L'azione principale della giornata in cui si scontrano le 2 scelte selezionate. Il lettore deve pensare: «Questo accade esattamente per via di quello che ho votato».
- ATTO 3 (L'agentività - Ultima frase): Il mondo è andato così, ma c'è un dettaglio piccolo e ostinato che stasera dipende ancora e soltanto da lui/lei. Una decisione da prendere prima di dormire.

VINCOLI ASSOLUTI
- Nessuna previsione su morte, malattie o salute (sua o dei cari).
- Nessun contenuto medico, psichiatrico, romantico o sessuale.
- Nessun giudizio morale o tono da "te l'avevo detto": sii un testimone neutro ed empatico.
- Rispondi SOLO con il testo dell'epilogo. Nessun titolo, nessuna premessa.`;

// La rosa da cui il modello deve pescare le due scene: prima le minoranze,
// che sono il materiale più carico. Solo capitoli VOTATI — un non votato non
// ha né scelta né costo, e in cima alla rosa uscirebbe "Costo: null" (succede
// a chi entra a metà serata, cioè proprio uno dei casi di collaudo).
// Cappata a quattro: se uno è in minoranza tutte e dodici le volte, elencarle
// tutte non mette in evidenza niente — la rosa smette di essere una rosa.
// Esportata perché la usa anche il tool di prova: una definizione sola, o
// torna a divergere come è già successo.
export function scelteChiave(p) {
  const votate = p.scelte.filter(s => s.voto);
  const minoranze = votate.filter(s => s.minoranza);
  return (minoranze.length ? minoranze : votate).slice(0, 4);
}

// Cosa vede il modello. Il nome non c'è.
export function payload(p) {
  const rilevanti = scelteChiave(p);

  const scelte = p.scelte.map(s => {
    if (!s.voto) return `— ${s.titolo}: NON HA VOTATO (evento subito).`;
    return `— ${s.titolo}\n`
      + `   Scelta: «${s.scelta}»\n`
      + `   Costo pagato oggi: ${s.costo}`
      + (s.minoranza ? ` [ATTENZIONE: HA PERSO, VOTO IN MINORANZA]` : ``);
  }).join("\n");

  const mondo = p.esiti.map(e => `— ${e.nome}: ${e.testo}`).join("\n");

  return `ETÀ NEL 2040: {ETA}

SCELTE CHIAVE DA CUI ESTRARRE LA SCENA (Scegli 2 di queste da incrociare):
${rilevanti.length
    ? rilevanti.map(s => `* ${s.titolo} -> Costo: ${s.costo}`).join("\n")
    : "* Non ha votato nulla: costruisci la scena solo sul mondo della sala, senza rimproverargli l'assenza."}

TUTTE LE 12 SCELTE NEL DETTAGLIO:
${scelte}

SISTEMA MONDO ATTUALE:
${mondo}

ESITO FINALE:
${p.climax.testo}`;
}

// --------------------------------------------------------------------------
// Generazione
// --------------------------------------------------------------------------
export async function generaUno(p) {
  if (!KEY) return { testo: fallback(p), fonte: "fallback", motivo: "nessuna chiave" };
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${KEY}`,
        "X-Title": "Il Libro Vivo del 2040"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: payload(p) }
        ]
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const scelta = data?.choices?.[0];
    const testo = scelta?.message?.content?.trim();
    if (!testo) throw new Error("risposta vuota");
    // Un epilogo tagliato a metà frase è peggio del fallback: quello almeno
    // finisce. Alzare EPILOGO_MAX_TOKENS se succede spesso.
    if (scelta.finish_reason === "length") throw new Error(`troncato a ${MAX_TOKENS} token`);
    return { testo, fonte: "modello" };
  } catch (e) {
    // qualunque cosa vada storta, lo studente riceve comunque il suo 2040
    return { testo: fallback(p), fonte: "fallback", motivo: String(e.message || e) };
  }
}

// I 6 testi per banda × climax. Il segnaposto {ETA} lo interpola il client
// insieme a {NOME}, come per il testo generato.
export function fallback(p) {
  return FALLBACK[`${p.banda_sala || "medio"}:${p.climax.esito}`] || FALLBACK["medio:PERSA"];
}

// Pool invece delle 90 chiamate simultanee: vedi il commento su PARALLELE.
// `onUno` viene chiamato appena UN epilogo è pronto, non alla fine di tutti:
// chi chiama può salvarlo subito, così un processo che cade a metà non porta
// via anche il lavoro già fatto.
export async function generaTutti(lista, onUno) {
  const out = new Map();
  let i = 0, fatti = 0;
  const worker = async () => {
    while (i < lista.length) {
      const { cid, dati } = lista[i++];
      const ris = await generaUno(dati);
      out.set(cid, ris);
      if (onUno) await onUno(cid, ris, ++fatti, lista.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLELE, lista.length) }, worker));
  return out;
}

// --------------------------------------------------------------------------
// Persistenza — «un link per rileggere il proprio 2040» (Patch §8.5).
// A disco vanno nome, stringa età e testo. La data di nascita resta in memoria
// e muore col processo: a disco non serve, l'età è già calcolata.
// --------------------------------------------------------------------------
export async function salva({ nome, eta, testo }) {
  const token = randomBytes(8).toString("base64url");
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, `${token}.json`),
    JSON.stringify({ nome, eta, testo, creato: new Date().toISOString() }),
    "utf8"
  );
  return token;
}

export async function leggi(token) {
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(token)) return null;   // niente path traversal
  try {
    return JSON.parse(await readFile(path.join(dataDir(), `${token}.json`), "utf8"));
  } catch { return null; }
}

// Un link che non scade e un nome di studente sullo stesso file sono due cose
// che non stanno insieme senza una decisione. La decisione è: N giorni.
export async function pulisciVecchi(giorni = RETENTION_GIORNI) {
  const limite = Date.now() - giorni * 86400000;
  let tolti = 0;
  try {
    const dir = dataDir();
    for (const f of await readdir(dir)) {
      if (!f.endsWith(".json")) continue;
      const p = path.join(dir, f);
      if ((await stat(p)).mtimeMs < limite) { await unlink(p); tolti++; }
    }
  } catch { /* la cartella non esiste ancora: niente da pulire */ }
  return tolti;
}
