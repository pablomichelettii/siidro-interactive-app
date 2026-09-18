// ==========================================================================
// SESSION — stato autorevole in memoria. Un processo = una sala.
// Non accumula niente: tiene `history` (un vincitore per esempio) e i voti di
// ciascuno, e ricava tutto il resto a ogni vista.
//
// Nessun DB, niente a disco: nome e voti muoiono col processo.
// ==========================================================================

import { randomUUID } from "node:crypto";
import { ESEMPI } from "./content.js";

export const VOTABILI = ESEMPI.filter(e => e.votabile);
export const BIVI = VOTABILI.length;

// ---- chat (§2) ------------------------------------------------------------
// Manopole d'ambiente: un istituto che non vuole la chat spegne CHAT_ATTIVA=0
// e sparisce ovunque, senza toccare il codice.
export const CHAT = {
  attiva: process.env.CHAT_ATTIVA !== "0",
  maxChars: +(process.env.CHAT_MAX_CHARS || 140),
  cooldownMs: +(process.env.CHAT_COOLDOWN_MS || 5000),
  maxInCoda: +(process.env.CHAT_MAX_IN_CODA || 2),
  bollaMs: +(process.env.CHAT_BOLLA_MS || 12000)
};
// Tetto duro sulla coda: oltre, il regista non ce la fa più a moderare e la
// memoria cresce senza motivo. Non è una manopola, è una diga.
const CHAT_CODA_MAX = 200;

// Le opzioni di un esempio, nella forma che va in vista. Da 2 a 4, i tag li
// decide il contenuto: qui non si sa e non si deve sapere quali sono.
export function opzioni(ch) {
  if (!ch || !ch.votabile) return null;
  return { q: ch.q, opts: ch.opzioni };
}

export class Session {
  constructor(io) {
    this.io = io;
    this.reset(false);
  }

  reset(broadcast = true) {
    this.phase = "lobby";               // lobby | narrating | voting | revealing | ended
    this.chapterIndex = 0;
    this.participants = new Map();       // cid -> { votes: Map<id,tag>, socketId, connected, nome }
    this.currentVotes = new Map();       // cid -> tag  (solo voto aperto)
    this.history = [];                   // [{ id, titolo, conteggi: {tag:n}, winner }]
    this.coda = [];                      // coda di approvazione: [{ id, cid, nome, testo, ts }]
    this.muti = new Set();               // cid silenziati per il resto della serata
    this.ultimoMsg = new Map();          // cid -> ts dell'ultimo messaggio accettato
    this.chatSeq = 0;
    this.stopTimer();
    // Il reset cancella i partecipanti: i telefoni collegati devono rifarsi vivi
    // col nome, o restano senza e non possono più né essere contati né firmare.
    if (broadcast) { this.io.to("devices").emit("device:rientra"); this.broadcast(); }
  }

  // Il timer del voto è UNO. Va spento a ogni uscita dalla fase di voto, o un
  // timer vecchio chiude anzitempo il voto successivo.
  stopTimer() {
    clearTimeout(this.voteTimer);
    this.voteTimer = null;
    this.voteEndsAt = null;
  }

  get chapter() { return ESEMPI[this.chapterIndex]; }

  // ---- partecipanti -------------------------------------------------------
  // `dati` = { nome } dall'accoglienza. Chi rientra con un cid conosciuto non
  // lo rimanda: resta quello di prima.
  addParticipant(cid, socket, dati) {
    if (!cid) cid = randomUUID();
    let p = this.participants.get(cid);
    if (!p) {
      p = { votes: new Map(), socketId: socket.id, connected: true, nome: null };
      this.participants.set(cid, p);
    } else {
      p.socketId = socket.id;           // reconnect: stesso cid, ripristina i voti
      p.connected = true;
    }
    if (dati) {
      const nome = String(dati.nome || "").trim().slice(0, 30);   // max 30 caratteri
      if (nome) p.nome = nome;
    }
    socket.data.cid = cid;
    socket.join("devices");
    this.io.to("main").emit("main:participant", { cid, action: "join", connected: this.connectedCount() });
    this.io.to("director").emit("director:sync", this.directorView());
    return cid;
  }

  markDisconnected(cid) {
    const p = this.participants.get(cid);
    if (!p) return;
    p.connected = false;                 // i voti restano, per un eventuale reconnect
    this.io.to("main").emit("main:participant", { cid, action: "leave", connected: this.connectedCount() });
    this.io.to("director").emit("director:sync", this.directorView());
  }

  connectedCount() {
    let n = 0;
    for (const p of this.participants.values()) if (p.connected) n++;
    return n;
  }

  // ---- comandi regista ----------------------------------------------------
  start() {
    if (this.phase !== "lobby") return;
    this.phase = "narrating";
    this.chapterIndex = 0;
    this.broadcast();
  }

