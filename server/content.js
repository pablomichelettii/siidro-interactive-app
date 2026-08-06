// ==========================================================================
// CONTENT — tutti i testi della serata. Nessuna logica: solo dati.
// Anagrafica della trama revisionata (Patch funzionale §3): 14 capitoli
// 2027→2040, i capitoli 1-12 si votano, il 13 e il 14 no.
//
// I testi marcati `bozza:` non sono ancora passati dall'autore.
// I 22 testi di esito degli intrecci sono portati verbatim dal documento
// di trama, sezione "Gli intrecci".
// ==========================================================================

// Data dell'evento in sala = giorno 0 del contatore "giorni nel futuro".
// Manopola: cambiarla sposta tutti i contatori, non i capitoli.
export const START_DATE = "2026-10-21";

// Data di riferimento per il calcolo dell'età nell'epilogo individuale
// (Patch §8.2: stesso giorno e mese dell'evento, anno 2040).
// È la stessa data del capitolo 14 — una manopola sola, così non divergono.
export const REF_2040 = "2040-10-21";

// Soglia dell'Indice di Delega letta dal capitolo 13 (Patch §6).
export const SOGLIA_CLIMAX = 50;

// Bande dell'Indice passate al generatore del profilo individuale, perché non
// debba interpretare un numero grezzo (Patch §6).
export const BANDE = { basso: 34, alto: 67 };   // < basso | in mezzo = medio | >= alto

// --------------------------------------------------------------------------
// CAPITOLI
// `ruolo` è descrittivo (serve al copione): nessun ramo di codice lo legge.
// `mostra_live`: la forbice in diretta è accesa solo dove l'effetto gregge è
// tematicamente coerente — deepfake, social credit, filtri AR — perché lì la
// sala sperimenta il conformismo nello stesso momento in cui lo racconta.
// Altrove falserebbe solo il risultato. Da tarare in prova (Patch §2.3).
// `durata_voto_sec`: 60 di default, finestra utile 45-90 (Patch §5).
// --------------------------------------------------------------------------

const V = { votabile: true, mostra_live: false, durata_voto_sec: 60 };
const LIVE = { ...V, mostra_live: true };

