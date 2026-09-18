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
// `guadagno` / `costo_nascosto` facoltativi per opzione: se ci sono, il
//          proiettore li mostra sotto l'opzione e alla rivelazione.
// ==========================================================================

export const ESEMPI = [
  {
    id: "apertura",
    occhiello: "Domanda di apertura",
    titolo: "La mappa del Forum",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 60,
    q: "Se sviluppare software molto più velocemente è già possibile, quale pilastro del nostro modello attuale è oggi più sotto pressione?",
    opzioni: [
      { tag: "tempo",     label: "Vendere tempo e giornate/uomo" },
      { tag: "ruoli",     label: "Organizzare il delivery intorno a ruoli specialistici" },
      { tag: "seniority", label: "Costruire seniority attraverso anni di execution" },
      { tag: "tutti",     label: "Tutti e tre: dobbiamo ripensare il modello nel suo insieme" }
    ],
    nota: "Non c'è una risposta «corretta» da imporre. A, B e C corrispondono ai tre blocchi del Forum; D introduce l'ipotesi che il cambiamento sia sistemico."
  },

  // ---- BLOCCO 1 ----------------------------------------------------------
  {
    id: "blocco-1",
    occhiello: "Blocco 1",
    titolo: "Pricing, costi e valore",
    votabile: false,
    beats: [
      { sig: "La tecnologia ha cambiato la produttività. Il modello economico è cambiato alla stessa velocità?" }
    ]
  },

  {
    id: "b1-giornate",
    occhiello: "Blocco 1 · Pricing",
    titolo: "Quanto dura la giornata/uomo",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 60,
    q: "Se l'effort necessario per produrre software continua a diminuire, per quanto tempo è sostenibile un modello basato sulle giornate/uomo?",
    opzioni: [
      { tag: "dominante", label: "Rimarrà dominante" },
      { tag: "tariffe",   label: "Rimarrà, ma con tariffe e produttività diverse" },
      { tag: "outcome",   label: "Sarà progressivamente sostituito da pricing per output/outcome" },
      { tag: "contesti",  label: "Sopravvivrà soprattutto in specifici contesti" }
    ],
    nota: "D. Il T&M non scompare, ma perde centralità dove output e valore sono definibili."
  },

  {
    id: "b1-valore",
    occhiello: "Blocco 1 · Pricing",
    titolo: "Dove va il valore liberato",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 60,
    q: "La produttività AI riduce l'effort (con stime che arrivano al 40%). Dove dovrebbe andare principalmente quel valore?",
    opzioni: [
      { tag: "cliente",   label: "Al cliente, attraverso prezzi più bassi" },
      { tag: "fornitore", label: "Al fornitore, attraverso maggiore marginalità" },
      { tag: "scope",     label: "In maggiore scope, qualità e velocità" },
      { tag: "condiviso", label: "Condiviso tra cliente e fornitore" }
    ]
  },

  {
    id: "b1-margine",
    occhiello: "Blocco 1 · Pricing",
    titolo: "Cosa rende difendibile il margine",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 60,
    q: "Tra 3 anni, cosa renderà davvero difendibile il margine di una software company?",
    opzioni: [
      { tag: "tariffe",      label: "Tariffe più alte" },
      { tag: "produttivita", label: "Developer più produttivi" },
      { tag: "ip",           label: "IP, piattaforme e componenti riutilizzabili" },
      { tag: "outcome",      label: "Capacità di legare tecnologia e outcome di business" }
    ]
  },

  // ---- BLOCCO 2 ----------------------------------------------------------
  {
    id: "blocco-2",
    occhiello: "Blocco 2",
    titolo: "Delivery, time-to-market, qualità e debito tecnico",
    votabile: false,
    beats: [
      { sig: "Se la capacità di produrre aumenta, dove si sposta il collo di bottiglia? E come evitiamo di produrre più velocemente anche i problemi?" }
    ]
  },

  {
    id: "b2-collo",
    occhiello: "Blocco 2 · Delivery",
    titolo: "Il nuovo collo di bottiglia",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 60,
    q: "Se il coding non è più il principale collo di bottiglia, cosa lo diventa?",
    opzioni: [
      { tag: "qa",          label: "Testing e Quality Assurance" },
      { tag: "architettura",label: "Architettura e integrazione" },
      { tag: "cosa",        label: "Capire cosa costruire e perché" },
      { tag: "governance",  label: "Governance, sicurezza e controllo" }
    ]
  },

  {
    id: "b2-debito",
    occhiello: "Blocco 2 · Delivery",
    titolo: "Il debito tecnico",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 60,
    q: "Se produciamo molto più codice e molto più velocemente, cosa succederà al debito tecnico?",
    opzioni: [
      { tag: "diminuira",  label: "Diminuirà sensibilmente" },
      { tag: "invariato",  label: "Rimarrà sostanzialmente invariato" },
      { tag: "aumentera",  label: "Aumenterà" },
      { tag: "dipende",    label: "Dipenderà da governance, architettura e controllo" }
    ]
  },

  {
    id: "b2-reinvestire",
    occhiello: "Blocco 2 · Delivery",
    titolo: "Dove reinvestire la produttività",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 60,
    q: "La nuova produttività AI dove dovrebbe essere reinvestita per prima nel delivery?",
    opzioni: [
      { tag: "funzionalita", label: "Più funzionalità" },
      { tag: "ttm",          label: "Time-to-Market più corto" },
      { tag: "qualita",      label: "Qualità, test e refactoring" },
      { tag: "team",         label: "Team più piccoli" }
    ]
  },

  // ---- BLOCCO 3 ----------------------------------------------------------
  {
    id: "blocco-3",
    occhiello: "Blocco 3",
    titolo: "Chi saranno i senior di domani?",
    votabile: false,
    beats: [
      { sig: "Se l'AI assorbe una parte delle attività attraverso cui imparavano i junior, come costruiamo la prossima generazione di competenze?" }
    ]
  },

  {
    id: "b3-junior",
    occhiello: "Blocco 3 · Competenze",
    titolo: "Il gradino che manca",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 60,
    q: "Se l'AI assorbe gran parte delle attività oggi affidate ai junior, quale scelta è più sostenibile?",
    opzioni: [
      { tag: "stop",        label: "Ridurre drasticamente l'hiring junior" },
      { tag: "meno",        label: "Assumere meno junior" },
      { tag: "diversi",     label: "Assumere junior con profili diversi" },
      { tag: "reinventare", label: "Mantenere un feeder pool ma reinventare il percorso di crescita" }
    ]
  },

  {
    id: "b3-competenze",
    occhiello: "Blocco 3 · Competenze",
    titolo: "Competenze AI-native in 24 mesi",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 60,
    q: "Per costruire competenze AI-native nei prossimi 24 mesi, dove investireste principalmente?",
    opzioni: [
      { tag: "hiring", label: "Hiring" },
      { tag: "up",     label: "Up-skilling" },
      { tag: "re",     label: "Re-skilling" },
      { tag: "cross",  label: "Cross-skilling" }
    ]
  },

  {
    id: "b3-senior2030",
    occhiello: "Blocco 3 · Competenze",
    titolo: "Cosa sarà un senior nel 2030",
    votabile: true,
    mostra_live: false,
    durata_voto_sec: 60,
    q: "Nel 2030, cosa definirà davvero un senior?",
    opzioni: [
      { tag: "anni",         label: "Anni di esperienza" },
      { tag: "profondita",   label: "Profondità tecnica" },
      { tag: "problemi",     label: "Capacità di risolvere problemi complessi" },
      { tag: "orchestrare",  label: "Capacità di orchestrare persone, tecnologia e AI" }
    ]
  },

  // ---- CHIUSURA ----------------------------------------------------------
  {
    id: "chiusura",
    occhiello: "Domanda finale",
    titolo: "Dalla diagnosi alla decisione",
    votabile: true,
    mostra_live: true,
    durata_voto_sec: 60,
    q: "Dopo questo confronto: se doveste ridisegnare oggi una software company per i prossimi 5 anni, da dove partireste?",
    opzioni: [
      { tag: "commerciale", label: "Dal modello commerciale e di pricing" },
      { tag: "delivery",    label: "Dal modello di delivery, qualità e piattaforme" },
      { tag: "competenze",  label: "Da competenze, ruoli e career path" },
      { tag: "redesign",    label: "Da un redesign complessivo del modello operativo" }
    ],
    nota: "Non replica la domanda iniziale: la devia. All'apertura si chiede quale pilastro è sotto pressione, qui dove intervenire. Il confronto tra i due risultati mostra il passaggio da percezione a priorità d'azione."
  }
];
