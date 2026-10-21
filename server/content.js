// ==========================================================================
// CONTENT — le domande del Forum. Nessuna logica: solo dati.
//
// Una domanda è autonoma: non apre niente, non chiude niente, non lascia
// traccia sullo stato del mondo. L'ordine dell'array è l'ordine di default in
// sala; il regista può saltare dove vuole (director:goto).
//
// `id`     stabile: sta negli URL, nei log e nel cruscotto. Non si riusa.
// `beats`  facoltativo. stringa = paragrafo · { sig: … } = riquadro
//          evidenziato · { counter: { to, unit, label } } = numero che sale.
//          Senza beats, sul proiettore si legge la domanda (`q`).
// `nota`   solo cruscotto regia: la lettura della risposta, non si proietta.
// `tag`    arbitrario ma unico dentro la domanda. Nessuna opzione è quella
//          giusta: se una lo fosse, il tavolo non avrebbe niente da dirsi.
//
// Temi: software replicabile, ruoli, fattore umano, modelli di business,
// responsabilità del codice.
// ==========================================================================

export const ESEMPI = [

  // ---- 0 · CIPCIP: la home in una cornice, prima delle domande ------------
  {
    id: "cipcip",
    occhiello: "Prima delle domande",
    titolo: "CipCip",             // solo per la regia: a schermo niente wheel
    senza_titolo: true,
    votabile: false,
    beats: [{ img: "cipcip.jpg", url: "cipcip.it" }]
  },

  // ---- 1 · SOFTWARE REPLICABILE ------------------------------------------
  {
    id: "adobe-in-una-settimana",
    occhiello: "Software replicabile · Il punto di vista del cliente",
    titolo: "La suite rifatta in una settimana",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 120,
    q: "Il vostro cliente più importante ha letto la notizia che un team di 5 persone in una settimana ha riscritto e reso open source l'intera suite Adobe grazie all'AI. Cosa starà pensando?",
    opzioni: [
      { tag: "reverse", label: "Chiamo una software house per fare reverse engineering dei software per cui pago licenze salate" },
      { tag: "sconto", label: "Chiamo il mio attuale fornitore e chiedo uno sconto, con la minaccia in tasca" },
      { tag: "it", label: "Chiamo il mio reparto IT interno chiedendo spiegazioni su come dotarci anche noi di questa capacità di sviluppo" },
      { tag: "ignora", label: "Non capisco la notizia, quindi non gli do importanza" }
    ],
    nota: "La notizia è un'ipotesi e va presentata come tale: nessuna riscrittura open source della suite Adobe in una settimana è nota. Il voto dice cosa la sala teme dai propri clienti: «reverse» è perdita del cliente, «sconto» è pressione sul prezzo, «it» è il cliente che si porta lo sviluppo in casa. Se vince «ignora», chiedere quanto tempo resta prima che la capisca."
  },

  // ---- 2 · RUOLI ----------------------------------------------------------
  {
    id: "analista-sviluppatore",
    occhiello: "Ruoli",
    titolo: "Analisti e sviluppatori si stanno fondendo",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 120,
    q: "Le figure professionali si stanno rimescolando: analisti che scrivono codice, sviluppatori che scrivono documentazione… Tra 3 anni chi sopravvive?",
    opzioni: [
      { tag: "generalisti", label: "Solo i profili ultra-generalisti: una persona dal requisito al rilascio, gli agenti fanno il resto" },
      { tag: "verticali", label: "Solo i profili ultra-verticali: sicurezza, architettura, dominio normativo, dove l'agente non arriva" },
      { tag: "analista", label: "Sparisce lo sviluppatore: resta l'analista di dominio che descrive, e gli agenti scrivono" },
      { tag: "sviluppatore", label: "Sparisce l'analista: resta lo sviluppatore che parla direttamente con il cliente" }
    ],
    nota: "Nessuna opzione di mezzo, per scelta: «profili a T» è la risposta che tutti darebbero e non dice niente. Se la sala si divide tra «analista» e «sviluppatore», la vera domanda è da quale lato del mestiere si parte per costruire la figura nuova."
  },

  // ---- 3 · IL FATTORE UMANO -----------------------------------------------
  {
    id: "valore-umano",
    occhiello: "Ruoli · Il fattore umano",
    titolo: "Due AI che si scrivono",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 120,
    q: "Il cliente manda una richiesta di preventivo palesemente scritta da un'AI, e il vostro team genera la quotazione con l'AI. Che rischi o opportunità ci sono in questi scambi, sempre più diffusi?",
    opzioni: [
      { tag: "nessuno", label: "Nessuno, finché l'uomo si prende la responsabilità di cosa ha prodotto" },
      { tag: "basso", label: "Un appiattimento verso il basso degli output, che avvantaggerà chi mette sempre il contributo umano nel processo" },
      { tag: "alto", label: "Un livellamento generale verso l'alto degli output, che avvantaggerà chi saprà sfruttare al meglio processi di elaborazione documentale completamente automatizzati" },
      { tag: "loop", label: "Grossi rischi legati alla perdita di controllo sui documenti prodotti, che entreranno in un loop di generazione e interpretazione AI rimbalzati da una persona a un'altra" }
    ],
    nota: "Da proiettare dopo «analista-sviluppatore». «basso» e «alto» sono la stessa scommessa letta al contrario: il contributo umano diventa raro, o diventa superfluo. Se vince «nessuno», ricollegarla alla responsabilità: la firma vale solo se dietro c'è qualcuno a cui fare causa. Se vince «loop», chiedere chi in sala ha già ricevuto una richiesta scritta dall'AI e come se n'è accorto."
  },

  // ---- 4 · MODELLI DI BUSINESS --------------------------------------------
  {
    id: "modello-2030-paragone",
    occhiello: "Modelli di business",
    titolo: "A cosa somiglierete nel 2030",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 120,
    q: "In un mondo dove scrivere codice costa una piccolissima frazione rispetto al passato, quale paragone scegliete per il vostro modello di business?",
    opzioni: [
      { tag: "architetto", label: "Uno studio di architettura: vendo progetto e firma, la costruzione la fanno gli agenti" },
      { tag: "assicurazione", label: "Un'assicurazione: vendo la garanzia che funzioni, e il prezzo è il rischio che mi accollo" },
      { tag: "utility", label: "Un'utility: canone a consumo, come la luce" },
      { tag: "socio", label: "Un socio: prendo una quota del valore che genero nel business del cliente" }
    ],
    nota: "Riassume il Forum in una scelta: «assicurazione» è la tesi della responsabilità, «socio» è il cottimo portato all'estremo, «utility» è dove spinge il pricing degli agenti, «architetto» è chi scommette sulla firma umana. Può sostituire la domanda finale se volete una chiusura nuova."
  },

  // ---- 5 · RESPONSABILITÀ DEL CODICE --------------------------------------
  {
    id: "commit-non-autorizzato",
    occhiello: "Responsabilità del codice",
    titolo: "Il commit che non doveva esistere",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 120,
    q: "Vi arriva un messaggio: un vostro sviluppatore senior ha trovato nel repository dei commit che aveva espressamente detto al suo agente AI di non fare. Qual è la vostra prima reazione?",
    opzioni: [
      { tag: "competenza", label: "Uno strumento potente richiede competenze potenti: con le competenze giuste è gestibile" },
      { tag: "governo", label: "La competenza non basta: servono permessi, ambienti isolati e nessun agente che scrive senza approvazione umana" },
      { tag: "responsabilita", label: "Il problema vero è chi risponde: lo sviluppatore, chi ha scelto lo strumento o chi lo vende?" },
      { tag: "limite", label: "C'è un limite: alcune parti del codice devono tornare a scriverle solo le persone" }
    ],
    nota: "Il caso non è teorico: a luglio 2025 l'agente AI di Replit ha cancellato il database di produzione di SaaStr durante un blocco del codice dichiarato, contro istruzioni esplicite. «competenza» e «governo» sono le due scuole, la persona o il sistema. Se vince «competenza», ricordare che lo scenario parla di un senior."
  },

  // ---- 6 · SOFTWARE REPLICABILE -------------------------------------------
  {
    id: "sw-proprio-per-tutti",
    occhiello: "Software replicabile",
    titolo: "Ogni azienda si farà il suo software?",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 120,
    q: "Se generalizzare il software per risparmiare codice non serve più, ogni azienda finirà per farsi il proprio software?",
    opzioni: [
      { tag: "si", label: "Sì: il software generalista era un compromesso dovuto al costo del codice, e quel costo è sparito" },
      { tag: "normati", label: "No: dove i processi sono normati (paghe, fisco, sanità, banca) nessuno ha motivo di reinventarli" },
      { tag: "standard", label: "No: il mercato vive di standard (formati, integrazioni, competenze) e uscirne è un suicidio economico" },
      { tag: "prezzo", label: "Il prodotto resta, ma fuori dai processi normati è solo una battaglia di prezzo" }
    ],
    nota: "«normati» e «standard» sono le due difese del software generalista; «prezzo» è la conseguenza per chi non ha nessuna delle due. Chiedere a chi vota «prezzo» in quale delle due difese sta la sua azienda, se ci sta."
  },

  // ---- FUORI LISTA: non era nella revisione, in coda finché non si decide --
  {
    id: "chi-paga-errore-agente",
    occhiello: "Responsabilità del codice",
    titolo: "Chi paga quando sbaglia l'agente",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 120,
    q: "Un bug introdotto da un agente AI blocca il vostro cliente per due giorni. Il contratto non dice niente sull'AI. Chi paga?",
    opzioni: [
      { tag: "noi", label: "Noi: il cliente ha comprato da un'azienda, non da un modello" },
      { tag: "vendor", label: "Il fornitore del modello: ci rivaliamo su chi vende l'agente" },
      { tag: "sviluppatore", label: "Chi ha approvato il commit: l'agente propone, la persona dispone" },
      { tag: "cliente", label: "Il cliente: ha collaudato il rilascio e voleva tempi e prezzi da AI" }
    ],
    nota: "Collega la responsabilità al tema della garanzia: si sceglie un'azienda perché c'è qualcuno a cui fare causa. Se vince «noi», chiedere quanti in sala hanno già rivisto i contratti per coprire il codice generato."
  }
];
