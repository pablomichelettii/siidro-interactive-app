// Self-check della sessione: una serata intera con tre partecipanti.
// `node server/session.test.js`
// Serve a intercettare le viste che esplodono — a fine serata `chapter` è null
// — e a verificare il doppio binario sala/individuo e la rivelazione.
import assert from "node:assert";
import { Session } from "./session.js";
import { CHAPTERS, VOTABILI, INTRECCI, FALLBACK } from "./engine.js";
import { leggi, pulisciVecchi, fallback } from "./epilogo.js";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// io finto: le viste vengono calcolate davvero, gli emit finiscono nel vuoto
const io = { to: () => ({ emit: () => {} }) };
const socket = (id) => ({ id, data: {}, join() {} });

// i capitoli che chiudono un intreccio: solo lì c'è un esito da annunciare
const CHIUDONO = INTRECCI.filter(i => i.nodo_chiusura != null).map(i => i.nodo_chiusura);
// i capitoli che ne aprono uno: lì va la mezza figura
const APRONO = INTRECCI.map(i => i.nodo_apertura);

const s = new Session(io);
const [a, b, c] = ["sa", "sb", "sc"].map(id => s.addParticipant(null, socket(id)));
assert.equal(s.connectedCount(), 3);

s.start();
assert.equal(s.phase, "narrating");
assert.equal(s.chapter.n, 1);

// a e b votano comodo, c vota sempre difficile: c finisce sempre in minoranza
for (const ch of VOTABILI) {
  assert.equal(s.chapter.n, ch.n, `atteso capitolo ${ch.n}`);
  s.openVote();
  assert.equal(s.phase, "voting");
  assert.ok(s.mainView().options, "il bivio aperto deve avere le opzioni");
  s.vote(a, "facile"); s.vote(b, "facile"); s.vote(c, "difficile");
  s.vote(c, "facile"); s.vote(c, "difficile");     // cambio idea: vale l'ultimo
  assert.deepEqual(s.tally(), { facile: 2, difficile: 1, total: 3, connected: 3 });
  s.closeVote();

  // il voto chiude sul capitolo, non lo supera: l'esito va mostrato lì (§4.3)
  assert.equal(s.phase, "revealing", `cap. ${ch.n}: dopo la chiusura si rivela`);
  assert.equal(s.chapter.n, ch.n, `cap. ${ch.n}: la rivelazione resta sul capitolo`);
  const r = s.mainView().reveal;
  assert.equal(r.winner, "facile");
  assert.equal(r.facile, 2);
  assert.equal(r.difficile, 1, "la forbice finale si vede sempre alla rivelazione");
  assert.ok(r.label && r.costo, "serve la scelta vinta e il suo costo nascosto");
  if (CHIUDONO.includes(ch.n)) assert.ok(r.esito, `cap. ${ch.n} chiude un intreccio: serve l'esito`);
  else assert.equal(r.esito, null, `cap. ${ch.n} non chiude niente: nessun esito`);

  // mezza figura sui capitoli che aprono, e mai insieme a un esito
  const attesoParziale = !CHIUDONO.includes(ch.n) && APRONO.includes(ch.n);
  assert.equal(r.parziale, attesoParziale, `cap. ${ch.n}: mezza figura sbagliata`);
  assert.ok(!(r.esito && r.parziale), `cap. ${ch.n}: esito e mezza figura insieme`);
  // la mezza figura non deve portare NIENTE da cui dedurre il segno
  if (r.parziale) assert.deepEqual(Object.keys(r).filter(k => /id|asse|stato|nome|testo/.test(k)), [],
    `cap. ${ch.n}: la mezza figura sta mandando dati che rivelano l'intreccio`);

  s.skip();
}
// ogni capitolo da 1 a 11 dice qualcosa; solo il 12 non apre né chiude
for (let n = 1; n <= 11; n++)
  assert.ok(CHIUDONO.includes(n) || APRONO.includes(n), `cap. ${n} non ha niente da mostrare`);
assert.ok(!CHIUDONO.includes(12) && !APRONO.includes(12), "il capitolo 12 non apre né chiude");
// il capitolo 2 vota I6 e non deve rivelare niente lì
assert.ok(!CHIUDONO.includes(2), "I6 non si rivela al capitolo 2");

