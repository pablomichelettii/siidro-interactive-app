// ==========================================================================
// SESSION — stato autorevole in memoria. Un processo = una sala.
// Non accumula niente: tiene `history` (un vincitore per capitolo) e i voti
// di ciascuno, e ricava tutto il resto con derive() a ogni vista.
//
// Nessun DB. In memoria stanno anche nome e data di nascita, che servono
// all'epilogo individuale: la data di nascita muore col processo, il nome
// finisce a disco solo dentro l'epilogo salvato (vedi epilogo.js).
// ==========================================================================

import { randomUUID } from "node:crypto";
import {
  CHAPTERS, BIVI, START_DATE, REF_2040, derive, esitiVisibili, contaParziali,
  testoOracolo, opzioni, banda, chiudeA, apreA, componiScenario,
  etaAl, formattaEta, isDataValida
} from "./engine.js";
import { generaTutti, salva, modelloConfigurato } from "./epilogo.js";

// Il modello scrive i segnaposto; qui si riempiono. Il nome non è mai entrato
// nella chiamata al modello, che è il punto (Patch §8.4).
const PER_N = new Map(CHAPTERS.map(c => [c.n, c]));

const interpola = (testo, nome, eta) =>
  String(testo).replaceAll("{NOME}", nome || "Tu").replaceAll("{ETA}", eta || "l'età che avrai");

export class Session {
  constructor(io) {
    this.io = io;
    this.reset(false);
  }

  reset(broadcast = true) {
    this.phase = "lobby";               // lobby | narrating | voting | revealing | ended
    this.chapterIndex = 0;
    this.participants = new Map();       // cid -> { votes: Map<n,tag>, socketId, connected }
    this.currentVotes = new Map();       // cid -> tag  (solo bivio aperto)
    this.history = [];                   // [{ n, id, anno, titolo, facile, difficile, winner }]
    this.epiloghiRivelati = false;       // il regista decide quando accendere i telefoni
    this.generazione = null;             // { totale, fatti, finita } durante il capitolo 13
    this.stopTimer();
    if (broadcast) this.broadcast();
  }

  // Il timer del voto è UNO. Va spento a ogni uscita dalla fase di voto, o un
  // timer vecchio chiude anzitempo il bivio successivo.
  stopTimer() {
    clearTimeout(this.voteTimer);
    this.voteTimer = null;
    this.voteEndsAt = null;
  }

  get chapter() { return CHAPTERS[this.chapterIndex]; }
  get world() { return derive(this.history); }

