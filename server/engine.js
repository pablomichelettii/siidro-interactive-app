// ==========================================================================
// ENGINE — contenuti + riduttore di stato. Portati verbatim dall'MVP validato
// (mvp-libro-vivo.html). Fonte meccaniche: Handoff §3/§4/§5.
// L'engine è LINEARE (D13): tutti i capitoli, stesso ordine per tutti.
// La divergenza per-utente è solo nello STATO accumulato, non nei capitoli.
// ==========================================================================

const O = (t, tag, delega, axis, d, c) => ({ t, tag, delega, axis, d, c });

export const CHAPTERS = [
  { id: "clima", year: "2027", title: "L'estate in cui ci siamo accorti del clima",
    beats: ["L'estate non finisce più. Settembre ha il colore di luglio.",
      { sig: "In un cassetto del Comune c'è un report del 2021. Aveva previsto tutto, anno per anno. Nessuno l'aveva mai aperto." },
      { counter: { to: 61, label: "giorni sopra i 40°C in Toscana, quest'anno" } },
      "La città non è costruita per questo. E bisogna decidere. In fretta."],
    q: "L'estate è ingestibile. Come rispondiamo?",
    opts: [O("Ci adattiamo: aria condizionata per tutti, e si tira avanti come prima.", "facile", 12, "equita", -1, "La sala sceglie il comodo. La rete elettrica comincia a soffrire, ma oggi non fa male a nessuno."),
      O("Ci trasformiamo: cambiamo come vivere le città. Costa, e fa male adesso.", "difficile", -12, "equita", 1, "Meno comodità subito — ma la città resta una cosa nostra.")] },

  { id: "deepfake", year: "2028", title: "L'elezione che nessuno aveva votato",
    beats: ["Durante l'emergenza climatica girava un video del sindaco, palesemente finto. Tutti ridevano.",
      { sig: "Nessuno si era allarmato: era solo un gioco. Un anno dopo, un video identico ha spostato un'elezione vera." },
      { counter: { to: 240000, label: "voti spostati da un solo video falso" } },
      "Adesso ogni immagine può essere falsa. E lo sappiamo."],
    q: "Non possiamo più fidarci di quello che vediamo. Che facciamo?",
    opts: [O("Ci arrendiamo: tanto non si sa più cosa è vero, ognuno crede a chi vuole.", "facile", 12, "verita", -1, "Il dubbio diventa apatia. Vince chi grida più forte, non chi ha ragione."),
      O("Costruiamo una verifica pubblica: lenta, noiosa, da difendere ogni giorno.", "difficile", -12, "verita", 1, "Costa fatica tenerla viva. Ma esiste ancora un posto dove un fatto è un fatto.")] },

  { id: "memoria", year: "2030", title: "L'ultimo che ricordava a memoria",
    beats: ["Dopo i deepfake, controllare un fatto a memoria era diventato inutile: tanto valeva chiedere alla macchina.",
      { sig: "Già oggi nessuno sa più un numero di telefono. Presto nessuno saprà più nulla — perché può sempre chiederlo." },
      { counter: { to: 54, label: "volte al giorno chiedi, invece di ricordare" } },
      "Sapere e poter-chiedere sembrano la stessa cosa. Non lo sono."],
    q: "Quanto teniamo nella nostra testa?",
    opts: [O("Scarichiamo tutto: la memoria è un peso, la macchina la tiene per noi.", "facile", 12, "verita", -1, "Comodo. Ma senza niente in testa, dipendiamo dall'accesso — e da chi lo controlla."),
      O("Ne coltiviamo un po': imparare a memoria sembra inutile, è autonomia.", "difficile", -12, "verita", 1, "Sembra masochismo. È la differenza tra sapere e chiedere.")] },

  { id: "arte", year: "2030", title: "Quando l'arte smise di avere un autore",
    beats: ["Le immagini false dei deepfake erano già bellissime. Poi qualcuno ha detto: perché non usarle per fare arte?",
      { sig: "All'inizio era un gioco gratis e infinito. Poi i primi illustratori hanno chiuso bottega." },
      { counter: { to: 90000, label: "immagini generate nel mondo, ogni minuto" } },
      "Una canzone nuova ogni secondo, un quadro ogni istante. Chi li fa, ormai, non è nessuno."],
    q: "L'arte generata vale come quella umana? La paghiamo uguale?",
    opts: [O("Vince il gratis-infinito: il mercato non fa sentimentalismi.", "facile", 12, "verita", -1, "I mestieri creativi evaporano. Resta tanta roba bella, e nessuno dietro."),
      O("Difendiamo il valore dell'origine umana: qualcuno deve certificarla.", "difficile", -12, "verita", 1, "Chi decide cos'è 'umano'? Contro corrente, e complicato. Ma l'autore esiste ancora.")] },

  { id: "lavoro", year: "2031", title: "La generazione che non ha più un mestiere",
    beats: ["L'arte generata aveva sostituito i primi creativi. Sembrava un caso isolato. Non lo era.",
      { sig: "Prima sparirono i tirocini, poi le mansioni d'ingresso. Nessuno rimpiazzava: non serviva." },
      { counter: { to: 71, unit: "%", label: "dei lavori d'ingresso, ormai automatizzati" } },
      "Nel 2031 intere carriere non esistono più."],
    q: "Il lavoro come lo conoscevamo è finito. Cosa scegliamo?",
    opts: [O("Un reddito per tutti e tempo libero. In fondo non serve più lavorare.", "facile", 12, "coesione", -1, "Comodo. Ma una generazione mantenuta è anche una generazione che non serve a nessuno."),
      O("Inventiamo mestieri di senso: nessuno sa quali, si costruiscono a mano.", "difficile", -12, "coesione", 1, "Incerto, faticoso. Ma il valore di una persona resta ciò che fa, non ciò che riceve.")] },

  { id: "medicina", year: "2032", title: "Il copilota del medico",
    beats: ["Col lavoro avevamo imparato una cosa: la macchina, spesso, fa meglio di noi. Fidarsi era diventato normale.",
      { sig: "Verificare la macchina sembrava ormai una perdita di tempo — quasi una mancanza di rispetto." },
      { counter: { to: 93, unit: "%", label: "delle diagnosi: l'AI batte il medico umano" } },
      "Ora l'AI è in sala operatoria. Più precisa di ogni chirurgo. Statisticamente, salva più vite."],
    q: "Sotto i ferri, di chi ti fidi?",
    opts: [O("Della macchina, sempre. Gli umani sbagliano di più.", "facile", 12, "equita", -1, "Il medico umano diventa un timbro. E con lui sparisce il 'perché ho deciso così'."),
      O("L'AI consiglia, ma decide un umano — e ti guarda in faccia.", "difficile", -12, "equita", 1, "Più lento, più caro. Ma qualcuno resta responsabile di te.")] },

  { id: "scuola", year: "2033", title: "Quando hanno chiuso le scuole (e ne hanno aperte di nuove)",
    beats: ["Se ci fidavamo dell'AI in sala operatoria, perché non in aula? Il tutor-AI spiegava già meglio del prof.",
      { sig: "Ognuno col suo tutor, al suo ritmo, sul suo divano. Efficientissimo. E ognuno per conto suo." },
      { counter: { to: 68, unit: "%", label: "degli studenti impara solo col tutor-AI" } },
      "La scuola come edificio pieno di gente diventa una spesa difficile da giustificare."],
    q: "Che ce ne facciamo della scuola?",
    opts: [O("Tutor-AI personale per ognuno: sapere su misura, zero frizione.", "facile", 12, "coesione", -1, "Impari tutto, da solo. Non impari più a stare con chi non hai scelto."),
      O("La scuola resta il posto dove ci si scontra con gli altri.", "difficile", -12, "coesione", 1, "Lento, conflittuale, inefficiente. Cioè: umano.")] },

  { id: "giudice", year: "2034", title: "Il giudice di silicio",
    beats: ["Il sistema che verificava le notizie, per non sbagliare, ha iniziato a dare un punteggio alle persone.",
      { sig: "Nessuno ha votato per questo. È arrivato un aggiornamento alla volta, sempre 'per la tua sicurezza'." },
      { counter: { to: 97, unit: "%", label: "delle sentenze AI: nessuno le ha appellate" } },
      "Oggi un'AI giudica: senza stanchezza, senza pregiudizi dichiarati, più accurata dei tribunali umani."],
    q: "Le lasciamo l'ultima parola su di noi?",
    opts: [O("Sì. È più giusta di noi, e non si fa corrompere.", "facile", 14, "equita", -1, "Una giustizia che nessuno capisce fino in fondo — e che quasi nessuno può più appellare."),
      O("No. L'AI assiste, ma è un umano che firma e ne risponde.", "difficile", -14, "equita", 1, "Restano gli errori umani. Ma resta anche qualcuno a cui chiedere conto.")] },

  { id: "dati", year: "2035", title: "La piccola guerra dei dati",
    beats: ["Con lo scoring del giudice, dare i propri dati in cambio di servizi sembrava solo pratico.",
      { sig: "«Non ho niente da nascondere» era la frase più detta dell'anno. Ed era vera — finché non lo è stata." },
      { counter: { to: 82, unit: "%", label: "di noi ripete: «non ho niente da nascondere»" } },
      "Chi ha i dati addestra la macchina. Chi addestra la macchina decide."],
    q: "I nostri dati: in cambio di tutto gratis, o li teniamo noi?",
    opts: [O("Gratis è gratis. Tanto non ho niente da nascondere.", "facile", 12, "equita", -1, "Profilazione totale. La macchina sceglie per te prima ancora che tu ci pensi."),
      O("Paghiamo per tenerci i dati. Anche se non tutti se lo possono permettere.", "difficile", -12, "equita", 1, "La privacy diventa un lusso. Ma resta una scelta, non un default.")] },

  { id: "prompt", year: "2036", title: "La generazione che pensava in prompt",
    beats: ["I ragazzi del 2036 parlano all'AI prima ancora che ai genitori. Per loro è l'aria.",
      { sig: "Voi, in sala, siete la generazione di mezzo: vedete i vostri futuri figli da fuori." },
      { counter: { to: 30, unit: " mesi", label: "l'età media del primo prompt a un'AI" } },
      "Non chiedono più «come si fa?». Chiedono, e basta. Il pensiero parte già fatto."],
    q: "I bambini crescono dentro l'AI. Assecondiamo o mettiamo argini?",
    opts: [O("Nessun argine: è il loro mondo, sanno loro come viverlo.", "facile", 12, "coesione", -1, "Una generazione che non sa formulare un pensiero senza chiederlo prima."),
      O("Spazi 'senza AI' per crescere: sembra reazionario.", "difficile", -12, "coesione", 1, "È palestra mentale. Faticosa, impopolare, necessaria.")] },

  { id: "lucca", year: "2037", title: "Le mura di Lucca che diventarono uno schermo",
    beats: ["Qui, dove siete seduti. Ogni superficie della città può raccontare qualunque storia.",
      { sig: "Il turismo e l'AI già 'raccontavano' Lucca con storie generate. Belle. E non sempre vere." },
      { counter: { to: 1200, label: "versioni della storia di Lucca, tutte «vere»" } },
      "La storia di un luogo, ora, la scrive chi controlla lo schermo."],
    q: "Chi decide qual è la storia vera di questo posto?",
    opts: [O("La storia più cliccabile: è quella che porta turisti e soldi.", "facile", 12, "verita", -1, "L'identità del territorio va all'asta. Lucca diventa quello che rende di più."),
      O("La comunità presidia la propria narrazione: lento e litigioso.", "difficile", -12, "verita", 1, "Ci si accapiglia su ogni pietra. Ma questo posto resta 'nostro'.")] },

  { id: "oracolo", year: "2038", title: "L'oracolo che si era sbagliato",
    beats: ["Dal giudice in poi ci eravamo abituati a una cosa: la macchina è più accurata, punto.",
      { sig: "Così avevamo iniziato a chiederle anche le decisioni grandi, quelle di tutti. E un giorno ha sbagliato di brutto." },
      { counter: { to: 44, unit: "%", label: "delle decisioni pubbliche le prende l'oracolo" } },
      "L'oracolo ha sbagliato. La domanda è: ce ne siamo accorti in tempo?"],
    q: "Dopo l'errore dell'oracolo, cosa facciamo?",
    opts: [O("È stato un caso. Continuiamo a fidarci: sbaglia meno di noi.", "facile", 14, "verita", -1, "Nessuno sa più decidere senza di lui. L'oracolo, sbagliando, resta l'autorità."),
      O("Ci riprendiamo la decisione, coi nostri errori.", "difficile", -14, "verita", 1, "Scomodo, imperfetto, rivendicato. Torniamo a essere quelli che scelgono.")] },

  { id: "climax", year: "2038 → 2039", title: "Quel giorno smisero di chiederci permesso", climax: true }
];