// dopo i 12 bivi si narra il 13, che non si vota
assert.equal(s.chapter.n, 13);
assert.equal(s.phase, "narrating");
s.openVote();
assert.equal(s.phase, "narrating", "il capitolo 13 non apre nessun voto");

const v13 = s.mainView();
assert.equal(v13.indice, 67, "2 facili su 3 per dodici capitoli = 67%");
assert.equal(v13.banda, "alto");
assert.equal(v13.reveal, null, "fuori dalla rivelazione non c'è nulla da annunciare");
assert.ok(v13.chapter.ruolo === "climax" && v13.climax.nome, "il 13 legge l'Indice");
assert.equal(v13.esiti.length, 5, "al 13 sono visibili i cinque intrecci a due nodi, non I6");
assert.ok(!v13.esiti.some(e => e.id === "I6"), "I6 resta nascosto fino al 14");

assert.equal(v13.scenario, null, "al 13 lo scenario non si compone ancora");

s.skip();
assert.equal(s.chapter.n, 14);
const v14 = s.mainView();
assert.equal(v14.esiti.length, 6, "il 14 compone tutto, incluso I6");
// lo scenario globale vive nel capitolo che compone, non dopo (§7)
assert.ok(v14.scenario, "il capitolo 14 ha lo scenario globale");
assert.equal(v14.scenario.flatMap(g => g.esiti).length, 6);
assert.ok(v14.climax.esito, "il climax porta il suo segno, per chiudere la schermata");

s.skip();
assert.equal(s.phase, "ended");
const fine = s.mainView();
assert.equal(fine.chapter, null, "a serata finita non c'è un capitolo corrente");
assert.ok(fine.climax.testo, "la schermata finale legge il climax dal dato");
assert.equal(fine.esiti.length, 6);
assert.equal(fine.aggregates.length, 12);
// lo scenario resta consultabile dopo, ed è lo stesso del 14
assert.deepEqual(fine.scenario, v14.scenario, "la schermata finale non ricompone: tiene la stessa");

// ---- doppio binario -------------------------------------------------------
const pa = s.personalView(a), pc = s.personalView(c);
assert.equal(pa.voti_espressi, 12);
assert.equal(pa.indice_personale, 100, "a ha sempre votato comodo");
assert.equal(pa.voti_in_minoranza, 0);
assert.equal(pc.indice_personale, 0, "c ha sempre votato difficile");
assert.equal(pc.voti_in_minoranza, 12, "c ha perso tutte e dodici le volte");
assert.equal(pc.scelte.length, 12);
assert.equal(s.consensusCount().same + s.consensusCount().diverge, 3);

// ---- chi entra a metà serata (Patch §5) ----------------------------------
const s2 = new Session(io);
const early = s2.addParticipant(null, socket("s1"));
s2.start();
let tardi = null;
for (const ch of VOTABILI) {
  s2.openVote();
  if (ch.n === 6) tardi = s2.addParticipant(null, socket("s2"));   // entra al capitolo 6
  s2.vote(early, "facile");
  if (tardi) s2.vote(tardi, "difficile");
  s2.closeVote();
  s2.skip();
}
const pt = s2.personalView(tardi);
assert.equal(pt.scelte.length, 12, "i capitoli già chiusi restano in elenco");
assert.equal(pt.scelte.filter(x => x.voto === null).length, 5, "i primi cinque non li ha votati");
assert.equal(pt.voti_espressi, 7);
assert.equal(pt.indice_personale, 0);

// ---- riapri voto: con lo stato derivato è un pop di history --------------
const s3 = new Session(io);
const solo = s3.addParticipant(null, socket("s1"));
s3.start();
s3.openVote(); s3.vote(solo, "facile"); s3.closeVote();
assert.equal(s3.phase, "revealing");
assert.equal(s3.world.indice, 100);

// riapertura dalla rivelazione: stesso capitolo
s3.reopenVote();
assert.equal(s3.chapter.n, 1, "si torna al capitolo appena chiuso");
assert.equal(s3.phase, "voting");
assert.equal(s3.world.indice, null, "l'esito è stato annullato, non compensato");
s3.vote(solo, "difficile"); s3.closeVote();
assert.equal(s3.world.indice, 0, "il nuovo esito sostituisce il vecchio");
assert.equal(s3.history.length, 1, "una riga per capitolo, non due");

