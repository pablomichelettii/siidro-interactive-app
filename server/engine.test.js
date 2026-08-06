// Self-check del motore. `node server/engine.test.js`
// Copre le voci della checklist di collaudo (Patch §12) che si possono
// verificare senza una sala: i quattro stati di un intreccio, i due di I6,
// I2 che chiude al capitolo 5, I6 invisibile prima del 14, Indice e climax.
import assert from "node:assert";
import {
  CHAPTERS, INTRECCI, VOTABILI, BIVI, START_DATE, REF_2040,
  statoIntreccio, indiceDelega, banda, esitoClimax, derive, esitiVisibili,
  contaParziali, testoOracolo, opzioni, FALLBACK, componiScenario,
  etaAl, formattaEta, isDataValida
} from "./engine.js";

const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
// una riga di history; il pareggio va a "facile", come in Session.closeVote
const h = (n, facile, difficile) => ({ n, facile, difficile, winner: difficile > facile ? "difficile" : "facile" });
const mondo = (...righe) => derive(righe);

// ---- anagrafica (Patch §3) ------------------------------------------------
assert.equal(CHAPTERS.length, 14, "14 capitoli, 2027→2040");
assert.equal(BIVI, 12, "i capitoli 1-12 si votano, il 13 e il 14 no");
assert.deepEqual(VOTABILI.map(c => c.n), [1,2,3,4,5,6,7,8,9,10,11,12]);
assert.deepEqual(CHAPTERS.map(c => c.n), [...Array(14).keys()].map(i => i + 1), "numerazione contigua");
assert.equal(CHAPTERS[12].anno, "2039", "il 13 è 2039");
assert.equal(CHAPTERS[13].anno, "2040", "il capitolo finale è 2040, non 2039");

// il contatore "giorni nel futuro" è calcolato: 168 per il 2027
assert.equal(days(START_DATE, CHAPTERS[0].data), 168, "capitolo 1 = 168 giorni nel futuro");
// una manopola sola: l'ultimo capitolo È la data di riferimento dell'età
assert.equal(CHAPTERS[13].data, REF_2040, "capitolo 14 = data di riferimento del calcolo età");
for (let i = 1; i < CHAPTERS.length; i++)
  assert.ok(CHAPTERS[i].data > CHAPTERS[i - 1].data, `date monotone: cap. ${i + 1}`);

// i capitoli rimossi dalla revisione non devono essere tornati dalla finestra
for (const morto of ["memoria", "medicina", "prompt", "lucca"])
  assert.ok(!CHAPTERS.some(c => c.id === morto), `${morto} è stato rimosso dalla trama`);

// ogni capitolo votabile ha domanda e due opzioni complete
for (const c of VOTABILI) {
  assert.ok(c.q, `cap. ${c.n} senza domanda`);
  for (const o of opzioni(c).opts)
    for (const campo of ["label", "guadagno", "costo_nascosto"])
      assert.ok(o[campo], `cap. ${c.n} opzione ${o.tag}: manca ${campo}`);
}
assert.equal(opzioni(CHAPTERS[12]), null, "il capitolo 13 non ha opzioni");

// ---- integrità dei testi degli intrecci -----------------------------------
assert.equal(INTRECCI.length, 6, "cinque intrecci a due nodi più uno a nodo singolo");
for (const it of INTRECCI) {
  const attesi = it.nodo_chiusura == null
    ? ["NEGATIVO", "POSITIVO"]
    : ["NEGATIVO", "POSITIVO", "TERZA_VIA_PENTIMENTO", "TERZA_VIA_RESA"];
  assert.deepEqual(Object.keys(it.esiti).sort(), [...attesi].sort(), `${it.id}: esiti incompleti`);
  for (const [k, e] of Object.entries(it.esiti)) {
    assert.ok(e.nome && e.testo, `${it.id}/${k}: nome o testo mancante`);
  }
  // il nodo di apertura è sempre il cronologicamente precedente
  if (it.nodo_chiusura != null)
    assert.ok(it.nodo_apertura < it.nodo_chiusura, `${it.id}: apertura e chiusura invertite`);
}