export const INTRECCI = [
  { kind: "neg", need: { clima: "facile", dati: "facile" }, txt: "IL BUIO A PUNTEGGIO — l'energia scarsa la distribuisce l'algoritmo: chi ha lo score basso resta al caldo." },
  { kind: "pos", need: { clima: "difficile", dati: "difficile" }, txt: "LA RETE DI QUARTIERE — l'energia scarsa la gestisce la comunità, con regole trasparenti." },
  { kind: "neg", need: { deepfake: "facile", arte: "facile", lucca: "facile" }, txt: "LA CITTÀ IN VENDITA — nessuna fonte è vera: la storia del luogo la scrive chi paga di più." },
  { kind: "pos", need: { deepfake: "difficile", arte: "difficile", lucca: "difficile" }, txt: "LA CITTÀ CHE SI RACCONTA — esiste una verità condivisa, la comunità presidia la propria storia." },
  { kind: "neg", need: { memoria: "facile", scuola: "facile", prompt: "facile" }, txt: "LA TESTA VUOTA — una generazione che non sa più accorgersi quando l'oracolo sbaglia." },
  { kind: "pos", need: { memoria: "difficile", scuola: "difficile", prompt: "difficile" }, txt: "LA TESTA ALLENATA — sai pensare senza chiedere: sei tu che fermi l'errore dell'oracolo." },
  { kind: "neg", need: { lavoro: "facile", giudice: "facile" }, txt: "IL GUINZAGLIO DEL SUSSIDIO — non produci valore, lo score cala: il sussidio è diventato controllo." },
  { kind: "pos", need: { lavoro: "difficile", giudice: "difficile" }, txt: "IL MESTIERE RITROVATO — il valore di una persona non è un punteggio." },
  { kind: "neg", need: { medicina: "facile", giudice: "facile" }, txt: "IL TRIAGE SOCIALE — sotto i ferri conta lo score, non il caso: qualcuno non 'vale' l'operazione." },
  { kind: "pos", need: { medicina: "difficile", giudice: "difficile" }, txt: "IL MEDICO CHE TI GUARDA IN FACCIA — conta la persona, non il numero." }
];