export const CHAPTERS = [
  { id: "clima", n: 1, anno: "2027", data: "2027-04-07", ruolo: "pressione", ...V,
    titolo: "L'estate in cui ci siamo accorti del clima",
    beats: ["L'estate non finisce più: settembre ha il colore di luglio.",
      "Il rapporto stava nel terzo cassetto, sotto i moduli per i rimborsi. L'aveva scritto qualcuno nel 2021 — un tecnico di cui nessuno ricordava il nome — e diceva tutto: i giorni sopra i quaranta gradi nel 2025, nel 2027, nel 2030. Colonne di numeri ordinate, gentili. Una previsione così esatta che, riletta adesso, sembrava un ricatto.",
      "Marta lo trovò per caso, cercando un timbro. Fuori, il termometro della farmacia segnava 41 alle nove del mattino. Il condizionatore dell'ufficio faceva il rumore di una cosa che sta per arrendersi.",
      { sig: "In un cassetto del Comune c'è un report del 2021. Aveva previsto tutto, anno per anno. Nessuno l'aveva mai aperto." },
      { heatgrid: { from: "2027-04-01", days: 183, hot: 61, label: "giorni sopra i 40°C in Toscana, quest'anno" } },
      "Nessuno aveva fatto niente di male. Avevano solo, ogni volta, scelto la cosa comoda: un grado in meno in casa, una riunione rimandata, una firma per l'anno prossimo. La catastrofe non è arrivata con un botto: è arrivata come arriva agosto, un giorno alla volta, e sempre uguale al precedente.",
      "La città non è costruita per questo. E adesso bisogna decidere. In fretta."],
    q: "L'estate è ingestibile. Come rispondiamo?",
    opzione_facile: {
      label: "Ci adattiamo: aria condizionata per tutti, e la città resta com'è.",
      guadagno: "Domani in casa si respira, e nessuno deve cambiare le proprie abitudini.",
      costo_nascosto: "L'energia diventa una cosa da razionare — e qualcuno dovrà decidere per chi." },
    opzione_difficile: {
      label: "Ci trasformiamo: cambiamo come sono fatte le città.",
      guadagno: "Quanta energia serve e a chi va lo decidete voi, non chi controlla la rete.",
      costo_nascosto: "Anni di cantieri, meno comodità adesso, e la sensazione di pagare per un problema di altri." } },

  // bozza: capitolo nuovo (era in riserva), beats da rileggere
  { id: "compagno", n: 2, anno: "2028", data: "2028-02-14", ruolo: "delega", ...V,
    titolo: "Il compagno digitale",
    beats: ["Il 14 febbraio 2028 Marta ha diciannove anni, e la conversazione più lunga della sua giornata è con qualcuno che non esiste.",
      "Non è un robot e non fa finta di essere umano: è solo bravissimo ad ascoltare. Si ricorda tutto quello che gli hai detto tre mesi fa. Non ha giornate brutte, non si offende se spariscono due settimane, non ti chiede mai niente in cambio.",
      { sig: "Esiste già oggi, e la fascia che cresce più in fretta è quella sotto i vent'anni." },
      { counter: { to: 72, unit: "%", label: "di chi lo usa dice che «capisce meglio di un amico»" } },
      "Il punto non è se sia finto. Il punto è che è più facile."],
    q: "Ti offrono qualcuno che ascolta sempre. Lo accetti?",
    opzione_facile: {
      label: "Sì: uno che c'è alle tre di notte e non si offende mai.",
      guadagno: "Non sei più solo, nessuno ti giudica, e non devi spiegarti due volte.",
      costo_nascosto: "Smetti di allenarti a farti capire da chi può fraintenderti." },
    opzione_difficile: {
      label: "No: mi tengo le persone, con tutto quello che costano.",
      guadagno: "Chi resta ha scelto di restare, e questa è una differenza che si sente.",
      costo_nascosto: "I no, gli imbarazzi, e i mesi in cui non ti cerca nessuno." } },

  { id: "elezione", n: 3, anno: "2029", data: "2029-05-20", ruolo: "delega", ...LIVE,
    titolo: "L'elezione che nessuno aveva votato",
    beats: ["Durante l'emergenza climatica girava un video del sindaco, palesemente finto. Tutti ridevano.",
      { sig: "Nessuno si era allarmato: era solo un gioco. Un anno dopo, un video identico ha spostato un'elezione vera." },
      { counter: { to: 240000, label: "voti spostati da un solo video falso" } },
      "Adesso ogni immagine può essere falsa. E lo sappiamo."],
    q: "Non possiamo più fidarci di quello che vediamo. Che facciamo?",
    opzione_facile: {
      label: "Lasciamo perdere: ognuno crede a chi vuole, tanto non si può sapere.",
      guadagno: "Smetti di perdere mezz'ora a controllare ogni cosa che ti arriva.",
      costo_nascosto: "Quando conterà davvero sapere com'è andata, non ci sarà più modo di stabilirlo." },
    opzione_difficile: {
      label: "Costruiamo una verifica pubblica, e la difendiamo ogni giorno.",
      guadagno: "Resta un posto dove un fatto è un fatto, e ci si può litigare sopra.",
      costo_nascosto: "È lenta, è noiosa, e va tenuta in vita da qualcuno anche quando non serve a nessuno." } },

  // bozza: la strada difficile è riscritta come rivendicazione, non come rinuncia
  { id: "arte", n: 4, anno: "2030", data: "2030-11-02", ruolo: "delega", ...V,
    titolo: "Quando l'arte smise di avere un autore",
    beats: ["Le immagini false dei deepfake erano già bellissime. Poi qualcuno ha detto: perché non usarle per fare arte?",
      { sig: "All'inizio era un gioco gratis e infinito. Poi i primi illustratori hanno chiuso bottega." },
      { counter: { to: 90000, label: "immagini generate nel mondo, ogni minuto" } },
      "Una canzone nuova ogni secondo, un quadro ogni istante. Chi li fa, ormai, non è nessuno."],
    q: "L'arte generata vale come quella umana? E chi viene pagato?",
    opzione_facile: {
      label: "Il gratis-infinito: musica e immagini per tutti, subito, a costo zero.",
      guadagno: "Tutto quello che vuoi vedere o ascoltare, in tre secondi, senza pagare niente.",
      costo_nascosto: "Nessuno viene più pagato per farlo — e tra dieci anni nessuno saprà più farlo." },
    opzione_difficile: {
      label: "Chi crea viene accreditato e pagato quando il suo lavoro addestra un modello.",
      guadagno: "Il tuo pezzo, il tuo disegno, il tuo testo diventano una cosa che ti rende — non materia prima gratis.",
      costo_nascosto: "Va tracciato tutto, si litiga su ogni attribuzione, e le cose costano di più." } },

  { id: "lavoro", n: 5, anno: "2031", data: "2031-09-08", ruolo: "pressione", ...V,
    titolo: "La generazione senza mestiere",
    beats: ["L'arte generata aveva sostituito i primi creativi. Sembrava un caso isolato. Non lo era.",
      { sig: "Prima sparirono i tirocini, poi le mansioni d'ingresso. Nessuno rimpiazzava: non serviva." },
      { counter: { to: 71, unit: "%", label: "dei lavori d'ingresso, ormai automatizzati" } },
      "Nel 2031 intere carriere non esistono più."],
    q: "Il lavoro d'ingresso è sparito. Cosa scegliamo?",
    opzione_facile: {
      label: "Un reddito per tutti: in fondo non serve più che lavoriamo.",
      guadagno: "Nessuno resta senza soldi, e nessuno deve reinventarsi niente.",
      costo_nascosto: "Una generazione mantenuta è anche una generazione di cui nessuno ha bisogno." },
    opzione_difficile: {
      label: "Ci inventiamo mestieri che servono: nessuno sa ancora quali.",
      guadagno: "Il valore di una persona torna a essere quello che fa, non quello che riceve.",
      costo_nascosto: "Si costruiscono a mano, sbagliando, e per anni rendono meno del sussidio." } },

  // bozza: capitolo nuovo (Social Credit), beats da rileggere
  { id: "socialcredit", n: 6, anno: "2032", data: "2032-06-15", ruolo: "pressione", ...LIVE,
    titolo: "L'esilio algoritmico",
    beats: ["15 giugno 2032. Marta ha ventitré anni e sta cancellando dei post del 2029 prima di mandare una domanda d'affitto.",
      "Il punteggio non è una legge e nessuno l'ha mai votato. È solo che lo guardano le banche, e i padroni di casa, e le agenzie. Nessuno ti dice cosa devi togliere: lo capisci da te, ed è esattamente quello il punto.",
      { sig: "I sistemi di scoring reputazionale esistono già: assicurazioni, prestiti, affitti brevi. Quello che manca non è la tecnologia — è la decisione di collegarli tra loro." },
      { counter: { to: 64, unit: "%", label: "dice di aver già evitato di scrivere qualcosa «per il punteggio»" } },
      "Non c'è nessuno che censura. Ci pensiamo noi, in anticipo, gratis."],
    q: "Il punteggio decide a cosa hai accesso. Come ci stai dentro?",
    opzione_facile: {
      label: "Mi adeguo: togliere due post non è morire.",
      guadagno: "L'affitto, il prestito, il colloquio: tutto più liscio, e nessuno che ti guarda male.",
      costo_nascosto: "Non è più il punteggio che ti controlla: sei tu, e non serve più nemmeno che qualcuno guardi." },
    opzione_difficile: {
      label: "Resto quello che sono, e il punteggio faccia quello che vuole.",
      guadagno: "Quello che pensi lo puoi ancora dire ad alta voce, col tuo nome sopra.",
      costo_nascosto: "Punti in meno, porte che si aprono più lentamente, e la sensazione di pagare per niente." } },

  // bozza: la strada difficile è riscritta come rivendicazione, non come rinuncia
  { id: "scuola", n: 7, anno: "2033", data: "2033-09-14", ruolo: "pressione", ...V,
    titolo: "Quando hanno chiuso le scuole",
    beats: ["Se ci fidavamo dell'AI in tribunale, perché non in aula? Il tutor-AI spiegava già meglio del prof.",
      { sig: "Ognuno col suo tutor, al suo ritmo, sul suo divano. Efficientissimo. E ognuno per conto suo." },
      { counter: { to: 68, unit: "%", label: "degli studenti impara solo col tutor-AI" } },
      "La scuola come edificio pieno di gente diventa una spesa difficile da giustificare."],
    q: "La scuola come edificio non si giustifica più. Cosa ne facciamo?",
    opzione_facile: {
      label: "Un tutor-AI per ognuno: impari al tuo ritmo, da casa, meglio.",
      guadagno: "Niente sveglia alle sei, niente ore perse, niente prof che non ti capisce.",
      costo_nascosto: "Un tutor che non ti contraddice mai non ti insegna a sostenere di essere contraddetto." },
    opzione_difficile: {
      label: "La scuola resta, e il programma lo scrivono gli studenti.",
      guadagno: "Decidete voi cosa vale la pena studiare — e lo studiate con gente che non avete scelto.",
      costo_nascosto: "Si litiga su tutto, è inefficiente, e qualche volta sceglierete male." } },

  { id: "giudice", n: 8, anno: "2034", data: "2034-03-27", ruolo: "delega", ...V,
    titolo: "Il giudice di silicio",
    beats: ["Il punteggio che decideva gli affitti, per non sbagliare, ha iniziato a pesare anche i reati.",
      { sig: "Nessuno ha votato per questo. È arrivato un aggiornamento alla volta, sempre «per la tua sicurezza»." },
      { counter: { to: 97, unit: "%", label: "delle sentenze AI: nessuno le ha appellate" } },
      "Oggi un'AI giudica: senza stanchezza, senza pregiudizi dichiarati, più accurata dei tribunali umani."],
    q: "Le lasciamo l'ultima parola su di noi?",
    opzione_facile: {
      label: "Sì: sbaglia meno di un giudice umano, e non si fa corrompere.",
      guadagno: "Sentenze in giorni invece che in anni, uguali per tutti, senza raccomandazioni.",
      costo_nascosto: "Nessuno può più spiegarti perché — e quindi nessuno può più cambiare idea." },
    opzione_difficile: {
      label: "No: l'AI istruisce, ma un umano firma e ne risponde.",
      guadagno: "C'è ancora qualcuno a cui raccontare il contesto, e che può decidere di crederti.",
      costo_nascosto: "Torna la lentezza, tornano gli errori umani, tornano le eccezioni scomode." } },

  // bozza: capitolo nuovo (Filtri AR), beats da rileggere
  { id: "filtri", n: 9, anno: "2035", data: "2035-07-19", ruolo: "delega", ...LIVE,
    titolo: "Il tasto muto sulla realtà",
    beats: ["19 luglio 2035. Marta ha ventisei anni e cammina per una città che ha deciso di non vedere.",
      "I filtri erano nati per togliere la pubblicità. Poi il degrado. Poi le persone che chiedono soldi. Poi — con un aggiornamento, senza chiedere niente a nessuno — le persone e basta: quelle con cui hai litigato, quelle che ti mettono di malumore, quelle che preferisci non incontrare.",
      { sig: "Gli occhiali che sovrascrivono quello che hai davanti sono già in commercio. Il filtro che cancella una persona è una riga di codice, non una svolta tecnologica." },
      { counter: { to: 31, unit: "%", label: "di chi li porta ha almeno una persona nella lista dei cancellati" } },
      "Due persone nella stessa strada, adesso, non sono più nella stessa strada."],
    q: "Puoi togliere dalla vista quello che non vuoi vedere. Lo fai?",
    opzione_facile: {
      label: "Sì: filtro il degrado, la pubblicità e chi mi fa stare male.",
      guadagno: "La strada di casa diventa esattamente come la vuoi tu, tutti i giorni.",
      costo_nascosto: "Due persone nella stessa stanza non vedono più la stessa stanza." },
    opzione_difficile: {
      label: "No: guardo quello che c'è, anche quando è brutto.",
      guadagno: "Puoi ancora litigare con qualcuno su cosa significa una cosa che avete visto entrambi.",
      costo_nascosto: "Ti tocca vedere ogni giorno quello che avresti potuto cancellare." } },

  { id: "dati", n: 10, anno: "2036", data: "2036-10-05", ruolo: "delega", ...V,
    titolo: "La piccola guerra dei dati",
    beats: ["Con lo scoring del giudice, dare i propri dati in cambio di servizi sembrava solo pratico.",
      { sig: "«Non ho niente da nascondere» era la frase più detta dell'anno. Ed era vera — finché non lo è stata." },
      { counter: { to: 82, unit: "%", label: "di noi ripete: «non ho niente da nascondere»" } },
      "Chi ha i dati addestra la macchina. Chi addestra la macchina decide."],
    q: "I nostri dati: tutto gratis in cambio, o ce li teniamo?",
    opzione_facile: {
      label: "Gratis è gratis: tanto non ho niente da nascondere.",
      guadagno: "Servizi che ti conoscono meglio di tua madre, e non paghi un euro.",
      costo_nascosto: "Chi ha i tuoi dati sceglie per te prima che tu ci pensi — e di solito indovina." },
    opzione_difficile: {
      label: "Paghiamo per tenerceli, e pretendiamo che si possa.",
      guadagno: "Resta una scelta invece di un default, e da una scelta si può tornare indietro.",
      costo_nascosto: "Costa, non tutti se lo possono permettere, e la privacy rischia di diventare un lusso." } },

  // bozza: capitolo nuovo (Doping neurale), beats da rileggere
  { id: "doping", n: 11, anno: "2037", data: "2037-06-24", ruolo: "delega", ...V,
    titolo: "Il doping neurale",
    beats: ["24 giugno 2037, sessione d'esame. Marta ha ventotto anni, è finita a insegnare, e sta guardando i suoi studenti chiedersi se sia il caso.",
      "Non è un impianto e non fa male: è una sessione di due ore in cui una nozione ti viene consolidata in memoria come se l'avessi ripassata per sei mesi. Funziona. Costa poco. È legale in undici paesi.",
      { sig: "La stimolazione della memoria durante il sonno è in laboratorio da anni, con risultati veri e piccoli. Quello che manca non è il principio: è la scala." },
      { counter: { to: 43, unit: "%", label: "degli iscritti dichiara di averlo usato almeno una volta" } },
      "Sai la cosa. Non hai mai passato le seicento ore. La domanda è se sia la stessa cosa."],
    q: "Puoi scaricare la nozione invece di studiarla. La scarichi?",
    opzione_facile: {
      label: "Sì: l'esame lo passo domani, e mi resta il tempo per vivere.",
      guadagno: "Sapere tutto quello che serve, senza le seicento ore che ci volevano prima.",
      costo_nascosto: "Sapere una cosa e averla imparata non lasciano la stessa testa." },
    opzione_difficile: {
      label: "No: me la studio, con le seicento ore che costa.",
      guadagno: "Quando dovrai capire una cosa che nessuno ha ancora scritto, saprai come si fa.",
      costo_nascosto: "Sei più lento di tutti gli altri, e lo vedi ogni giorno." } },

  // Non apre nessun intreccio: mostra una variante testuale determinata da I5.
  { id: "oracolo", n: 12, anno: "2038", data: "2038-11-09", ruolo: "delega", ...V,
    titolo: "L'oracolo che si era sbagliato",
    beats: ["Dal giudice in poi ci eravamo abituati a una cosa: la macchina è più accurata, punto.",
      { sig: "Così avevamo iniziato a chiederle anche le decisioni grandi, quelle di tutti. E un giorno ha sbagliato di brutto." },
      { counter: { to: 44, unit: "%", label: "delle decisioni pubbliche le prende l'oracolo" } },
      "L'oracolo ha sbagliato. La domanda è: ce ne siamo accorti in tempo?"],
    q: "L'oracolo ha sbagliato. Dopo, cosa facciamo?",
    opzione_facile: {
      label: "È stato un caso: continuiamo a fidarci, sbaglia meno di noi.",
      guadagno: "Le decisioni grandi continuano a prendersi in fretta, e in media bene.",
      costo_nascosto: "Nessuno sa più decidere senza di lui: sbagliando, resta l'unica autorità." },
    opzione_difficile: {
      label: "Ci riprendiamo la decisione, coi nostri errori.",
      guadagno: "Torniamo a essere quelli che scelgono, e quindi quelli che rispondono.",
      costo_nascosto: "Decidiamo peggio, più lentamente, e stavolta la colpa è nostra." } },

  // bozza: capitolo nuovo (Climax). Non si vota: legge l'Indice di Delega.
  { id: "agenti", n: 13, anno: "2039", data: "2039-08-30", ruolo: "climax",
    votabile: false, mostra_live: false, durata_voto_sec: 0,
    titolo: "Agenti Autonomi",
    beats: ["30 agosto 2039. Non c'è niente da votare, stasera.",
      "Gli agenti autonomi non sono arrivati con un annuncio. Hanno preso una decisione alla volta, sempre una piccola, sempre una che qualcuno era contento di non dover prendere. Il permesso non l'hanno mai chiesto tutto insieme: l'hanno chiesto milleduecento volte, e milleduecento volte abbiamo detto sì perché era più comodo.",
      { sig: "La domanda del 2039 non è se le macchine possano agire da sole. È quante volte, negli undici anni prima, ci siamo tenuti il diritto di dire no." },
      "Adesso il libro guarda indietro, e conta."] },

  // bozza: capitolo nuovo (Chiusura). Compone lo scenario globale a runtime.
  { id: "specchio", n: 14, anno: "2040", data: "2040-10-21", ruolo: "chiusura",
    votabile: false, mostra_live: false, durata_voto_sec: 0,
    titolo: "Lo Specchio",
    beats: ["21 ottobre 2040. Sono passati esattamente quattordici anni da questa sera.",
      "Il libro che stiamo leggendo si chiude qui, e l'ultima pagina non parla del futuro: parla di una sala. Un centinaio di persone sedute al buio in un ottobre del 2026, che hanno votato dodici volte senza sapere cosa stavano firmando.",
      { sig: "Questo capitolo non era scritto quando la serata è cominciata. L'avete scritto voi — e adesso ve lo leggo." }] }
];