  openVote() {
    if (this.phase !== "narrating" || !this.chapter || !this.chapter.votabile) return;
    this.phase = "voting";
    this.currentVotes.clear();
    // Timer server-side: la serata avanza anche se il cruscotto cade.
    // durata 0 = nessun timer, chiude solo il regista.
    const sec = this.chapter.durata_voto_sec || 0;
    this.stopTimer();
    if (sec > 0) {
      this.voteEndsAt = Date.now() + sec * 1000;
      this.voteTimer = setTimeout(() => this.closeVote(), sec * 1000);
      this.voteTimer.unref?.();          // non tenere vivo il processo per un timer
    }
    this.broadcast();
  }

  vote(cid, option) {
    if (this.phase !== "voting" || !cid) return;
    if (!this.chapter.opzioni.some(o => o.tag === option)) return;
    this.currentVotes.set(cid, option);   // last-write-wins su (sessione, esempio)
    this.io.to("main").emit("main:particle", { cid, tag: option });
    // la sala vede la forbice solo dove l'esempio lo prevede; la regia sempre
    this.io.to("main").emit("main:tally", this.tallyPerSala());
    this.io.to("director").emit("director:tally", this.tally());
  }

  closeVote(forcedWinner) {
    if (this.phase !== "voting") return;
    this.stopTimer();
    const ch = this.chapter;
    const { conteggi } = this.tally();
    const winner = forcedWinner || vincitore(ch.opzioni, conteggi);
    // la label viaggia con la riga di history: sul proiettore e sul telefono si
    // legge la risposta, non il tag — che è un'etichetta per il codice
    const vinta = ch.opzioni.find(o => o.tag === winner);

    for (const [cid, tag] of this.currentVotes) {
      const p = this.participants.get(cid);
      if (p) p.votes.set(ch.id, tag);
    }

    this.history.push({ id: ch.id, titolo: ch.titolo, conteggi, winner, winnerLabel: vinta ? vinta.label : winner });
    this.currentVotes.clear();

    // NON si avanza: l'esempio resta a schermo e mostra cosa ha scelto la sala.
    this.phase = "revealing";
    this.broadcast();
  }

  // Riapre il voto appena chiuso: con lo stato derivato basta togliere la riga
  // di history. Funziona sia dalla rivelazione (stesso esempio) sia dopo che
  // il regista è già andato avanti (torna indietro di uno).
  reopenVote() {
    if (!this.history.length) return;
    const last = this.history.pop();
    this.chapterIndex = ESEMPI.findIndex(e => e.id === last.id);
    for (const p of this.participants.values()) p.votes.delete(last.id);
    this.phase = "voting";
    this.currentVotes.clear();
    // riaperto a mano: nessun timer, lo richiude il regista quando vuole
    this.stopTimer();
    this.broadcast();
  }

  // Salto libero: gli esempi sono autonomi, l'ordine dell'array è solo il
  // default. Non tocca la history: se si torna su un esempio già votato, quel
  // voto resta registrato (per rifarlo c'è reopenVote).
  goto(id) {
    // a voto aperto no: saltare via lascia i telefoni con dei bottoni che non
    // contano più, e nessuno a dirglielo
    if (this.phase === "voting") return;
    const i = ESEMPI.findIndex(e => e.id === id);
    if (i < 0) return;
    this.chapterIndex = i;
    this.phase = "narrating";
    this.broadcast();
  }

  // Avanti: chiude la rivelazione, o passa un esempio che non si vota.
  skip() {
    if (this.phase !== "narrating" && this.phase !== "revealing") return;
    this.advance();
  }

  advance() {
    this.chapterIndex++;
    if (!this.chapter) this.endGame();
    else { this.phase = "narrating"; this.broadcast(); }
  }

  endGame() {
    this.phase = "ended";
    this.broadcast();
  }

  // ---- chat (§2) ----------------------------------------------------------
  // Novanta telefoni che scrivono su un proiettore: i controlli stanno QUI,
  // qualunque cosa faccia il client. Niente filtro parolacce — c'è un umano che
  // approva, ed è più bravo di qualunque lista.
  chat(cid, testo) {
    if (!CHAT.attiva) return { ok: false, motivo: "chiusa" };
    if (this.phase !== "voting") return { ok: false, motivo: "chiuso" };
    if (this.muti.has(cid)) return { ok: false, motivo: "silenziato" };
    const p = this.participants.get(cid);
    if (!p) return { ok: false, motivo: "chiuso" };
    // nessun anonimo: il messaggio va a schermo firmato, o non ci va
    if (!p.nome) return { ok: false, motivo: "senza nome" };

    const t = String(testo ?? "").trim().slice(0, CHAT.maxChars);   // si tronca, non si rifiuta
    if (!t) return { ok: false, motivo: "vuoto" };
    if (this.coda.length >= CHAT_CODA_MAX) return { ok: false, motivo: "coda piena" };

    const ora = Date.now();
    if (ora - (this.ultimoMsg.get(cid) || 0) < CHAT.cooldownMs) return { ok: false, motivo: "aspetta" };
    if (this.coda.filter(m => m.cid === cid).length >= CHAT.maxInCoda) return { ok: false, motivo: "aspetta" };

    this.ultimoMsg.set(cid, ora);
    const m = { id: String(++this.chatSeq), cid, nome: p.nome, testo: t, ts: ora };
    this.coda.push(m);
    this.inviaCoda();
    return { ok: true, id: m.id };
  }