// riapertura quando il regista è già andato avanti: torna indietro di uno
s3.skip();
assert.equal(s3.chapter.n, 2);
s3.reopenVote();
assert.equal(s3.chapter.n, 1, "riapre anche dopo essere avanzato");
assert.equal(s3.phase, "voting");
assert.equal(s3.history.length, 0);

// ---- capitolo a zero voti: la serata non si blocca ----------------------
const s4 = new Session(io);
s4.addParticipant(null, socket("s1"));
s4.start();
s4.openVote(); s4.closeVote();
assert.equal(s4.history[0].winner, "facile", "zero voti → facile, e si va avanti");
assert.deepEqual([s4.mainView().reveal.facile, s4.mainView().reveal.difficile], [0, 0]);
s4.skip();
assert.equal(s4.chapter.n, 2);
assert.equal(s4.world.indice, null, "un capitolo senza voti non produce una quota");

// ogni capitolo, in ogni fase, produce viste che non esplodono
const s5 = new Session(io);
s5.addParticipant(null, socket("s1"));
s5.start();
for (let i = 0; i < CHAPTERS.length; i++) {
  s5.mainView(); s5.directorView(); s5.deviceViewGeneric();
  if (s5.chapter.votabile) { s5.openVote(); s5.mainView(); s5.closeVote(); s5.mainView(); s5.directorView(); }
  s5.skip();
}
assert.equal(s5.phase, "ended");
s5.mainView(); s5.directorView();

// ---- vista regia: cosa serve a chi guida dal palco (§9) ------------------
const sd = new Session(io);
sd.addParticipant(null, socket("s1"));
assert.equal(sd.directorView().puoRiaprire, false, "in lobby non c'è niente da riaprire");
sd.start();
for (const ch of VOTABILI) {
  const d = sd.directorView();
  assert.equal(d.chapter.n, ch.n);
  // apre o chiude: mai tutti e due, e per i capitoli 1-11 sempre uno
  assert.ok(!(d.apre && d.chiude), `cap. ${ch.n}: non può aprire e chiudere insieme`);
  if (ch.n <= 11) assert.ok(d.apre || d.chiude, `cap. ${ch.n}: dovrebbe piantare o raccogliere`);
  else assert.ok(!d.apre && !d.chiude, "il capitolo 12 non apre né chiude");
  if (d.chiude) assert.ok(d.chiude.id && d.chiude.asse, "serve id e asse per annunciarlo");
  // il prossimo capitolo, per il ritmo
  assert.equal(d.prossimo.n, ch.n + 1);
  assert.equal(d.prossimo.votabile, ch.n + 1 <= 12);
  sd.openVote(); sd.closeVote();
  assert.equal(sd.directorView().puoRiaprire, true, "chiuso un voto, si può riaprire");
  sd.skip();
}
// il 12 mostra la variante da leggere, il 13 il verdetto, il 14 né l'uno né l'altro
const d13 = sd.directorView();
assert.equal(d13.chapter.n, 13);
assert.equal(d13.chapter.ruolo, "climax");
assert.ok(d13.climax.testo, "il 13 ha un verdetto da leggere");
assert.equal(d13.prossimo.n, 14);
assert.equal(d13.prossimo.votabile, false);
sd.skip();
assert.equal(sd.directorView().prossimo, null, "dopo il 14 non c'è nessun capitolo");
sd.skip();
assert.equal(sd.phase, "ended");
assert.equal(sd.directorView().chapter, null, "a fine serata la regia non esplode");

// la variante del capitolo 12 dipende da I5 ed è quella che il narratore legge
const sv = new Session(io);
const lettore = sv.addParticipant(null, socket("s1"));
sv.start();
for (const ch of VOTABILI) {
  sv.openVote();
  sv.vote(lettore, ch.n === 7 ? "facile" : "difficile");   // I5 apre al 7, chiude all'11
  sv.closeVote();
  if (ch.n === 12) {
    const d = sv.directorView();
    assert.equal(d.intrecci.I5, "TERZA_VIA_PENTIMENTO");
    assert.ok(d.chapter.oracolo, "il 12 dà alla regia il testo da leggere");
    assert.ok(/spina dorsale/i.test(d.chapter.oracolo), "e dev'essere la variante giusta di I5");
  }
  sv.skip();
}