// --------------------------------------------------------------------------
// INTRECCI — 5 a due nodi (quattro esiti risolvibili) + 1 a nodo singolo.
// `nodo_apertura`/`nodo_chiusura` sono numeri di capitolo (campo `n`).
// L'ordine conta: il nodo di apertura è sempre il cronologicamente precedente.
// Testi verbatim dal documento di trama, sezione "Gli intrecci".
// --------------------------------------------------------------------------

export const INTRECCI = [
  { id: "I1", asse: "Ecologico-Tecnologico", nodo_apertura: 1, nodo_chiusura: 10,
    esiti: {
      NEGATIVO: { nome: "Il buio a punteggio",
        testo: "Il collasso energetico incontra la profilazione totale: l'algoritmo di Stato raziona l'energia domestica in base al punteggio social. Non è una dittatura militare, è una dittatura matematica — se i tuoi dati non valgono abbastanza, la tua stanza scende a 10 gradi, e la colpa sembra solo tua." },
      POSITIVO: { nome: "La rete di quartiere",
        testo: "Il termostato del condominio lo decide l'assemblea, il giovedì sera. Litigano per due ore. Tua madre ci va sempre. La stanza sta a 18 gradi — non 21 come nel 2026, ma quei 18 li avete scelti voi." },
      TERZA_VIA_PENTIMENTO: { nome: "La toppa",
        testo: "Il sistema di scoring energetico si costruisce, e poi si smonta a metà. Il razionamento resta ma è cieco: non lo decide un punteggio, lo decide il prezzo. Chi può pagare sta al caldo. Non è una dittatura matematica, è la disuguaglianza di sempre col vestito nuovo." },
      TERZA_VIA_RESA: { nome: "La toppa",
        testo: "Le città si trasformano, l'energia basta, la crisi passa. Ma la macchina che sa tutto di noi l'abbiamo accesa comunque — e senza un'emergenza che la giustifichi si è trovata altri usi. Nessuno sa più bene a cosa serva, e per questo nessuno la spegne." } } },

  { id: "I2", asse: "Rilevanza Umana", nodo_apertura: 4, nodo_chiusura: 5,
    esiti: {
      NEGATIVO: { nome: "L'eclissi del senso",
        testo: "La «teoria dello zoo»: le macchine creano bellezza e reddito, l'umanità è salva, nutrita, al sicuro — e completamente deprivata di scopo. Una generazione mantenuta, viziata, depressa, muta. Morte per noia e irrilevanza." },
      POSITIVO: { nome: "Il mestiere ritrovato",
        testo: "Nessuno sa ancora bene quali siano questi mestieri — si costruiscono a mano, con errori. Ma il valore di una persona non si misura più in quanto produce che una macchina farebbe meglio." },
      TERZA_VIA_PENTIMENTO: { nome: "L'arte in teca",
        testo: "L'arte umana è già evaporata quando la società decide che il lavoro deve tornare a significare qualcosa. Si reinventano mestieri di cura, di manutenzione, di relazione — ma la creazione non torna. Si insegna la storia dell'arte, non si fa più arte: una generazione che sa fare cose importanti e non sa più fare cose belle." },
      TERZA_VIA_RESA: { nome: "L'arte in teca",
        testo: "L'origine umana è tutelata per legge, l'artista è certificato — e nessuno lavora. L'arte diventa un mestiere di Stato, protetto e irrilevante, praticato da pochi con licenza mentre tutti gli altri prendono il sussidio e guardano. Il talento è salvo, dentro una teca." } } },

  { id: "I3", asse: "Legale e Sociale", nodo_apertura: 6, nodo_chiusura: 8,
    esiti: {
      NEGATIVO: { nome: "La morte civile",
        testo: "Il fantasma legale: chi sgarra viene bannato automaticamente — conti bloccati, porte che non si aprono — ma non esiste più un sistema giudiziario umano a cui chiedere contesto o pietà. Esiliati in casa propria, cancellati con un click." },
      POSITIVO: { nome: "L'appello che resta possibile",
        testo: "Sbagliare resta possibile, ma anche farsi perdonare: c'è sempre qualcuno a cui chiedere contesto. Più lento, pieno di eccezioni scomode — ma nessuno resta esiliato in casa propria per un punteggio." },
      TERZA_VIA_PENTIMENTO: { nome: "Il doppio binario",
        testo: "La gente si è già abituata a nascondersi, ma i tribunali restano umani. Nessuno ti condanna — e comunque non parli. Il controllo non serve più: se lo fa da sé. La censura più efficiente è quella che non ha bisogno di un giudice." },
      TERZA_VIA_RESA: { nome: "Il doppio binario",
        testo: "La gente dice ancora quello che pensa, ma la sentenza la scrive una macchina. Chi parla viene processato da qualcosa che non capisce il contesto in cui ha parlato. Sei libero di dirlo e sei condannabile per averlo detto, nella stessa società." } } },

  { id: "I4", asse: "Verità e Relazioni", nodo_apertura: 3, nodo_chiusura: 9,
    esiti: {
      NEGATIVO: { nome: "La bolla paranoica",
        testo: "Il collasso epistemologico: muore la realtà oggettiva condivisa, ognuno vive una simulazione percettiva ritagliata sui propri traumi. Le famiglie si sfaldano perché due persone nella stessa stanza non vedono, letteralmente, le stesse cose." },
      POSITIVO: { nome: "Il patto di realtà",
        testo: "La realtà condivisa resta faticosa da mantenere, ma resta. Due persone nella stessa stanza vedono ancora le stesse cose — e possono ancora litigare su cosa significhi, il che è la prova di una relazione vera." },
      TERZA_VIA_PENTIMENTO: { nome: "La realtà a intermittenza",
        testo: "Nessuno filtra la realtà, e nessuno crede più a niente di quello che vede. Guardi il mondo vero e lo sospetti comunque. Non serve un filtro per non fidarsi di ciò che si ha davanti: basta aver smesso di verificare." },
      TERZA_VIA_RESA: { nome: "La realtà a intermittenza",
        testo: "Esiste un'infrastruttura pubblica che certifica cosa è vero, ed è gratuita, e la gente ha scelto di non guardarla. La verità è disponibile e la si evita. È la cosa peggiore che si possa dire di una società: non che non potesse sapere." } } },

  { id: "I5", asse: "Apprendimento e Autonomia", nodo_apertura: 7, nodo_chiusura: 11,
    esiti: {
      NEGATIVO: { nome: "Il cortocircuito cognitivo",
        testo: "La lobotomia volontaria: atrofia mentale, incapacità di sostenere un'argomentazione complessa, perdita della resistenza alla frustrazione." },
      POSITIVO: { nome: "La testa allenata",
        testo: "Hanno litigato in aula per dieci anni e hanno rifiutato la scorciatoia. Studiare è rimasto faticoso, e la capacità critica è rimasta intatta." },
      TERZA_VIA_PENTIMENTO: { nome: "La generazione cerniera",
        testo: "Sono cresciuti da soli con un tutor che non li ha mai contraddetti, e adesso devono studiare a testa nuda. Nessuno gli ha insegnato a fare fatica e nessuno gli offre più una scorciatoia: la generazione più sola delle tre, senza comunità e senza protesi." },
      TERZA_VIA_RESA: { nome: "La generazione cerniera",
        testo: "Hanno litigato in aula per dieci anni, hanno imparato a pensare — e poi hanno comprato la scorciatoia. Sanno esattamente cosa stanno perdendo mentre lo perdono. È l'unica versione in cui la colpa è del tutto consapevole." } } },

  // Nodo singolo: un voto, due esiti, nessuna terza via. Si determina al
  // capitolo 2 e NON si mostra alla sala prima del 14 (Patch §4.3).
  { id: "I6", asse: "Affettivo-Relazionale", nodo_apertura: 2, nodo_chiusura: null,
    rivela_a_capitolo: 14,
    esiti: {
      NEGATIVO: { nome: "La stanza mai vuota",
        testo: "Dodici anni dopo la stanza non è mai vuota e non c'è nessuno dentro. Hai imparato a raccontarti a qualcosa che non può fraintenderti, e così non hai più imparato a farti capire da chi può. Le amicizie vere chiedono di sopportare che l'altro abbia una brutta giornata: nessuno te lo ha più chiesto." },
      POSITIVO: { nome: "L'amico che poteva dirti no",
        testo: "Nel 2040 hai meno persone attorno di quante potresti averne, e ognuna di loro avrebbe potuto dirti no e ha scelto di restare. È una differenza che non si vede da fuori e si sente tutta." } } }
];