  chatApprove(id) {
    const m = this.togliDallaCoda(id);
    if (!m) return;
    this.io.to("main").emit("main:chat", { id: m.id, nome: m.nome, testo: m.testo });
    this.statoAlMittente(m, "pubblicato");
    this.inviaCoda();
  }

  chatReject(id) {
    const m = this.togliDallaCoda(id);
    if (!m) return;
    this.statoAlMittente(m, "rifiutato");
    this.inviaCoda();
  }

  // Silenziare toglie anche quello che ha già in coda: pubblicarlo dopo averlo
  // zittito è esattamente il contrario di quello che il regista ha chiesto.
  chatMute(cid) {
    if (!cid) return;
    this.muti.add(cid);
    for (const m of this.coda.filter(x => x.cid === cid)) this.statoAlMittente(m, "rifiutato");
    this.coda = this.coda.filter(m => m.cid !== cid);
    this.inviaCoda();
  }

  chatClear() {
    for (const m of this.coda) this.statoAlMittente(m, "rifiutato");
    this.coda = [];
    this.inviaCoda();
  }

  togliDallaCoda(id) {
    const i = this.coda.findIndex(m => m.id === String(id));
    return i < 0 ? null : this.coda.splice(i, 1)[0];
  }

  // Il mittente deve sapere che fine ha fatto il suo messaggio, o lo riscrive.
  statoAlMittente(m, stato) {
    const p = this.participants.get(m.cid);
    if (p && p.socketId) this.io.to(p.socketId).emit("device:chatState", { id: m.id, stato });
  }

  inviaCoda() {
    this.io.to("director").emit("director:chatQueue", this.coda);
    this.io.to("director").emit("director:sync", this.directorView());
  }

  // ---- conteggi -----------------------------------------------------------
  // Un contatore per tag dell'esempio corrente, zero inclusi: la vista deve
  // poter disegnare tutti i poli, anche quelli che nessuno ha scelto.
  tally() {
    const conteggi = {};
    for (const o of this.chapter?.opzioni ?? []) conteggi[o.tag] = 0;
    let total = 0;
    for (const tag of this.currentVotes.values())
      if (tag in conteggi) { conteggi[tag]++; total++; }
    return { conteggi, total, connected: this.connectedCount() };
  }

  // Quello che può vedere la SALA. A live spento sa quanti hanno votato ma non
  // da che parte: senza i numeri la cascata informativa non parte, e la
  // forbice si rivela alla chiusura.
  tallyPerSala() {
    const t = this.tally();
    if (this.chapter && this.chapter.mostra_live) return { ...t, live: true };
    return { ...t, conteggi: mappaANull(t.conteggi), live: false };
  }

  // ---- viste per ruolo ----------------------------------------------------
  mainView() {
    const ch = this.chapter;
    return {
      phase: this.phase,
      index: this.chapterIndex,
      bivi: BIVI,
      connected: this.connectedCount(),
      participants: [...this.participants.keys()],
      chapter: ch ? {
        id: ch.id, occhiello: ch.occhiello, titolo: ch.titolo,
        beats: ch.beats || null,
        q: ch.q || null,               // senza beats il proiettore legge la domanda
        votabile: !!ch.votabile,
        mostra_live: !!ch.mostra_live
      } : null,
      options: this.phase === "voting" ? opzioni(ch) : null,
      // ms residui, non un istante assoluto: il client conta da quando riceve,
      // così l'orologio del browser fuori sincrono non sposta il countdown
      voteRestaMs: this.voteEndsAt ? Math.max(0, this.voteEndsAt - Date.now()) : null,
      voteDurata: ch && ch.votabile ? ch.durata_voto_sec : null,
      reveal: this.phase === "revealing" ? this.revealView() : null,
      tally: this.tallyPerSala(),
      aggregates: this.phase === "ended" ? this.history : null,
      chatAttiva: CHAT.attiva,
      chatBollaMs: CHAT.bollaMs
    };
  }

