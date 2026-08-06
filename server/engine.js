// ==========================================================================
// ENGINE — solo funzioni pure. I testi stanno in content.js.
//
// Lo stato NON è accumulato: è DERIVATO da `history`, cioè dall'elenco dei
// vincitori capitolo per capitolo. Dodici capitoli per sei intrecci: costo
// nullo, e in cambio "riapri voto" e "forza esito" sono un pop di history
// invece di logica di undo sui delta già applicati.
// ==========================================================================

import {
  CHAPTERS, INTRECCI, ORACOLO_PER_I5, CLIMAX, SOGLIA_CLIMAX, BANDE
} from "./content.js";

export { CHAPTERS, INTRECCI, START_DATE, REF_2040, FALLBACK } from "./content.js";

export const VOTABILI = CHAPTERS.filter(c => c.votabile);
export const BIVI = VOTABILI.length;

// --------------------------------------------------------------------------
// Stato di un singolo intreccio (Patch §4.5).
// `winners` mappa numero-di-capitolo → "facile" | "difficile".
// null = non ancora aperto · PARZIALE = aperto e non ancora chiuso.
// --------------------------------------------------------------------------
export function statoIntreccio(it, winners) {
  const a = winners[it.nodo_apertura];
  if (!a) return null;

  // nodo singolo (I6): due soli esiti, nessuna terza via
  if (it.nodo_chiusura == null) return a === "facile" ? "NEGATIVO" : "POSITIVO";

  const b = winners[it.nodo_chiusura];
  if (!b) return "PARZIALE";

  if (a === "facile") return b === "facile" ? "NEGATIVO" : "TERZA_VIA_PENTIMENTO";
  return b === "difficile" ? "POSITIVO" : "TERZA_VIA_RESA";
}

// --------------------------------------------------------------------------
// Indice di Delega — media delle quote "facile" sui capitoli votati (Patch §6).
// I capitoli senza nemmeno un voto restano fuori dal denominatore: non hanno
// una quota, anche se hanno un vincitore per fallback.
// --------------------------------------------------------------------------
export function indiceDelega(history) {
  const quote = history
    .filter(h => h.facile + h.difficile > 0)
    .map(h => h.facile / (h.facile + h.difficile) * 100);
  if (!quote.length) return null;
  return Math.round(quote.reduce((a, b) => a + b, 0) / quote.length);
}

export function banda(indice) {
  if (indice == null) return null;
  return indice < BANDE.basso ? "basso" : indice >= BANDE.alto ? "alto" : "medio";
}

// Capitolo 13: legge l'Indice contro la soglia, non introduce scelte nuove.
// Indice null = nessun voto in tutta la serata: la soglia, per default, tiene.
export function esitoClimax(indice) {
  return (indice ?? 0) >= SOGLIA_CLIMAX ? CLIMAX.PERSA : CLIMAX.TENUTA;
}

// --------------------------------------------------------------------------
// Lo stato del mondo, tutto insieme.
// --------------------------------------------------------------------------
export function derive(history) {
  const winners = {};
  for (const h of history) winners[h.n] = h.winner;

  const intrecci = {};
  for (const it of INTRECCI) intrecci[it.id] = statoIntreccio(it, winners);

  const indice = indiceDelega(history);
  return { winners, intrecci, indice, banda: banda(indice), climax: esitoClimax(indice) };
}

// --------------------------------------------------------------------------
// Esiti mostrabili alla sala fino al capitolo `n` incluso.
// Un intreccio si rivela quando chiude il suo nodo di chiusura (Patch §4.3),
// tranne I6 che è noto dal capitolo 2 e resta nascosto fino al 14.
// --------------------------------------------------------------------------
export function esitiVisibili(intrecci, n) {
  const out = [];
  for (const it of INTRECCI) {
    const stato = intrecci[it.id];
    if (!stato || stato === "PARZIALE") continue;
    if ((it.rivela_a_capitolo ?? it.nodo_chiusura) > n) continue;
    out.push({ id: it.id, asse: it.asse, stato, ...it.esiti[stato] });
  }
  return out;
}

// L'intreccio che si risolve chiudendo il voto del capitolo `n`, se ce n'è uno.
// I6 ha `nodo_chiusura` nullo e quindi non compare mai qui: si determina al
// capitolo 2 e non si mostra fino al 14 (Patch §4.3).
export function chiudeA(n) {
  return INTRECCI.find(it => it.nodo_chiusura === n) || null;
}

// L'intreccio che il capitolo `n` APRE, se ce n'è uno. Serve alla mezza figura:
// dopo il voto la sala deve vedere che qualcosa si è messo in moto, senza sapere
// cosa né in che direzione (§4.6). Include I6, che apre al capitolo 2 e non si
// rivela fino al 14: anche quello, per la sala, è qualcosa che si sta formando.
export function apreA(n) {
  return INTRECCI.find(it => it.nodo_apertura === n) || null;
}