// ---- forbice live: il gate di mostra_live (§2.3) -------------------------
const s6 = new Session(io);
const occhi = s6.addParticipant(null, socket("s1"));
s6.start();
for (const ch of VOTABILI) {
  s6.openVote();
  s6.vote(occhi, "facile");
  const sala = s6.mainView().tally, regia = s6.directorView().tally;
  assert.equal(regia.facile, 1, `cap. ${ch.n}: la regia vede sempre la forbice vera`);
  if (ch.mostra_live) {
    assert.equal(sala.facile, 1, `cap. ${ch.n}: live acceso, la sala vede i numeri`);
    assert.equal(sala.live, true);
  } else {
    assert.equal(sala.facile, null, `cap. ${ch.n}: live spento, la sala NON vede da che parte`);
    assert.equal(sala.difficile, null);
    assert.equal(sala.total, 1, "ma sa quanti hanno votato");
    assert.equal(sala.live, false);
  }
  s6.closeVote();
  // alla chiusura la forbice si rivela comunque, anche dove era nascosta
  const r = s6.mainView().reveal;
  assert.equal(r.facile, 1, `cap. ${ch.n}: la forbice finale si vede sempre`);
  s6.skip();
}
// tre capitoli col live acceso, come indicato dalla trama
assert.equal(VOTABILI.filter(c => c.mostra_live).length, 3, "live acceso su deepfake, social credit e filtri AR");

// ---- timer: il voto si chiude da sé (§5, e §9 se il cruscotto cade) -----
const s7 = new Session(io);
const tizio = s7.addParticipant(null, socket("s1"));
s7.start();
// durata reale = 60s: non aspettabile in un test. La si abbassa sul capitolo.
const cap1 = CHAPTERS[0], durataVera = cap1.durata_voto_sec;
cap1.durata_voto_sec = 0.2;
s7.openVote();
assert.ok(s7.voteEndsAt, "il timer è armato");
const v = s7.mainView();
assert.ok(v.voteRestaMs > 0 && v.voteRestaMs <= 200, "la vista dice i ms residui, non un istante assoluto");
assert.equal(v.voteDurata, 0.2);
s7.vote(tizio, "difficile");
await sleep(320);
assert.equal(s7.phase, "revealing", "scaduto il tempo, il voto si è chiuso da sé");
assert.equal(s7.history[0].winner, "difficile", "il voto arrivato prima dello scadere conta");
assert.equal(s7.voteEndsAt, null, "chiuso il voto, il timer è spento");
assert.equal(s7.mainView().voteRestaMs, null);

// un timer vecchio non deve chiudere il bivio successivo
s7.skip();
s7.openVote();                      // capitolo 2, durata piena
assert.equal(s7.chapter.n, 2);
await sleep(320);
assert.equal(s7.phase, "voting", "il capitolo 2 è ancora aperto: nessun timer scaduto lo ha toccato");
cap1.durata_voto_sec = durataVera;   // ripristino: i dati sono condivisi tra i test

// riaprire un voto non riarma il timer: da lì decide il regista
const s8 = new Session(io);
s8.addParticipant(null, socket("s1"));
s8.start();
s8.openVote(); s8.closeVote();
s8.reopenVote();
assert.equal(s8.phase, "voting");
assert.equal(s8.voteEndsAt, null, "riaperto a mano: nessuna chiusura automatica a sorpresa");

// un capitolo con durata 0 non arma nessun timer
const s9 = new Session(io);
s9.addParticipant(null, socket("s1"));
s9.start();
const d0 = CHAPTERS[0].durata_voto_sec;
CHAPTERS[0].durata_voto_sec = 0;
s9.openVote();
assert.equal(s9.voteEndsAt, null, "durata 0 = chiude solo il regista");
assert.equal(s9.phase, "voting");
CHAPTERS[0].durata_voto_sec = d0;

// ---- epilogo individuale (Patch §8) -------------------------------------
// Senza OPENROUTER_API_KEY tutti prendono il fallback: è esattamente la voce
// di collaudo «timeout della generazione AI → fallback consegnato».
process.env.EPILOGHI_DIR = await mkdtemp(path.join(tmpdir(), "epiloghi-"));

