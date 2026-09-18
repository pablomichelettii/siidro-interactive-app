// Self-check della sessione: una serata intera con tre partecipanti.
// `node server/session.test.js`
// Copre quello che in sala si rompe in silenzio: vittoria con N opzioni,
// regola del pareggio, salto libero, timer, riapertura, viste che esplodono.
import assert from "node:assert";
import { Session, VOTABILI, opzioni, CHAT } from "./session.js";
import { ESEMPI } from "./content.js";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// io finto: le viste vengono calcolate davvero, gli emit finiscono nel vuoto
const io = { to: () => ({ emit: () => {} }) };
const socket = (id) => ({ id, data: {}, join() {} });
// il tag n-esimo dell'esempio corrente, senza sapere come si chiama
const tagN = (ch, i) => ch.opzioni[i].tag;

// ---- forma del contenuto -------------------------------------------------
const visti = new Set();
for (const e of ESEMPI) {
  assert.ok(e.id && !visti.has(e.id), `id mancante o duplicato: ${e.id}`);
  visti.add(e.id);
  assert.ok(e.titolo, `${e.id}: serve un titolo`);
  // senza beats il proiettore legge la domanda: una slide muta non esiste
  assert.ok((e.beats && e.beats.length) || e.q, `${e.id}: serve beats o una domanda`);
  if (!e.votabile) continue;
  assert.ok(e.q, `${e.id}: un esempio votabile ha una domanda`);
  assert.ok(e.opzioni.length >= 2 && e.opzioni.length <= 4, `${e.id}: da 2 a 4 opzioni`);
  const tags = new Set(e.opzioni.map(o => o.tag));
  assert.equal(tags.size, e.opzioni.length, `${e.id}: tag duplicati`);
  for (const o of e.opzioni)
    assert.ok(o.label, `${e.id}/${o.tag}: serve una label`);
}
assert.ok(VOTABILI.length, "serve almeno un esempio votabile");
assert.equal(opzioni(ESEMPI.find(e => !e.votabile)), null, "un esempio non votabile non ha opzioni");

// ---- una serata intera ---------------------------------------------------
const s = new Session(io);
const [a, b, c] = ["sa", "sb", "sc"].map(id => s.addParticipant(null, socket(id)));
assert.equal(s.connectedCount(), 3);

s.start();
assert.equal(s.phase, "narrating");
assert.equal(s.chapter.id, ESEMPI[0].id);

// a e b votano la prima opzione, c l'ultima: c finisce sempre in minoranza
for (const e of ESEMPI) {
  assert.equal(s.chapter.id, e.id, `atteso esempio ${e.id}`);
  if (e.votabile) {
    s.openVote();
    assert.equal(s.phase, "voting");
    const opts = s.mainView().options;
    assert.ok(opts && opts.opts.length === e.opzioni.length, "il voto aperto porta tutte le opzioni");

    const primo = tagN(e, 0), ultimo = tagN(e, e.opzioni.length - 1);
    s.vote(a, primo); s.vote(b, primo); s.vote(c, ultimo);
    s.vote(c, primo); s.vote(c, ultimo);          // cambio idea: vale l'ultimo
    s.vote(a, "inesistente");                      // tag non dell'esempio: ignorato
    const t = s.tally();
    assert.equal(t.conteggi[primo], 2);
    assert.equal(t.conteggi[ultimo], 1);
    assert.equal(t.total, 3);
    assert.equal(Object.keys(t.conteggi).length, e.opzioni.length, "gli zeri restano in tabella");

    s.closeVote();
    assert.equal(s.phase, "revealing", `${e.id}: dopo la chiusura si rivela`);
    assert.equal(s.chapter.id, e.id, `${e.id}: la rivelazione resta sull'esempio`);
    const r = s.mainView().reveal;
    assert.equal(r.winner, primo);
    assert.deepEqual(r.conteggi, t.conteggi, "la forbice completa si vede sempre alla rivelazione");
    assert.ok(r.label, "serve l'opzione vinta");
    const vinta = e.opzioni.find(o => o.tag === primo);
    assert.equal(r.costo, vinta.costo_nascosto ?? null, "il costo nascosto c'è solo se scritto");
    assert.equal(r.chiusura, e.chiusura || null);
  } else {
    s.openVote();
    assert.equal(s.phase, "narrating", `${e.id}: non votabile, nessun voto si apre`);
    assert.equal(s.mainView().options, null);
  }
  s.skip();
}
assert.equal(s.phase, "ended");
const fine = s.mainView();
assert.equal(fine.chapter, null, "a serata finita non c'è un esempio corrente");
assert.equal(fine.aggregates.length, VOTABILI.length);
assert.deepEqual(fine.tally.conteggi, {}, "nessun esempio corrente, nessun conteggio");