// --------------------------------------------------------------------------
// SCENARIO GLOBALE (§7) — composto a runtime dai frammenti già scritti.
// Le combinazioni sono 4⁵ × 2 × 2 = 4096: non esiste nessuna tabella di finali,
// e non deve esistere. Quello che si compone è il raggruppamento: sei esiti
// slegati diventano una frase sul mondo di QUESTA sala — cosa si è rotto, cosa
// è cambiato per strada, cosa ha tenuto. È anche la scaletta del narratore.
//
// L'ordine non fabbrica speranza: se niente ha tenuto quel gruppo non c'è, e
// la schermata finisce su quello che è rimasto rotto.
// --------------------------------------------------------------------------
const GRUPPI = [
  { chiave: "rotto",  titolo: "Si è rotto",               stati: ["NEGATIVO"] },
  { chiave: "meta",   titolo: "È cambiato a metà strada", stati: ["TERZA_VIA_PENTIMENTO", "TERZA_VIA_RESA"] },
  { chiave: "tenuto", titolo: "Ha tenuto",                stati: ["POSITIVO"] }
];

export function componiScenario(intrecci) {
  const esiti = esitiVisibili(intrecci, 14);
  return GRUPPI
    .map(g => ({ chiave: g.chiave, titolo: g.titolo, esiti: esiti.filter(e => g.stati.includes(e.stato)) }))
    .filter(g => g.esiti.length);
}

// Quanti intrecci sono aperti e non ancora chiusi. La rappresentazione a
// schermo deve essere UNICA e indipendente dall'esito che si sta formando,
// o la sala impara a leggere il segno e corregge il voto dopo (Patch §4.6).
export function contaParziali(intrecci) {
  return Object.values(intrecci).filter(s => s === "PARZIALE").length;
}

// Il capitolo 12 non apre nessun intreccio: mostra una variante determinata
// da I5, che a quel punto è sempre risolto (chiude al capitolo 11).
export function testoOracolo(intrecci) {
  return ORACOLO_PER_I5[intrecci.I5] || null;
}

// --------------------------------------------------------------------------
// ETÀ — calendario-consapevole (Patch §8.2). Non aritmetica su 365 giorni, o
// le cifre finali risultano visibilmente sbagliate proprio nella riga che
// ogni studente legge per prima.
// Tutto in UTC: l'ora legale sposterebbe i conteggi di un giorno.
// --------------------------------------------------------------------------
export function etaAl(nascitaISO, riferimentoISO) {
  if (!isDataValida(nascitaISO) || !isDataValida(riferimentoISO)) return null;
  const n = new Date(nascitaISO + "T00:00:00Z"), r = new Date(riferimentoISO + "T00:00:00Z");
  if (n > r) return null;

  let anni = r.getUTCFullYear() - n.getUTCFullYear();
  let mesi = r.getUTCMonth() - n.getUTCMonth();
  if (r.getUTCDate() < n.getUTCDate()) mesi--;
  if (mesi < 0) { mesi += 12; anni--; }

  // I giorni si contano davvero, non si prendono in prestito da un mese: si
  // avanza la data di nascita di anni+mesi e si misura quel che resta.
  // Prestare dal mese precedente lascia i giorni negativi quando si è nati il
  // 31 e quel mese ne ha 28 o 30 — e il 29 febbraio cade proprio lì vicino.
  const avanzata = new Date(Date.UTC(n.getUTCFullYear() + anni, n.getUTCMonth() + mesi, 1));
  const ultimoDelMese = new Date(Date.UTC(avanzata.getUTCFullYear(), avanzata.getUTCMonth() + 1, 0)).getUTCDate();
  avanzata.setUTCDate(Math.min(n.getUTCDate(), ultimoDelMese));   // 31 gennaio + 1 mese = 28/29 febbraio

  return { anni, mesi, giorni: Math.round((r - avanzata) / 86400000) };
}

// "2008-02-30" non è NaN per Date: rotola al 1° marzo. Il round-trip lo becca.
export function isDataValida(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(iso + "T00:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === iso;
}

const plurale = (n, uno, molti) => `${n} ${n === 1 ? uno : molti}`;

export function formattaEta(eta) {
  if (!eta) return null;
  return [
    plurale(eta.anni, "anno", "anni"),
    plurale(eta.mesi, "mese", "mesi"),
    plurale(eta.giorni, "giorno", "giorni")
  ].join(", ");
}

// --------------------------------------------------------------------------
// Le due opzioni di un capitolo, nella forma che va in vista.
// --------------------------------------------------------------------------
export function opzioni(ch) {
  if (!ch || !ch.votabile) return null;
  return {
    q: ch.q,
    opts: [
      { tag: "facile", ...ch.opzione_facile },
      { tag: "difficile", ...ch.opzione_difficile }
    ]
  };
}