export const BIVI = CHAPTERS.filter(c => !c.climax).length;

// Date del viaggio nei "5000 giorni". Giorno 0 = inizio del racconto.
// Modificabili liberamente: guidano solo il contatore-interludio tra i capitoli.
export const START_DATE = "2026-10-21";
const DATES = {
  clima: "2027-04-07", deepfake: "2028-09-16", memoria: "2030-01-27", arte: "2030-11-02",
  lavoro: "2031-05-22", medicina: "2032-11-08", scuola: "2033-09-14", giudice: "2034-03-27",
  dati: "2035-07-19", prompt: "2036-10-05", lucca: "2037-06-24", oracolo: "2039-11-09",
  climax: "2040-06-29"
};
CHAPTERS.forEach(c => { c.date = DATES[c.id]; });

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function makeState() {
  return { delega: 50, coesione: 0, verita: 0, equita: 0, choices: {}, fired: [] };
}

export function checkIntrecci(s) {
  INTRECCI.forEach((it, idx) => {
    if (s.fired.includes(idx)) return;
    if (Object.entries(it.need).every(([k, v]) => s.choices[k] === v)) s.fired.push(idx);
  });
}

// riduttore puro — identico all'MVP, applicato SIA al collettivo SIA a ogni personale
export function applyChoice(s, chapter, opt) {
  s.delega = clamp(s.delega + opt.delega, 0, 100);
  s[opt.axis] = clamp(s[opt.axis] + opt.d, -3, 3);
  s.choices[chapter.id] = opt.tag;
  checkIntrecci(s);
  return s;
}