  // Cosa ha scelto la sala nel voto appena chiuso: l'opzione vinta, il suo
  // costo nascosto, la forbice completa — che si mostra sempre qui, anche dove
  // era spenta in diretta — e la chiusura scritta, se c'è.
  revealView() {
    const ultimo = this.history[this.history.length - 1];
    if (!ultimo) return null;
    const ch = ESEMPI.find(e => e.id === ultimo.id);
    const scelta = ch.opzioni.find(o => o.tag === ultimo.winner);
    return {
      winner: ultimo.winner,
      label: scelta ? scelta.label : null,
      costo: scelta ? scelta.costo_nascosto : null,
      conteggi: ultimo.conteggi,
      opts: ch.opzioni,
      chiusura: ch.chiusura || null
    };
  }

  directorView() {
    const prox = ESEMPI[this.chapterIndex + 1];
    return {
      ...this.mainView(),
      tally: this.tally(),               // la regia vede sempre la forbice vera
      nota: this.chapter?.nota || null,  // la lettura della risposta: non si proietta
      // l'elenco completo, per sapere dove si è e cosa manca
      esempi: ESEMPI.map((e, i) => {
        const fatto = this.history.find(h => h.id === e.id);
        return {
          id: e.id, titolo: e.titolo, votabile: !!e.votabile,
          stato: i === this.chapterIndex ? "in corso" : fatto ? "votato" : "da fare",
          winner: fatto ? fatto.winner : null
        };
      }),
      prossimo: prox ? { id: prox.id, occhiello: prox.occhiello, titolo: prox.titolo, votabile: !!prox.votabile } : null,
      puoRiaprire: this.history.length > 0,
      chatAttiva: CHAT.attiva,
      chatCoda: this.coda.length,        // sempre visibile, anche a card chiusa
      muti: this.muti.size,
      // quanti hanno lasciato un nome: senza, in chat non si firma niente
      conNome: [...this.participants.values()].filter(p => p.nome).length
    };
  }

  deviceViewGeneric() {
    return {
      phase: this.phase,
      options: this.phase === "voting" ? opzioni(this.chapter) : null,
      // la casella compare con le opzioni e sparisce alla chiusura del voto
      chat: CHAT.attiva && this.phase === "voting",
      chatMaxChars: CHAT.maxChars,
      // «si può cambiare idea fino allo scadere» vuole che si sappia quando scade
      voteRestaMs: this.voteEndsAt ? Math.max(0, this.voteEndsAt - Date.now()) : null,
      voteDurata: this.chapter && this.chapter.votabile ? this.chapter.durata_voto_sec : null
    };
  }

  // Il finale personale: cosa ha scelto questo telefono, e cosa la sala.
  personalView(cid) {
    const p = this.participants.get(cid);
    if (!p) return null;
    const scelte = [];
    let minoranza = 0;
    // Ogni scelta porta con sé l'esempio, cosa ha scelto DAVVERO e cosa
    // costava: un `deepfake: denuncio` non dice niente a chi lo rilegge.
    for (const h of this.history) {
      const voto = p.votes.get(h.id) || null;
      const ch = ESEMPI.find(e => e.id === h.id);
      const opt = voto ? ch.opzioni.find(o => o.tag === voto) : null;
      scelte.push({
        id: h.id, occhiello: ch.occhiello, titolo: ch.titolo,
        voto,
        scelta: opt ? opt.label : null,
        costo: opt ? opt.costo_nascosto : null,
        vinse: h.winnerLabel,
        minoranza: !!voto && voto !== h.winner
      });
      if (voto && voto !== h.winner) minoranza++;
    }
    return {
      nome: p.nome,
      scelte,
      voti_espressi: scelte.filter(s => s.voto).length,
      voti_in_minoranza: minoranza
    };
  }

  // ---- broadcast ----------------------------------------------------------
  broadcast() {
    this.io.to("main").emit("main:sync", this.mainView());
    this.io.to("director").emit("director:sync", this.directorView());
    if (this.phase === "ended") {
      // personale per-socket (diverso per ognuno)
      for (const [cid, p] of this.participants) {
        if (p.socketId) this.io.to(p.socketId).emit("device:sync", { phase: this.phase, options: null, ended: this.personalView(cid) });
      }
    } else {
      this.io.to("devices").emit("device:sync", this.deviceViewGeneric());
    }
  }
}

// Vince il tag col conteggio più alto. A parità — e a zero voti — vince il
// primo nell'ordine di `opzioni`: con quattro opzioni i pareggi smettono di
// essere rari, e la regola dev'essere una sola, scritta e prevedibile.
// Il regista può sempre forzare: closeVote({ option: tag }).
function vincitore(opts, conteggi) {
  return opts.reduce((best, o) => conteggi[o.tag] > conteggi[best.tag] ? o : best, opts[0]).tag;
}

const mappaANull = (o) => Object.fromEntries(Object.keys(o).map(k => [k, null]));