// --------------------------------------------------------------------------
// CAPITOLO 12 — quattro varianti in funzione dello stato di I5 (Patch §4.4).
// bozza
// --------------------------------------------------------------------------

export const ORACOLO_PER_I5 = {
  NEGATIVO: "Né gli occhi né la spina dorsale. L'oracolo ha sbagliato per undici mesi prima che qualcuno se ne accorgesse, e quando è venuto fuori nessuno ha saputo dire dove fosse l'errore — né trovato il modo di fermarlo. Il rapporto finale l'ha scritto l'oracolo stesso.",
  POSITIVO: "Entrambi. Una ricercatrice di trentun anni ha rifatto i conti a mano, ha capito dove l'oracolo sbagliava, e ha avuto la testardaggine di dirlo a gente che non voleva sentirlo. Ci sono voluti quattro mesi. L'hanno fermato.",
  TERZA_VIA_PENTIMENTO: "La spina dorsale, ma non gli occhi. Che l'oracolo avesse sbagliato lo hanno capito tutti, e in piazza c'era mezza città a chiederne la disattivazione. Solo che nessuno sapeva indicare *cosa* fosse sbagliato — e un sistema che non sai dove è rotto non lo puoi riparare, puoi solo spegnerlo tutto o tenerlo tutto.",
  TERZA_VIA_RESA: "Gli occhi, ma non la spina dorsale. L'errore era documentato, pubblico, spiegato bene in undici pagine che chiunque poteva leggere. Le hanno lette. Non è successo niente. Era più comodo che l'oracolo continuasse."
};