// ---- i quattro esiti di un intreccio a due nodi (Patch §4.1) --------------
const I1 = INTRECCI.find(i => i.id === "I1");   // apre cap. 1, chiude cap. 10
assert.equal(statoIntreccio(I1, { 1: "facile",    10: "facile"    }), "NEGATIVO");
assert.equal(statoIntreccio(I1, { 1: "difficile", 10: "difficile" }), "POSITIVO");
assert.equal(statoIntreccio(I1, { 1: "facile",    10: "difficile" }), "TERZA_VIA_PENTIMENTO");
assert.equal(statoIntreccio(I1, { 1: "difficile", 10: "facile"    }), "TERZA_VIA_RESA");
// l'ordine conta: pentimento e resa non sono lo stesso mondo
assert.notEqual(I1.esiti.TERZA_VIA_PENTIMENTO.testo, I1.esiti.TERZA_VIA_RESA.testo);
// aperto e non ancora chiuso
assert.equal(statoIntreccio(I1, { 1: "facile" }), "PARZIALE");
assert.equal(statoIntreccio(I1, {}), null, "non aperto");

// ---- I6: nodo singolo, due esiti, nessuna terza via ----------------------
const I6 = INTRECCI.find(i => i.id === "I6");
assert.equal(I6.nodo_chiusura, null);
assert.equal(statoIntreccio(I6, { 2: "facile" }), "NEGATIVO");
assert.equal(statoIntreccio(I6, { 2: "difficile" }), "POSITIVO");

// ---- quando si risolvono (Patch §4.3) -----------------------------------
// I2 apre al 4 e chiude al 5: si risolve in prima metà, non a fine serata
const dopoIl5 = mondo(h(4, 10, 0), h(5, 10, 0));
assert.equal(dopoIl5.intrecci.I2, "NEGATIVO");
assert.ok(esitiVisibili(dopoIl5.intrecci, 5).some(e => e.id === "I2"), "I2 si mostra al capitolo 5");
assert.ok(!esitiVisibili(dopoIl5.intrecci, 4).some(e => e.id === "I2"), "I2 non si mostra al capitolo 4");

// I6 è determinato dal capitolo 2 ma non deve comparire prima del 14
const dopoIl2 = mondo(h(2, 10, 0));
assert.equal(dopoIl2.intrecci.I6, "NEGATIVO", "I6 è noto dal capitolo 2");
for (let n = 2; n <= 13; n++)
  assert.ok(!esitiVisibili(dopoIl2.intrecci, n).some(e => e.id === "I6"), `I6 invisibile al capitolo ${n}`);
assert.ok(esitiVisibili(dopoIl2.intrecci, 14).some(e => e.id === "I6"), "I6 compare al capitolo 14");

// un intreccio a metà non finisce tra gli esiti mostrati, ma si conta
const aMeta = mondo(h(1, 10, 0));
assert.equal(aMeta.intrecci.I1, "PARZIALE");
assert.equal(esitiVisibili(aMeta.intrecci, 12).length, 0, "un PARZIALE non si mostra come esito");
assert.equal(contaParziali(aMeta.intrecci), 1);

// ---- Indice di Delega: media delle quote (Patch §6) ---------------------
assert.equal(indiceDelega([h(1, 10, 0), h(2, 0, 10)]), 50, "100% e 0% fanno media 50");
assert.equal(indiceDelega([h(1, 6, 4)]), 60, "6 facili su 10 = 60");
// un capitolo a zero voti ha un vincitore per fallback ma non una quota:
// resta fuori dal denominatore
assert.equal(indiceDelega([h(1, 6, 4), h(2, 0, 0)]), 60, "il capitolo a zero voti non entra nella media");
assert.equal(indiceDelega([h(1, 0, 0)]), null, "nessun voto in tutta la serata → nessun indice");
// il pareggio esatto va a "facile"
assert.equal(h(1, 5, 5).winner, "facile", "pareggio 50/50 → facile");

assert.equal(banda(0), "basso");
assert.equal(banda(50), "medio");
assert.equal(banda(100), "alto");
assert.equal(banda(null), null);