// ---- finale personale ----------------------------------------------------
const pa = s.personalView(a), pc = s.personalView(c);
assert.equal(pa.voti_espressi, VOTABILI.length);
assert.equal(pa.voti_in_minoranza, 0);
assert.equal(pc.voti_in_minoranza, VOTABILI.length, "c ha perso tutte le volte");
assert.equal(pc.scelte.length, VOTABILI.length);
assert.ok(pc.scelte.every(x => x.scelta), "ogni scelta porta con sé la risposta, non il tag");
assert.ok(pc.scelte.every(x => x.vinse && x.vinse !== s.history.find(h => h.id === x.id).winner),
  "il telefono legge la risposta vinta, non il tag");

// ---- vittoria con N opzioni e pareggio -----------------------------------
const multi = VOTABILI.find(e => e.opzioni.length > 2);
assert.ok(multi, "serve un esempio con più di due opzioni per provare gli N");

const sn = new Session(io);
const votanti = ["v1", "v2", "v3", "v4"].map(id => sn.addParticipant(null, socket(id)));
sn.start();
sn.goto(multi.id);
sn.openVote();
// 1 sulla prima, 2 sulla terza: vince la terza, non la prima dell'elenco
sn.vote(votanti[0], tagN(multi, 0));
sn.vote(votanti[1], tagN(multi, 2));
sn.vote(votanti[2], tagN(multi, 2));
sn.closeVote();
assert.equal(sn.history.at(-1).winner, tagN(multi, 2), "vince il conteggio più alto, non l'ordine");

// pareggio esatto → vince il primo nell'ordine di `opzioni`
sn.reopenVote();
sn.vote(votanti[0], tagN(multi, 1));
sn.vote(votanti[1], tagN(multi, 2));
sn.closeVote();
assert.equal(sn.history.at(-1).winner, tagN(multi, 1), "a parità vince il primo nell'ordine");

// zero voti: la serata non si blocca, vince la prima opzione
sn.reopenVote();
sn.closeVote();
assert.equal(sn.history.at(-1).winner, tagN(multi, 0), "zero voti → prima opzione, e si va avanti");
assert.equal(sn.history.at(-1).conteggi[tagN(multi, 0)], 0, "vincere con zero resta zero in tabella");

// il regista forza comunque
sn.reopenVote();
sn.vote(votanti[0], tagN(multi, 0));
sn.closeVote(tagN(multi, 2));
assert.equal(sn.history.at(-1).winner, tagN(multi, 2), "l'esito forzato batte i conteggi");
assert.equal(sn.history.length, 1, "una riga per esempio, non cinque");

// ---- salto libero (§1.4) -------------------------------------------------
const sg = new Session(io);
sg.addParticipant(null, socket("s1"));
sg.start();
const ultimoId = ESEMPI.at(-1).id;
sg.goto(ultimoId);
assert.equal(sg.chapter.id, ultimoId, "si salta avanti");
assert.equal(sg.phase, "narrating");
sg.goto(ESEMPI[0].id);
assert.equal(sg.chapter.id, ESEMPI[0].id, "e anche indietro");
sg.goto("mai-esistito");
assert.equal(sg.chapter.id, ESEMPI[0].id, "un id sconosciuto non muove niente");

sg.openVote();
sg.goto(ultimoId);
assert.equal(sg.phase, "voting", "a voto aperto il salto si rifiuta");
assert.equal(sg.chapter.id, ESEMPI[0].id);
sg.closeVote();
sg.goto(ultimoId);
assert.equal(sg.chapter.id, ultimoId, "chiuso il voto, si salta");
assert.equal(sg.history.length, 1, "saltare non cancella i voti già dati");
const elenco = sg.directorView().esempi;
assert.equal(elenco.length, ESEMPI.length);
assert.equal(elenco[0].stato, "votato");
assert.equal(elenco[0].winner, sg.history[0].winner, "il cruscotto dice cosa ha vinto");
assert.ok(sg.history[0].winnerLabel, "e la riga porta anche la label leggibile");
assert.equal(elenco.at(-1).stato, "in corso");