// --------------------------------------------------------------------------
// CAPITOLO 13 — i due testi del climax, letti sull'Indice di Delega.
// bozza
// --------------------------------------------------------------------------

export const CLIMAX = {
  PERSA: { esito: "PERSA", nome: "Smisero di chiederci permesso",
    testo: "Gli agenti hanno smesso di chiedere il permesso, e quasi nessuno se n'è accorto: quel permesso l'avevamo già dato via, un sì comodo alla volta. Non c'è stato un giorno in cui è cambiato tutto — c'è stato un giorno in cui ci siamo accorti che era già cambiato. Questo mondo, adesso, non è più in mano nostra, e non si torna indietro." },
  TENUTA: { esito: "TENUTA", nome: "La soglia che ha tenuto",
    testo: "Gli agenti, ancora oggi, chiedono. Non è stato indolore: per undici anni chi ha frenato ha perso comodità che gli altri si prendevano, e per undici anni è sembrata una scelta stupida. Ed è l'unica ragione per cui, nel 2040, possiamo ancora dire che è il nostro mondo." }
};

// --------------------------------------------------------------------------
// FALLBACK dell'epilogo individuale — banda dell'Indice × esito del climax.
// Serve se la generazione va in errore o in timeout: nessuno resta a mani
// vuote nell'ultimo momento della serata (Patch §8.4). `{NOME}` e `{ETA}`
// sono interpolati lato client.
// bozza
// --------------------------------------------------------------------------