// ---- climax: legge l'Indice contro la soglia (Patch §6) ------------------
assert.equal(esitoClimax(80).nome, esitoClimax(50).nome, "sopra soglia: stesso esito");
assert.notEqual(esitoClimax(50).nome, esitoClimax(49).nome, "la soglia del 50% separa i due esiti");
assert.equal(esitoClimax(null).nome, esitoClimax(0).nome, "nessun voto → la soglia tiene");

// ---- il capitolo 12 dipende da I5 (Patch §4.4) --------------------------
// I5 apre al 7 e chiude all'11: a quel punto è sempre risolto
for (const [a, b] of [["facile","facile"], ["facile","difficile"], ["difficile","facile"], ["difficile","difficile"]]) {
  const w = mondo(h(7, a === "facile" ? 10 : 0, a === "facile" ? 0 : 10),
                  h(11, b === "facile" ? 10 : 0, b === "facile" ? 0 : 10));
  assert.ok(testoOracolo(w.intrecci), `capitolo 12 senza variante per I5 = ${w.intrecci.I5}`);
}
assert.equal(testoOracolo({ I5: "PARZIALE" }), null, "I5 non risolto → nessuna variante");

// ---- fallback dell'epilogo: 6 varianti, banda × climax ------------------
assert.deepEqual(Object.keys(FALLBACK).sort(),
  ["alto:PERSA", "alto:TENUTA", "basso:PERSA", "basso:TENUTA", "medio:PERSA", "medio:TENUTA"]);
for (const [k, t] of Object.entries(FALLBACK)) {
  assert.ok(t.includes("{NOME}") && t.includes("{ETA}"), `fallback ${k}: segnaposto mancanti`);
  assert.ok(t.split(/\s+/).length <= 200, `fallback ${k}: oltre 200 parole`);
}

// ---- scenario globale: composto, non scelto da una tabella (§7) ---------
// Ogni composizione contiene tutti e sei gli esiti, una volta sola, e non
// mostra gruppi vuoti.
const w7 = (a) => derive(VOTABILI.map(c => h(c.n, a(c.n) === "facile" ? 10 : 0, a(c.n) === "facile" ? 0 : 10)));
for (const [nome, voto] of [
  ["tutto comodo",   () => "facile"],
  ["tutto difficile", () => "difficile"],
  ["alternato",      (n) => n % 2 ? "facile" : "difficile"],
  ["primi comodi",   (n) => n <= 6 ? "facile" : "difficile"]
]) {
  const sc = componiScenario(w7(voto).intrecci);
  const tutti = sc.flatMap(g => g.esiti);
  assert.equal(tutti.length, 6, `${nome}: la composizione deve contenere tutti e sei gli intrecci`);
  assert.equal(new Set(tutti.map(e => e.id)).size, 6, `${nome}: nessun intreccio ripetuto`);
  assert.ok(sc.every(g => g.esiti.length > 0), `${nome}: nessun gruppo vuoto in output`);
  assert.ok(sc.every(g => g.titolo), `${nome}: ogni gruppo ha un titolo`);
}
// i casi puri collassano in un gruppo solo, e non è quello sbagliato
const puroNeg = componiScenario(w7(() => "facile").intrecci);
assert.equal(puroNeg.length, 1);
assert.equal(puroNeg[0].chiave, "rotto");
const puroPos = componiScenario(w7(() => "difficile").intrecci);
assert.equal(puroPos.length, 1);
assert.equal(puroPos[0].chiave, "tenuto");
// una sala che cambia idea a metà su tutto finisce nel gruppo di mezzo
const pentita = derive(VOTABILI.map(c => h(c.n, c.n <= 4 ? 10 : 0, c.n <= 4 ? 0 : 10)));
assert.ok(componiScenario(pentita.intrecci).some(g => g.chiave === "meta"), "la terza via ha il suo gruppo");
// prima dell'ultimo capitolo non si compone niente di completo
assert.equal(componiScenario(derive([]).intrecci).length, 0, "senza voti non c'è nessuno scenario");

// ---- serata intera: la sala vota sempre comodo -------------------------
const tuttoFacile = derive(VOTABILI.map(c => h(c.n, 10, 0)));
assert.equal(tuttoFacile.indice, 100);
assert.equal(tuttoFacile.banda, "alto");
assert.deepEqual(Object.values(tuttoFacile.intrecci), Array(6).fill("NEGATIVO"));
assert.equal(esitiVisibili(tuttoFacile.intrecci, 14).length, 6, "al 14 si compongono tutti e sei");