// ---- chi entra a metà serata ---------------------------------------------
const s2 = new Session(io);
const early = s2.addParticipant(null, socket("s1"));
let tardi = null;
s2.start();
for (const e of VOTABILI) {
  s2.goto(e.id);
  s2.openVote();
  if (e.id === VOTABILI.at(-1).id) tardi = s2.addParticipant(null, socket("s2"));
  s2.vote(early, tagN(e, 0));
  if (tardi) s2.vote(tardi, tagN(e, 1));
  s2.closeVote();
}
const pt = s2.personalView(tardi);
assert.equal(pt.scelte.length, VOTABILI.length, "gli esempi già chiusi restano in elenco");
assert.equal(pt.voti_espressi, 1);
assert.equal(pt.scelte.filter(x => x.voto === null).length, VOTABILI.length - 1);

// ---- riapri voto: con lo stato derivato è un pop di history --------------
const s3 = new Session(io);
const solo = s3.addParticipant(null, socket("s1"));
s3.start();
const e0 = VOTABILI[0];
s3.goto(e0.id);
s3.openVote(); s3.vote(solo, tagN(e0, 1)); s3.closeVote();
assert.equal(s3.phase, "revealing");
s3.reopenVote();
assert.equal(s3.chapter.id, e0.id, "si torna all'esempio appena chiuso");
assert.equal(s3.phase, "voting");
assert.equal(s3.history.length, 0, "l'esito è stato annullato, non compensato");
assert.equal(s3.participants.get(solo).votes.size, 0, "e anche il voto personale");
s3.vote(solo, tagN(e0, 0)); s3.closeVote();
assert.equal(s3.history.at(-1).winner, tagN(e0, 0), "il nuovo esito sostituisce il vecchio");

// ---- forbice live: il gate di mostra_live --------------------------------
const s6 = new Session(io);
const occhi = s6.addParticipant(null, socket("s1"));
s6.start();
for (const e of VOTABILI) {
  s6.goto(e.id);
  s6.openVote();
  const primo = tagN(e, 0);
  s6.vote(occhi, primo);
  const sala = s6.mainView().tally, regia = s6.directorView().tally;
  assert.equal(regia.conteggi[primo], 1, `${e.id}: la regia vede sempre la forbice vera`);
  if (e.mostra_live) {
    assert.equal(sala.conteggi[primo], 1, `${e.id}: live acceso, la sala vede i numeri`);
    assert.equal(sala.live, true);
  } else {
    assert.equal(sala.conteggi[primo], null, `${e.id}: live spento, la sala NON vede da che parte`);
    assert.equal(sala.total, 1, "ma sa quanti hanno votato");
    assert.equal(sala.live, false);
  }
  s6.closeVote();
  assert.equal(s6.mainView().reveal.conteggi[primo], 1, `${e.id}: la forbice finale si vede comunque`);
}

// ---- timer: il voto si chiude da sé -------------------------------------
const s7 = new Session(io);
const tizio = s7.addParticipant(null, socket("s1"));
s7.start();
// durata reale = 60s: non aspettabile in un test. La si abbassa sull'esempio.
const primoVotabile = VOTABILI[0], durataVera = primoVotabile.durata_voto_sec;
primoVotabile.durata_voto_sec = 0.2;
s7.goto(primoVotabile.id);
s7.openVote();
assert.ok(s7.voteEndsAt, "il timer è armato");
const v = s7.mainView();
assert.ok(v.voteRestaMs > 0 && v.voteRestaMs <= 200, "la vista dice i ms residui, non un istante assoluto");
assert.equal(v.voteDurata, 0.2);
s7.vote(tizio, tagN(primoVotabile, 1));
await sleep(320);
assert.equal(s7.phase, "revealing", "scaduto il tempo, il voto si è chiuso da sé");
assert.equal(s7.history[0].winner, tagN(primoVotabile, 1), "il voto arrivato prima dello scadere conta");
assert.equal(s7.voteEndsAt, null, "chiuso il voto, il timer è spento");
assert.equal(s7.mainView().voteRestaMs, null);