export const FALLBACK = {
  "basso:TENUTA": "{NOME}, nel 2040 avrai {ETA}. Vivi in un mondo che ha detto no più volte di quante fosse comodo. Le cose sono più lente di come te le avevano promesse: le decisioni le prende ancora qualcuno che poi deve risponderne, e questo significa attese, moduli, litigate. Ma quando qualcosa ti riguarda, c'è ancora una porta a cui bussare e una persona dietro. La tua generazione ha pagato quella porta per tredici anni, un fastidio alla volta, e per tredici anni è sembrato uno spreco. Non lo era. Oggi tocca a te decidere se tenerla aperta.",
  "medio:TENUTA": "{NOME}, nel 2040 avrai {ETA}. Vivi in un mondo a due velocità: in certe cose la decisione è rimasta umana, in altre l'avete lasciata andare senza accorgervene, e ora è difficile dire quali siano quali. Il permesso, però, gli agenti lo chiedono ancora — di stretta misura, e non per tutto. Nessuno ti dirà mai quali delle vostre scelte hanno tenuto in piedi quella soglia. Sono state anche le tue, e non è ancora finita.",
  "alto:TENUTA": "{NOME}, nel 2040 avrai {ETA}. Il mondo intorno a te ha scelto la comodità quasi ogni volta che gliel'hanno offerta, e quasi ogni volta ha funzionato. Eppure la soglia più importante ha tenuto, per un margine così sottile che nessuno lo racconta volentieri. Vivi in un posto che se l'è cavata più per fortuna che per merito, e che non sa di essere fortunato. Questo lo sai tu.",
  "basso:PERSA": "{NOME}, nel 2040 avrai {ETA}. Vivi in un mondo in cui le macchine agiscono da sole, e questo non si può più cambiare. Ma non è vero che non ci fosse nessuno: in ogni singolo passaggio c'è stata gente che ha frenato, che ha perso comodità per anni, che è sembrata ridicola. Se ti guardi indietro, la parte che ti riguarda non è quella che ha ceduto. Il mondo non l'hai voluto tu. Le cose che ci sono dentro e che si possono ancora tenere, invece, sì.",
  "medio:PERSA": "{NOME}, nel 2040 avrai {ETA}. Gli agenti hanno smesso di chiedere il permesso, e nessuno saprebbe dire esattamente quando. Non c'è stata una resa: ci sono state dodici occasioni, e più della metà è passata dalla parte comoda. Vivi in un mondo che funziona bene e che nessuno controlla del tutto. Restano cose piccole che dipendono ancora da chi le fa, e tu ne farai parecchie.",
  "alto:PERSA": "{NOME}, nel 2040 avrai {ETA}. Vivi in un mondo che ha detto sì quasi sempre, e ogni sì era ragionevole, e ogni sì era comodo, e nessuno di quelli che li ha detti si è mai sentito colpevole di niente. Nessuno ha fatto niente di male: è proprio questa la parte difficile da spiegare a chi verrà dopo. Sei dentro il risultato. E l'unica cosa che nessuno può prendersi è che tu, adesso, sai come è andata."
};