const tuttoDifficile = derive(VOTABILI.map(c => h(c.n, 0, 10)));
assert.equal(tuttoDifficile.indice, 0);
assert.deepEqual(Object.values(tuttoDifficile.intrecci), Array(6).fill("POSITIVO"));
assert.notEqual(tuttoFacile.climax.nome, tuttoDifficile.climax.nome);

// ---- età calendario-consapevole (Patch §8.2) ----------------------------
const eta = (n, r = REF_2040) => etaAl(n, r);

// l'esempio della specifica deve venire esatto
assert.deepEqual(eta("2008-04-20"), { anni: 32, mesi: 6, giorni: 1 });
assert.equal(formattaEta(eta("2008-04-20")), "32 anni, 6 mesi, 1 giorno");

// stesso giorno e mese: anni tondi, zero e zero
assert.deepEqual(eta("2008-10-21"), { anni: 32, mesi: 0, giorni: 0 });
assert.equal(formattaEta(eta("2008-10-21")), "32 anni, 0 mesi, 0 giorni");
// il giorno dopo il compleanno, e il giorno prima
assert.deepEqual(eta("2008-10-22"), { anni: 31, mesi: 11, giorni: 29 });
assert.deepEqual(eta("2008-10-20"), { anni: 32, mesi: 0, giorni: 1 });

// singolare e plurale: è la prima riga che ogni studente legge
assert.equal(formattaEta({ anni: 1, mesi: 1, giorni: 1 }), "1 anno, 1 mese, 1 giorno");
assert.equal(formattaEta({ anni: 2, mesi: 0, giorni: 3 }), "2 anni, 0 mesi, 3 giorni");

// 29 febbraio: il prestito dal mese precedente lo sistema senza casi speciali
assert.deepEqual(eta("2008-02-29"), { anni: 32, mesi: 7, giorni: 22 });
assert.deepEqual(eta("2008-02-29", "2041-02-28"), { anni: 32, mesi: 11, giorni: 30 });
assert.deepEqual(eta("2008-02-29", "2040-02-29"), { anni: 32, mesi: 0, giorni: 0 }, "2040 è bisestile");
// nato il 31 in un mese che ne ha meno: 31 gennaio + 1 mese = 29 febbraio
assert.deepEqual(etaAl("2000-01-31", "2000-03-01"), { anni: 0, mesi: 1, giorni: 1 });
assert.deepEqual(etaAl("2001-01-31", "2001-03-01"), { anni: 0, mesi: 1, giorni: 1 }, "e 28 febbraio nei non bisestili");

// Proprietà su tutte le date di nascita plausibili, invece di casi a mano:
// i campi restano nei loro intervalli, e chi nasce dopo non è mai più vecchio.
let precedente = null;
for (let g = 0; g < 4000; g += 7) {
  const nascita = new Date(Date.UTC(2004, 0, 1 + g)).toISOString().slice(0, 10);
  const e = eta(nascita);
  assert.ok(e.giorni >= 0 && e.giorni <= 30, `${nascita}: giorni fuori scala (${e.giorni})`);
  assert.ok(e.mesi >= 0 && e.mesi <= 11, `${nascita}: mesi fuori scala (${e.mesi})`);
  const tot = e.anni * 10000 + e.mesi * 100 + e.giorni;
  if (precedente !== null) assert.ok(tot <= precedente, `${nascita}: nato dopo ma risulta più vecchio`);
  precedente = tot;
}

// input che non devono passare
for (const brutta of ["2008-02-30", "2008-13-01", "20-04-2008", "2008-4-20", "", null, undefined, "2041-01-01"])
  assert.equal(eta(brutta), null, `data rifiutata: ${brutta}`);
assert.equal(isDataValida("2008-02-29"), true, "il 2008 è bisestile");
assert.equal(isDataValida("2009-02-29"), false, "il 2009 no");
assert.equal(formattaEta(null), null);

console.log("OK — anagrafica 14 capitoli, sei intrecci a quattro esiti, Indice, climax ed età verificati.");