  // ---- partecipanti -------------------------------------------------------
  // `dati` = { nome, data_nascita } dall'accoglienza (Patch §8.1). Chi rientra
  // con un cid conosciuto non li rimanda: restano quelli di prima.
  addParticipant(cid, socket, dati) {
    if (!cid) cid = randomUUID();
    let p = this.participants.get(cid);
    if (!p) {
      p = { votes: new Map(), socketId: socket.id, connected: true, nome: null, nascita: null, eta: null };
      this.participants.set(cid, p);
    } else {
      p.socketId = socket.id;           // reconnect: stesso cid, ripristina i voti
      p.connected = true;
    }
    if (dati) {
      const nome = String(dati.nome || "").trim().slice(0, 30);   // max 30 caratteri (§8.1)
      if (nome) p.nome = nome;
      if (isDataValida(dati.data_nascita)) {
        p.nascita = dati.data_nascita;
        p.eta = formattaEta(etaAl(p.nascita, REF_2040));
      }
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
    // Timer server-side: la serata avanza anche se il cruscotto cade (§9).
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
    if (option !== "facile" && option !== "difficile") return;
    this.currentVotes.set(cid, option);   // last-write-wins su (sessione, capitolo)
    this.io.to("main").emit("main:particle", { cid, tag: option });
    // la sala vede la forbice solo dove il capitolo lo prevede; la regia sempre
    this.io.to("main").emit("main:tally", this.tallyPerSala());
    this.io.to("director").emit("director:tally", this.tally());
  }

  closeVote(forcedWinner) {
    if (this.phase !== "voting") return;
    this.stopTimer();
    const ch = this.chapter;
    const t = this.tally();
    // Pareggio esatto e zero voti → "facile": la comodità che passa per inerzia
    // è anche coerente col tema. Il regista può sempre forzare (Patch §5).
    const winner = forcedWinner
      || (t.difficile > t.facile ? "difficile" : "facile");

    for (const [cid, tag] of this.currentVotes) {
      const p = this.participants.get(cid);
      if (p) p.votes.set(ch.n, tag);
    }

    this.history.push({ n: ch.n, id: ch.id, anno: ch.anno, titolo: ch.titolo, facile: t.facile, difficile: t.difficile, winner });
    this.currentVotes.clear();

    // NON si avanza: il capitolo resta a schermo e mostra il suo esito. Se
    // avanzassimo subito, l'interludio dei giorni si infilerebbe tra il voto e
    // la sua conseguenza — e l'esito va mostrato lì, non a fine serata (§4.3).
    this.phase = "revealing";
    this.broadcast();

    // Chiuso il 12, tutti i dati sono definitivi: parte la generazione, che ha
    // i 9 minuti del capitolo 13 per finire (§8.4). Non si aspetta.
    if (ch.n === 12) this.generazionePromise = this.generaEpiloghi();
  }

  // ---- epiloghi individuali (Patch §8) ------------------------------------
  async generaEpiloghi() {
    if (this.generazione) return;
    const lista = [...this.participants.keys()].map(cid => ({ cid, dati: this.personalView(cid) }));
    this.generazione = { totale: lista.length, fatti: 0, finita: false, modello: modelloConfigurato() };
    this.io.to("director").emit("director:sync", this.directorView());

    // Ogni epilogo si assegna e si salva appena è pronto, uno alla volta.
    // Salvarli tutti alla fine significa che un processo che muore al minuto
    // otto dei nove butta via anche i settanta già generati.
    await generaTutti(lista, async (cid, ris, fatti) => {
      const p = this.participants.get(cid);
      if (p) {
        p.epilogo = { ...ris, testo: interpola(ris.testo, p.nome, p.eta) };
        // il link che permette di rileggerlo nei giorni successivi (§8.5)
        try { p.token = await salva({ nome: p.nome, eta: p.eta, testo: p.epilogo.testo }); }
        catch (e) { console.error("epilogo non salvato:", e.message); }
      }
      this.generazione.fatti = fatti;
      this.io.to("director").emit("director:sync", this.directorView());
    });
    this.generazione.finita = true;
    this.broadcast();
  }

  // Il comando che accende novanta schermi insieme (§8.5).
  rivelaEpiloghi() {
    if (this.epiloghiRivelati) return;
    this.epiloghiRivelati = true;
    this.broadcast();
  }

  // Riapre il voto appena chiuso: con lo stato derivato basta togliere la riga
  // di history. Funziona sia dalla rivelazione (stesso capitolo) sia dopo che
  // il regista è già andato avanti (torna indietro di uno).
  reopenVote() {
    if (!this.history.length) return;
    const last = this.history.pop();
    this.chapterIndex = CHAPTERS.findIndex(c => c.n === last.n);
    for (const p of this.participants.values()) p.votes.delete(last.n);
    this.phase = "voting";
    this.currentVotes.clear();
    // riaperto a mano: nessun timer, lo richiude il regista quando vuole
    this.stopTimer();
    this.broadcast();
  }

  // Avanti: chiude la rivelazione, o passa un capitolo che non si vota
  // (il 13 e il 14), o recupera il regista da un capitolo saltato.
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

  // ---- conteggi -----------------------------------------------------------
  tally() {
    let facile = 0, difficile = 0;
    for (const tag of this.currentVotes.values()) {
      if (tag === "facile") facile++; else if (tag === "difficile") difficile++;
    }
    return { facile, difficile, total: facile + difficile, connected: this.connectedCount() };
  }

  // Quello che può vedere la SALA. A live spento sa quanti hanno votato ma non
  // da che parte: senza i due numeri la cascata informativa non parte, e la
  // forbice si rivela alla chiusura (§2.3, e Criticità 2 della trama).
  tallyPerSala() {
    const t = this.tally();
    if (this.chapter && this.chapter.mostra_live) return { ...t, live: true };
    return { facile: null, difficile: null, total: t.total, connected: t.connected, live: false };
  }

  // ---- viste per ruolo ----------------------------------------------------
  mainView() {
    const ch = this.chapter;
    const w = this.world;
    const n = ch ? ch.n : 14;
    return {
      phase: this.phase,
      index: this.chapterIndex,
      bivi: BIVI,
      connected: this.connectedCount(),
      participants: [...this.participants.keys()],
      startDate: START_DATE,
      endDate: CHAPTERS[CHAPTERS.length - 1].data,
      prevDate: this.chapterIndex > 0 ? CHAPTERS[this.chapterIndex - 1].data : START_DATE,
      chapter: ch ? {
        n: ch.n, anno: ch.anno, titolo: ch.titolo, data: ch.data, ruolo: ch.ruolo,
        beats: ch.beats || null,
        votabile: !!ch.votabile,
        mostra_live: !!ch.mostra_live,
        // il capitolo 12 mostra la variante determinata da I5
        oracolo: ch.id === "oracolo" ? testoOracolo(w.intrecci) : null
      } : null,
      options: this.phase === "voting" ? opzioni(ch) : null,
      // ms residui, non un istante assoluto: il client conta da quando riceve,
      // così l'orologio del browser fuori sincrono non sposta il countdown
      voteRestaMs: this.voteEndsAt ? Math.max(0, this.voteEndsAt - Date.now()) : null,
      voteDurata: ch && ch.votabile ? ch.durata_voto_sec : null,
      reveal: this.phase === "revealing" ? this.revealView(w) : null,
      indice: w.indice,
      banda: w.banda,
      climax: w.climax,          // letto dal capitolo 13 e dalla schermata finale
      esiti: esitiVisibili(w.intrecci, n),
      // Lo scenario globale vive nel capitolo 14 — è quello il capitolo che
      // compone — e resta sulla schermata finale, così è consultabile dopo.
      scenario: (ch && ch.n === 14) || this.phase === "ended" ? componiScenario(w.intrecci) : null,
      parziali: contaParziali(w.intrecci),
      tally: this.tallyPerSala(),
      aggregates: this.phase === "ended" ? this.history : null,
      consensus: this.phase === "ended" ? this.consensusCount() : null
    };
  }

  // Cosa ha scelto la sala nel voto appena chiuso, e — se questo capitolo
  // chiudeva un intreccio — l'esito che si è saldato, col nome da annunciare.
  // La forbice finale si mostra sempre qui, anche dove era spenta in diretta.
  revealView(w) {
    const ultimo = this.history[this.history.length - 1];
    if (!ultimo) return null;
    const ch = CHAPTERS.find(c => c.n === ultimo.n);
    const scelta = ultimo.winner === "facile" ? ch.opzione_facile : ch.opzione_difficile;
    const it = chiudeA(ultimo.n);
    const stato = it ? w.intrecci[it.id] : null;
    return {
      winner: ultimo.winner,
      label: scelta.label,
      costo: scelta.costo_nascosto,
      facile: ultimo.facile,
      difficile: ultimo.difficile,
      // niente esito su un capitolo che non chiude niente: la maggior parte
      // dei capitoli pianta e non raccoglie
      esito: it && stato ? { id: it.id, asse: it.asse, stato, ...it.esiti[stato] } : null,
      // Mezza figura: solo un booleano. Niente id, niente asse, niente stato —
      // quello che non viene mandato non si può leggere dagli strumenti del
      // browser, e il segno non deve essere deducibile in nessun modo (§4.6).
      parziale: !it && !!apreA(ultimo.n)
    };
  }

  // Il regista vede tutto, compreso I6 prima del capitolo 14: gli serve per
  // sapere cosa annunciare. La sala no.
  directorView() {
    const w = this.world;
    const ch = this.chapter;
    const prox = CHAPTERS[this.chapterIndex + 1];
    const nodo = (it) => it ? { id: it.id, asse: it.asse } : null;
    return {
      ...this.mainView(),
      tally: this.tally(),               // la regia vede sempre la forbice vera
      intrecci: w.intrecci,
      esitiTutti: esitiVisibili(w.intrecci, 14),
      // per il ritmo: il narratore deve sapere cosa sta per arrivare, e se il
      // capitolo che ha in mano pianta qualcosa o raccoglie
      apre: ch ? nodo(apreA(ch.n)) : null,
      chiude: ch ? nodo(chiudeA(ch.n)) : null,
      prossimo: prox ? { n: prox.n, anno: prox.anno, titolo: prox.titolo, votabile: !!prox.votabile, ruolo: prox.ruolo } : null,
      puoRiaprire: this.history.length > 0,
      generazione: this.generazione,
      epiloghiRivelati: this.epiloghiRivelati,
      // quanti hanno lasciato un nome: senza, l'epilogo si apre con «Tu»
      conNome: [...this.participants.values()].filter(p => p.nome).length
    };
  }

  deviceViewGeneric() {
    return {
      phase: this.phase,
      options: this.phase === "voting" ? opzioni(this.chapter) : null,
      // «si può cambiare idea fino allo scadere» (§5) vuole che si sappia quando scade
      voteRestaMs: this.voteEndsAt ? Math.max(0, this.voteEndsAt - Date.now()) : null,
      voteDurata: this.chapter && this.chapter.votabile ? this.chapter.durata_voto_sec : null
    };
  }

  // Dati personali del §8.3. L'epilogo generato arriva con la Fase 6.
  personalView(cid) {
    const p = this.participants.get(cid);
    if (!p) return null;
    const w = this.world;
    const scelte = [];
    let facili = 0, minoranza = 0;
    // Ogni scelta porta con sé il capitolo, cosa ha scelto DAVVERO e cosa
    // costava: un `cap. 3: facile` non dice niente né al modello che scrive
    // l'epilogo né allo studente che lo rilegge.
    for (const h of this.history) {
      const voto = p.votes.get(h.n) || null;
      const ch = PER_N.get(h.n);
      const opt = voto === "facile" ? ch.opzione_facile : voto === "difficile" ? ch.opzione_difficile : null;
      scelte.push({
        capitolo: h.n, anno: ch.anno, titolo: ch.titolo,
        voto,
        scelta: opt ? opt.label : null,
        costo: opt ? opt.costo_nascosto : null,
        vinse: h.winner,
        minoranza: !!voto && voto !== h.winner
      });
      if (!voto) continue;
      if (voto === "facile") facili++;
      if (voto !== h.winner) minoranza++;
    }
    const espressi = scelte.filter(s => s.voto).length;
    const indicePersonale = espressi ? Math.round(facili / espressi * 100) : null;
    return {
      nome: p.nome,
      eta: p.eta,
      scelte,
      voti_espressi: espressi,
      voti_in_minoranza: minoranza,
      indice_personale: indicePersonale,
      indice_sala: w.indice,
      banda_personale: banda(indicePersonale),
      banda_sala: w.banda,
      climax: w.climax,
      esiti: esitiVisibili(w.intrecci, 14),
      // l'epilogo esiste dalla fine del capitolo 12, ma non esce di qui finché
      // il narratore non dice «adesso guardate il telefono»
      epilogo: this.epiloghiRivelati && p.epilogo ? p.epilogo.testo : null,
      link: this.epiloghiRivelati && p.token ? `/e/${p.token}` : null,
      inAttesa: !!p.epilogo && !this.epiloghiRivelati
    };
  }

  // Quanti sono finiti nella stessa banda della sala e quanti in un'altra.
  consensusCount() {
    let same = 0, diverge = 0;
    const bandaSala = this.world.banda;
    for (const p of this.participants.values()) {
      if (!p.votes.size) continue;
      let facili = 0;
      for (const tag of p.votes.values()) if (tag === "facile") facili++;
      if (banda(Math.round(facili / p.votes.size * 100)) === bandaSala) same++; else diverge++;
    }
    return { same, diverge };
  }

  // ---- broadcast ----------------------------------------------------------
  broadcast() {
    this.io.to("main").emit("main:sync", this.mainView());
    this.io.to("director").emit("director:sync", this.directorView());
    if (this.phase === "ended" || this.epiloghiRivelati) {
      // personale per-socket (diverso per ognuno)
      for (const [cid, p] of this.participants) {
        if (p.socketId) this.io.to(p.socketId).emit("device:sync", { phase: this.phase, options: null, ended: this.personalView(cid) });
      }
    } else {
      this.io.to("devices").emit("device:sync", this.deviceViewGeneric());
    }
  }
}