export function optByTag(chapter, tag) {
  return chapter.opts && chapter.opts.find(o => o.tag === tag);
}

export function attractor(delega) {
  if (delega <= 38) return { name: "Le Mani sul Volante", sub: "faticoso, ma ancora nostro" };
  if (delega >= 62) return { name: "Il Pilota Automatico", sub: "comodo, non più in mano nostra" };
  return { name: "In bilico", sub: "alcune soglie tenute, altre no" };
}

// verdetto del climax (legge lo stato, non è un bivio) — porta da buildClimax dell'MVP
export function climaxVerdict(delega) {
  if (delega >= 62) return "Gli agenti hanno smesso di chiedere il permesso. E quasi nessuno se n'è accorto: quel permesso l'avevamo già dato via, un sì comodo alla volta. Questo mondo, adesso, non è più in mano nostra. E non si torna indietro.";
  if (delega <= 38) return "Gli agenti, ancora oggi, chiedono. Abbiamo pagato caro per tenerci quella soglia — ogni volta rallentando, ogni volta rinunciando a una comodità. Ed è l'unica ragione per cui, nel 2038, possiamo ancora dire: è il nostro mondo.";
  return "Il mondo è rimasto in bilico. Certe soglie le abbiamo difese, altre lasciate andare. Gli agenti chiedono permesso quando gli conviene — e nessuno sa più bene chi comanda.";
}