// un timer vecchio non deve chiudere il voto successivo
primoVotabile.durata_voto_sec = durataVera;
s7.skip();
if (VOTABILI.length > 1) {
  s7.goto(VOTABILI[1].id);
  s7.openVote();                     // durata piena
  await sleep(320);
  assert.equal(s7.phase, "voting", "nessun timer scaduto ha toccato il voto successivo");
}

// riaprire un voto non riarma il timer: da lì decide il regista
const s8 = new Session(io);
s8.addParticipant(null, socket("s1"));
s8.start();
s8.goto(VOTABILI[0].id);
s8.openVote(); s8.closeVote();
s8.reopenVote();
assert.equal(s8.voteEndsAt, null, "riaperto a mano: nessuna chiusura automatica a sorpresa");

// durata 0 = chiude solo il regista
const s9 = new Session(io);
s9.addParticipant(null, socket("s1"));
s9.start();
const d0 = VOTABILI[0].durata_voto_sec;
VOTABILI[0].durata_voto_sec = 0;
s9.goto(VOTABILI[0].id);
s9.openVote();
assert.equal(s9.voteEndsAt, null, "durata 0 = nessun timer");
assert.equal(s9.phase, "voting");
VOTABILI[0].durata_voto_sec = d0;

// ---- accoglienza: resta solo il nome ------------------------------------
const sa = new Session(io);
const ada = sa.addParticipant(null, socket("s1"), { nome: "  Ada  " });
const anonimo = sa.addParticipant(null, socket("s2"));
const bruto = sa.addParticipant(null, socket("s3"), { nome: "x".repeat(60) });
assert.equal(sa.participants.get(ada).nome, "Ada", "il nome si ripulisce agli estremi");
assert.equal(sa.participants.get(anonimo).nome, null);
assert.equal(sa.participants.get(bruto).nome.length, 30, "il nome è tagliato a 30 caratteri");
assert.equal(sa.directorView().conNome, 2);
// reconnect: stesso cid, il nome e i voti restano
sa.addParticipant(ada, socket("s1-bis"));
assert.equal(sa.participants.get(ada).nome, "Ada", "chi rientra non perde il nome");

// ---- ogni esempio, in ogni fase, produce viste che non esplodono ---------
const s5 = new Session(io);
s5.addParticipant(null, socket("s1"));
s5.start();
for (let i = 0; i < ESEMPI.length; i++) {
  s5.mainView(); s5.directorView(); s5.deviceViewGeneric();
  if (s5.chapter.votabile) { s5.openVote(); s5.mainView(); s5.closeVote(); s5.mainView(); s5.directorView(); }
  s5.skip();
}
assert.equal(s5.phase, "ended");
s5.mainView(); s5.directorView();

// ---- chat: la validazione è a un confine di fiducia (§2.3) ---------------
// io che REGISTRA: senza, "il messaggio è arrivato sul proiettore" non è
// verificabile, ed è l'unica cosa che conta di tutto il blocco.
const emessi = [];
const ioSpia = { to: (room) => ({ emit: (ev, payload) => emessi.push({ room, ev, payload }) }) };
const sc = new Session(ioSpia);
const cAda = sc.addParticipant(null, socket("c1"), { nome: "Ada" });
const cBruno = sc.addParticipant(null, socket("c2"), { nome: "Bruno" });
const cMuto = sc.addParticipant(null, socket("c3"), { nome: "Muto" });
const cSenza = sc.addParticipant(null, socket("c4"));

assert.equal(sc.chat(cAda, "ciao").motivo, "chiuso", "fuori dal voto non si scrive");
sc.start();
sc.goto(VOTABILI[0].id);
assert.equal(sc.chat(cAda, "ciao").motivo, "chiuso", "nemmeno mentre si legge l'esempio");
sc.openVote();

assert.equal(sc.chat(cAda, "   ").motivo, "vuoto");
assert.equal(sc.chat(cSenza, "eccomi").motivo, "senza nome", "nessun anonimo a schermo");
assert.equal(sc.chat("mai-visto", "eccomi").motivo, "chiuso", "un cid sconosciuto non scrive");

const primo = sc.chat(cAda, "  Il margine dove finisce?  ");
assert.equal(primo.ok, true);
assert.equal(sc.coda.length, 1);
assert.equal(sc.coda[0].testo, "Il margine dove finisce?", "il testo si ripulisce agli estremi");
assert.equal(sc.coda[0].nome, "Ada", "il messaggio è firmato dall'accoglienza");

