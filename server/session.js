// ==========================================================================
// SESSION — stato autorevole in memoria. Un processo = una sala.
// Doppio binario (clarification #1): collective guida il Main Screen sulla
// maggioranza; ogni participant.personal accumula i SUOI voti.
// Effimero + anonimo: nessun DB, chiave = cid (client id, no PII).
// ==========================================================================

import { randomUUID } from "node:crypto";
import {
  CHAPTERS, INTRECCI, BIVI, makeState, applyChoice, optByTag, attractor, climaxVerdict
} from "./engine.js";

export class Session {
  constructor(io) {
    this.io = io;
    this.reset(false);
  }

  reset(broadcast = true) {
    this.phase = "lobby";               // lobby | narrating | voting | ended
    this.chapterIndex = 0;
    this.collective = makeState();
    this.participants = new Map();       // cid -> { personal, socketId, connected }
    this.currentVotes = new Map();       // cid -> tag  (solo bivio aperto)
    this.history = [];                   // [{ chapterId, year, title, facile, difficile, winner }]
    if (broadcast) this.broadcast();
  }

  get chapter() { return CHAPTERS[this.chapterIndex]; }

  // ---- partecipanti -------------------------------------------------------
  addParticipant(cid, socket) {
    if (!cid) cid = randomUUID();
    let p = this.participants.get(cid);
    if (!p) {
      p = { personal: makeState(), socketId: socket.id, connected: true };
      this.participants.set(cid, p);
    } else {
      p.socketId = socket.id;           // reconnect: stesso cid, ripristina stato
      p.connected = true;
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
    p.connected = false;                 // teniamo il personal per un eventuale reconnect
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
    if (this.phase !== "narrating" || this.chapter.climax) return;
    this.phase = "voting";
    this.currentVotes.clear();
    this.broadcast();
  }

  vote(cid, option) {
    if (this.phase !== "voting" || !cid) return;
    if (!optByTag(this.chapter, option)) return;   // opzione non valida per questo capitolo
    this.currentVotes.set(cid, option);
    this.io.to("main").emit("main:particle", { cid, tag: option });
    const tally = this.tally();
    this.io.to("main").emit("main:tally", tally);
    this.io.to("director").emit("director:tally", tally);
  }

  closeVote(forcedWinner) {
    if (this.phase !== "voting") return;
    const ch = this.chapter;
    const t = this.tally();
    let winner = forcedWinner
      || (t.facile > t.difficile ? "facile"
        : t.difficile > t.facile ? "difficile"
        : "facile");                                // pareggio → gravità comoda (D4)

    // binario collettivo: solo la maggioranza
    applyChoice(this.collective, ch, optByTag(ch, winner));

    // binario individuale: il voto REALE di ciascuno (astenuto = nessun delta)
    for (const [cid, p] of this.participants) {
      const myTag = this.currentVotes.get(cid);
      if (myTag) applyChoice(p.personal, ch, optByTag(ch, myTag));
    }

    this.history.push({ chapterId: ch.id, year: ch.year, title: ch.title, facile: t.facile, difficile: t.difficile, winner });
    this.currentVotes.clear();
    this.chapterIndex++;

    if (!this.chapter || this.chapter.climax) this.endGame();
    else { this.phase = "narrating"; this.broadcast(); }
  }

  skip() {  // avanza la narrazione senza voto (capitolo passivo / recupero regista)
    if (this.phase !== "narrating") return;
    this.chapterIndex++;
    if (!this.chapter || this.chapter.climax) this.endGame();
    else this.broadcast();
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

  firedList(state) { return state.fired.map(i => INTRECCI[i]); }

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
        year: ch.year, title: ch.title,
        beats: ch.beats || null,
        climax: !!ch.climax,
        verdict: ch.climax ? climaxVerdict(this.collective.delega) : null
      } : null,
      options: (this.phase === "voting" && ch.opts)
        ? { q: ch.q, opts: ch.opts.map(o => ({ tag: o.tag, text: o.t })) } : null,
      delega: this.collective.delega,
      attractor: attractor(this.collective.delega),
      fired: this.firedList(this.collective),
      tally: this.tally(),
      aggregates: this.phase === "ended" ? this.history : null,
      consensus: this.phase === "ended" ? this.consensusCount() : null
    };
  }

  // il Main NON riceve gli assi del tono. Il regista SÌ (Handoff D7).
  directorView() {
    const v = this.mainView();
    return {
      ...v,
      tono: { coesione: this.collective.coesione, verita: this.collective.verita, equita: this.collective.equita }
    };
  }

  deviceViewGeneric() {
    const ch = this.chapter;
    return {
      phase: this.phase,
      options: (this.phase === "voting" && ch.opts)
        ? { q: ch.q, opts: ch.opts.map(o => ({ tag: o.tag, text: o.t })) } : null
    };
  }

  // resoconto personale (device:ended) — il cuore del doppio binario
  personalView(cid) {
    const p = this.participants.get(cid);
    if (!p) return null;
    const votes = Object.values(p.personal.choices);
    const facili = votes.filter(x => x === "facile").length;
    return {
      collective: attractor(this.collective.delega),
      personal: attractor(p.personal.delega),
      diverges: attractor(this.collective.delega).name !== attractor(p.personal.delega).name,
      facili, totalVotes: votes.length,
      fired: this.firedList(p.personal),
      verdict: climaxVerdict(p.personal.delega)
    };
  }

  consensusCount() {  // quanti hanno seguito la maggioranza vs quanti divergono
    let same = 0, diverge = 0;
    const roomName = attractor(this.collective.delega).name;
    for (const p of this.participants.values()) {
      if (Object.keys(p.personal.choices).length === 0) continue;
      if (attractor(p.personal.delega).name === roomName) same++; else diverge++;
    }
    return { same, diverge };
  }

  // ---- broadcast ----------------------------------------------------------
  broadcast() {
    this.io.to("main").emit("main:sync", this.mainView());
    this.io.to("director").emit("director:sync", this.directorView());
    if (this.phase === "ended") {
      // personale per-socket (diverso per ognuno)
      for (const [cid, p] of this.participants) {
        if (p.socketId) this.io.to(p.socketId).emit("device:sync", { phase: "ended", options: null, ended: this.personalView(cid) });
      }
    } else {
      this.io.to("devices").emit("device:sync", this.deviceViewGeneric());
    }
  }
}
