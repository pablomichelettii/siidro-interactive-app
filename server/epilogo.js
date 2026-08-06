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
// ponytail: slug di default da confermare sul catalogo OpenRouter — se è
// sbagliato la chiamata fallisce e parte il fallback, che è il comportamento
// voluto comunque. Si cambia da env senza toccare il codice.
const MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5";
const TIMEOUT_MS = Number(process.env.EPILOGO_TIMEOUT_MS || 60000);
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
const SYSTEM = `Scrivi l'epilogo personale di uno studente alla fine di uno spettacolo teatrale sul futuro.

Il dispositivo: un archivista del 2040 ha raccontato la storia dei prossimi quattordici anni, e la sala ha votato dodici volte scegliendo ogni volta tra una strada comoda e una faticosa. Quei voti hanno costruito un mondo. Adesso ogni studente riceve sul telefono la propria giornata tipo dentro quel mondo.

COME SCRIVERE
- In italiano, in seconda persona singolare, con registro intimo e retrospettivo.
- Massimo 200 parole. Meglio 150 che 200.
- Apri esattamente così: "{NOME}, nel 2040 avrai {ETA}." — lascia i segnaposto {NOME} e {ETA} letterali, non sostituirli. Poi prosegui con "Vivi in un mondo..." o una variante.
- Concreto e sensoriale: una giornata, una stanza, un gesto, un'ora precisa. Non un comunicato sul mondo.
- Usa gli stati degli intrecci come arredamento della giornata, non come elenco. Non nominare gli intrecci, non dire "positivo" o "negativo", non citare percentuali o numeri di voti.

VINCOLI ASSOLUTI
- Mai previsioni su morte, malattia o condizioni di salute dello studente o dei suoi familiari.
- Niente contenuti medici, psichiatrici, romantici o sessuali.
- Niente tono moraleggiante o giudicante sulle scelte fatte: racconta le conseguenze, non emettere verdetti sulla persona.
- Resta dentro il mondo descritto dai dati: non inventare eventi che gli stati degli intrecci non contengono.
- Chiudi sempre su un elemento di agentività — qualcosa che nel 2040 dipende ancora da lui o da lei. Mai su un vicolo cieco.

Rispondi solo con il testo dell'epilogo. Nessun titolo, nessuna introduzione, nessun commento.`;

// Cosa vede il modello. Il nome non c'è.
function payload(p) {
  const scelte = p.scelte
    .map(s => `  cap. ${s.capitolo}: ${s.voto === null ? "non ha votato" : s.voto}`)
    .join("\n");
  const mondo = p.esiti
    .map(e => `  ${e.asse}: ${e.nome} — ${e.testo}`)
    .join("\n");
  return `ETÀ NEL 2040: {ETA}

LE SUE DODICI SCELTE ("facile" = la strada comoda, "difficile" = quella faticosa):
${scelte}

QUANTE SCELTE COMODE: ${p.indice_personale === null ? "nessun voto espresso" : p.indice_personale + "% dei voti che ha espresso"}
QUANTE VOLTE HA VOTATO CONTRO LA MAGGIORANZA DELLA SALA: ${p.voti_in_minoranza} su ${p.voti_espressi}

IL MONDO CHE LA SALA HA COSTRUITO (delega ${p.banda_sala || "non determinata"}):
${mondo}

COME FINISCE: ${p.climax.nome} — ${p.climax.testo}`;
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
        max_tokens: 600,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: payload(p) }
        ]
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const testo = data?.choices?.[0]?.message?.content?.trim();
    if (!testo) throw new Error("risposta vuota");
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
export async function generaTutti(lista, onProgress) {
  const out = new Map();
  let i = 0, fatti = 0;
  const worker = async () => {
    while (i < lista.length) {
      const { cid, dati } = lista[i++];
      out.set(cid, await generaUno(dati));
      if (onProgress) onProgress(++fatti, lista.length);
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