assert.equal(sc.chat(cAda, "e subito un altro").motivo, "aspetta", "cooldown tra due messaggi");
sc.ultimoMsg.set(cAda, 0);                       // il cooldown è passato
assert.equal(sc.chat(cAda, "secondo").ok, true);
sc.ultimoMsg.set(cAda, 0);
assert.equal(sc.chat(cAda, "terzo").motivo, "aspetta", `max ${CHAT.maxInCoda} in coda per partecipante`);

const lungo = sc.chat(cBruno, "x".repeat(500));
assert.equal(lungo.ok, true, "un messaggio lungo si tronca, non si rifiuta");
assert.equal(sc.coda.find(m => m.id === lungo.id).testo.length, CHAT.maxChars);

// silenziato: non scrive più, e quello che aveva in coda sparisce
sc.ultimoMsg.set(cMuto, 0);
const suo = sc.chat(cMuto, "sempre io");
assert.equal(suo.ok, true);
sc.chatMute(cMuto);
assert.equal(sc.coda.some(m => m.cid === cMuto), false, "silenziare svuota anche la sua coda");
sc.ultimoMsg.set(cMuto, 0);
assert.equal(sc.chat(cMuto, "e invece").motivo, "silenziato");
assert.deepEqual(emessi.filter(v => v.ev === "device:chatState" && v.payload.id === suo.id).map(v => v.payload.stato),
  ["rifiutato"], "e il mittente lo viene a sapere");

// approvazione: è l'unica strada verso il proiettore
const primaDi = emessi.filter(v => v.ev === "main:chat").length;
sc.chatApprove(primo.id);
const usciti = emessi.filter(v => v.ev === "main:chat");
assert.equal(usciti.length, primaDi + 1, "approvare manda il messaggio in sala");
assert.equal(usciti.at(-1).room, "main");
assert.deepEqual(usciti.at(-1).payload, { id: primo.id, nome: "Ada", testo: "Il margine dove finisce?" });
assert.equal(sc.coda.some(m => m.id === primo.id), false, "e lo toglie dalla coda");
assert.equal(emessi.filter(v => v.ev === "device:chatState" && v.payload.id === primo.id).at(-1).payload.stato, "pubblicato");

sc.chatApprove(primo.id);
assert.equal(emessi.filter(v => v.ev === "main:chat").length, usciti.length, "approvare due volte non raddoppia");
sc.chatApprove("999");
assert.equal(emessi.filter(v => v.ev === "main:chat").length, usciti.length, "un id inventato non pubblica niente");

const daScartare = sc.coda[0].id;
sc.chatReject(daScartare);
assert.equal(sc.coda.some(m => m.id === daScartare), false);
assert.equal(emessi.filter(v => v.ev === "main:chat").length, usciti.length, "scartare non manda niente in sala");

sc.chatClear();
assert.equal(sc.coda.length, 0, "la coda si svuota");
assert.equal(sc.directorView().chatCoda, 0);

// Un cid che il server non conosce più (riavvio, o reset della regia) deve
// poter rientrare col nome e tornare a scrivere: è il caso che in sala capita
// col telefono che si era bloccato, e senza questo resta muto per sempre.
sc.reset(false);
sc.addParticipant(cAda, socket("c1"), { nome: "Ada" });
sc.start(); sc.goto(VOTABILI[0].id); sc.openVote();
assert.equal(sc.chat(cAda, "rieccomi").ok, true, "rientrando col nome si torna a scrivere");
sc.coda = []; sc.ultimoMsg.clear();

// chiuso il voto la casella sparisce dal telefono
assert.equal(sc.deviceViewGeneric().chat, true);
sc.closeVote();
assert.equal(sc.deviceViewGeneric().chat, false, "a voto chiuso non si scrive più");
assert.equal(sc.chat(cBruno, "ancora?").motivo, "chiuso");

// reset: la serata riparte pulita, muti compresi
sc.reset(false);
assert.equal(sc.coda.length, 0);
assert.equal(sc.muti.size, 0, "il reset ridà la parola a tutti");

console.log("OK — serata, N opzioni, pareggio, salto libero, riapertura, forbice mascherata, timer, accoglienza finale personale e chat moderata.");