const se = new Session(io);
const ada = se.addParticipant(null, socket("s1"), { nome: "Ada", data_nascita: "2008-04-20" });
const senzaDati = se.addParticipant(null, socket("s2"));
// nome oltre i 30 caratteri e data impossibile: entrambi vanno filtrati
const bruto = se.addParticipant(null, socket("s3"), { nome: "x".repeat(60), data_nascita: "2008-02-30" });

assert.equal(se.participants.get(ada).nome, "Ada");
assert.equal(se.participants.get(ada).eta, "32 anni, 6 mesi, 1 giorno", "l'età si calcola all'ingresso");
assert.equal(se.participants.get(senzaDati).nome, null, "chi non lascia nulla resta anonimo");
assert.equal(se.participants.get(bruto).nome.length, 30, "il nome è tagliato a 30 caratteri");
assert.equal(se.participants.get(bruto).nascita, null, "il 30 febbraio non passa");
assert.equal(se.directorView().conNome, 2, "due su tre hanno lasciato un nome");

se.start();
for (const ch of VOTABILI) {
  se.openVote();
  se.vote(ada, "difficile"); se.vote(senzaDati, "facile"); se.vote(bruto, "facile");
  se.closeVote();
  if (ch.n === 12) {
    assert.ok(se.generazionePromise, "chiuso il 12, la generazione parte da sola");
    await se.generazionePromise;
  } else {
    assert.equal(se.generazionePromise, undefined, `cap. ${ch.n}: non deve partire niente`);
  }
  se.skip();
}

const gen = se.directorView().generazione;
assert.equal(gen.finita, true);
assert.equal(gen.totale, 3);
assert.equal(gen.fatti, 3);
assert.equal(gen.modello, false, "senza chiave si dichiara che sono tutti fallback");

// prima del comando del regista, i telefoni non hanno niente
assert.equal(se.epiloghiRivelati, false);
let pAda = se.personalView(ada);
assert.equal(pAda.epilogo, null, "l'epilogo esiste ma non esce");
assert.equal(pAda.link, null);
assert.equal(pAda.inAttesa, true, "il telefono sa che c'è qualcosa in arrivo");

se.rivelaEpiloghi();
pAda = se.personalView(ada);
assert.ok(pAda.epilogo, "dopo il comando, il testo c'è");
assert.ok(pAda.epilogo.startsWith("Ada, nel 2040 avrai 32 anni, 6 mesi, 1 giorno."), "nome ed età interpolati");
assert.ok(!/\{NOME\}|\{ETA\}/.test(pAda.epilogo), "nessun segnaposto rimasto a vista");
assert.ok(pAda.link && pAda.link.startsWith("/e/"), "e il link per rileggerlo");

// chi non ha lasciato il nome riceve comunque un epilogo leggibile
const pn = se.personalView(senzaDati);
assert.ok(pn.epilogo && !/\{NOME\}|\{ETA\}/.test(pn.epilogo), "niente segnaposto nemmeno senza dati");
assert.ok(pn.epilogo.startsWith("Tu, nel 2040"), "senza nome si ripiega su «Tu»");

// il file salvato si rilegge dal token, ed è quello giusto
const salvato = await leggi(pAda.link.slice(3));
assert.equal(salvato.nome, "Ada");
assert.equal(salvato.testo, pAda.epilogo);
assert.equal(await leggi("../../etc/passwd"), null, "il token non può uscire dalla cartella");
assert.equal(await leggi("inesistente"), null);

// il fallback scelto dipende dal mondo della sala, non è sempre lo stesso
const banda = se.world.banda, esito = se.world.climax.esito;
assert.equal(fallback({ banda_sala: banda, climax: se.world.climax }), FALLBACK[`${banda}:${esito}`]);

// retention: i file vecchi se ne vanno
assert.equal(await pulisciVecchi(0), 3, "con retention 0 si cancella tutto");
assert.equal(await leggi(pAda.link.slice(3)), null, "e il link non risponde più");

console.log("OK — serata, vista regia, rivelazione, mezza figura, forbice mascherata, timer, doppio binario, ingresso a metà, riapertura, zero voti ed epiloghi.");
