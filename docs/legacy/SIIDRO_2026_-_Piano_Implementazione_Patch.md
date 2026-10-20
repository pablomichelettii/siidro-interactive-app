---
title: SIIDRO 2026 - Piano di implementazione della patch funzionale
tags:
  - SIIDRO
  - sviluppo
  - piano
riferimento: SIIDRO 2026 - Patch Funzionale Applicativo
versione: 1.0
date: 2026-08-05
---

# Piano di implementazione — patch "Libro Vivo del 2040"

**Riferimenti:** [[SIIDRO 2026 - Patch Funzionale Applicativo]] · [[SIIDRO 2026 - Evento Scuole - Proposta Storia dal Futuro]]

Questo documento traduce la patch funzionale in fasi di lavoro sul codice esistente. Non ridiscute le decisioni narrative: le assume e dice dove cadono.

---

## 0 · Ricognizione — cosa c'è davvero in app

I tre «da verificare» della patch, risolti leggendo il codice.

**Anagrafica capitoli — non esiste nessun database.** I capitoli sono hardcoded in `server/engine.js:10-123`, e sono la **versione pre-revisione**: 13 voci (12 bivi + climax). Presenti ancora `memoria` (2030), `medicina` (2032), `prompt` (2036), `lucca` (2037) — tutti e quattro rimossi dalla trama. Assenti: compagno digitale, esilio algoritmico, tasto muto sulla realtà, doping neurale, e il capitolo 14. Anche gli anni slittano: `deepfake` è 2028 in codice e 2029 in trama. Il warning del §1 della patch è confermato in pieno.

**Contatore «giorni nel futuro» — è calcolato, non fisso.** `daysBetween(START_DATE, chapter.date)` in `public/main.js:330`, con `START_DATE = "2026-10-21"` e una mappa `DATES` per-capitolo in `server/engine.js:143-149`. Verificato: 2026-10-21 → 2027-04-07 fa esattamente **168 giorni**, il numero citato nella patch. Servono quindi solo le 14 date narrative nuove, non i valori del contatore.

**Cruscotto regista — esiste.** `public/director.html` più gli eventi `director:*` in `server/index.js:52-59`. Ha: inizia, apri voto, chiudi voto, forza esito (i due pulsanti «Tiebreak»), salta capitolo, reset. Legge: capitolo corrente, collegati, indice, forbice live, intrecci scattati, assi del tono. Mancano: timer, riapri voto, `rivela_epiloghi`, nome dell'esito appena risolto da annunciare, banda dell'Indice.

**Un quarto punto che la patch non nomina.** Non esiste **nessun timer**: il voto lo chiude il regista a mano. `durata_voto_sec` è funzionalità nuova, non un campo da aggiungere a logica esistente.

---

## 1 · La scelta strutturale: stato derivato invece che accumulato

Oggi lo stato collettivo è **accumulato**: `applyChoice` somma `±12` a `delega`, muove tre assi del tono e appende a `fired` (`server/engine.js:165-171`). Con il nuovo modello lo stato diventa **derivato** da `history`, che già registra un winner per capitolo (`server/session.js:106`):

```
derive(history) → { winners, indice, banda, intrecci: { I1..I6: stato | "PARZIALE" | null } }
```

Dodici capitoli per sei intrecci, ricalcolati a ogni chiusura di voto: costo computazionale nullo. In cambio:

- **«riapri voto» e «forza esito» diventano gratis** — `history.pop()` e ricalcolo, invece di logica di undo sui delta già applicati
- **l'Indice come media delle quote** esce direttamente dai conteggi già presenti in `history`
- **lo stato `PARZIALE` non va salvato**: è per definizione «questo intreccio ha un winner sul nodo di apertura e non ancora sulla chiusura», cioè una domanda che si fa a `derive()`
- sparisce l'intera classe di bug da stato accumulato che si desincronizza

Cancella `makeState`, `applyChoice`, `clamp`, `checkIntrecci`, `attractor` e i tre assi del tono (`coesione`, `verita`, `equita` — non citati da nessuna parte nella patch, letti solo dalla card del cruscotto).

Corollario: **anche lo stato personale diventa derivato**, da `Map<cid, Map<capitolo, tag>>`. E gli intrecci personali spariscono: la patch (§8.4) passa al generatore *i sei stati della sala*, non sei stati personali. Il mondo è uno, quello che la sala ha costruito; personali sono solo le scelte dentro quel mondo.

---

## 2 · Fase 1 — Anagrafica e separazione contenuti · *Patch A* · S · ✅ fatta

Nuovo `server/content.js`, che separa i testi dalla meccanica:
- i **14 capitoli** nella forma del §3 (`id`, `anno`, `titolo`, `ruolo`, `votabile`, `mostra_live`, `durata_voto_sec`, `opzione_facile`/`opzione_difficile` con `label` + `guadagno` + `costo_nascosto`)
- i **6 intrecci** nella forma del §4.2, con i quattro esiti nominati e i loro testi
- le **4 varianti** del capitolo 12 in funzione di I5
- i **2 testi** del climax
- i **6 fallback** dell'epilogo individuale

`server/engine.js` resta solo funzioni pure. `ruolo` diventa descrittivo: il ramo `climax: true` che oggi cambia comportamento si sostituisce con `votabile: false` (§3 della patch: «se in app cambia il comportamento in base a questo campo, va rimosso quel ramo»).

**Date narrative.** 14 date nuove, monotone crescenti. Il capitolo 14 si fissa a **2040-10-21** — stesso giorno e mese dell'evento, anno 2040: è la data di riferimento del §8.2 per il calcolo dell'età. Così l'ultimo capitolo e il riferimento dell'età sono **una sola manopola** invece di due che possono divergere.

**Rinomina 2039 → 2040** in `public/main.html`, `public/device.html`, `public/director.html`, `package.json`, `README.md`.

**Testi.** I 22 esiti degli intrecci si portano verbatim dal documento di trama. Le 12 coppie di opzioni sono bozze nuove, scritte tenendo i due consigli che le riguardano: guadagno-vs-costo invece di pro/contro (§Template del Capitolo), e almeno due strade 🔴 scritte come rivendicazioni invece che come astinenze — arte «vieni accreditato e pagato quando il tuo lavoro addestra un modello», scuola «il programma lo scrivono gli studenti». Tutte le bozze sono marcate `// bozza:` nel codice, così si vede a occhio cosa non è ancora passato dall'autore.

I `beats` (il corpo del capitolo sul ledwall) si portano dai capitoli sopravvissuti e si scrivono in bozza per i sei nuovi: 2 compagno digitale, 6 esilio algoritmico, 9 filtri AR, 11 doping neurale, 13 agenti autonomi, 14 lo specchio.

**Check:** 12 votabili su 14 totali, date monotone crescenti, capitolo 1 a 168 giorni, capitolo 14 uguale alla data di riferimento dell'età.

---

## 3 · Fase 2 — Indice e motore degli intrecci · *Patch B, C, D* · L · ✅ fatta

Il cuore della patch.

**`resolve(intreccio, winners)`** è il pseudocodice del §4.5, otto righe. Nodo singolo (I6) con `nodo_chiusura: null` → due esiti. Due nodi → quattro esiti, e l'ordine conta.

**Rivelazione al nodo di chiusura**, non a fine serata (§4.3). Questo ha richiesto una **fase in più nel ciclo di vita**: `closeVote` non avanza, mette la sessione in `revealing` e lascia il capitolo a schermo. Se avanzasse subito, l'interludio dei giorni si infilerebbe tra il voto e la sua conseguenza. La rivelazione mostra sempre la scelta vinta e la forbice finale — anche dove il live era spento, che è il posto giusto dove rivelarla — e l'esito solo sui cinque capitoli che chiudono un intreccio. Il regista avanza con **Avanti ▷**. I6 resta filtrato da `rivela_a_capitolo: 14` in tutte le viste; il regista lo vede, la sala no.

**Indice di Delega**: media delle quote «facile» sui capitoli votati (raccomandazione del §6 — il modello a conteggio fa saltare la barra di 8 punti alla volta e non racconta le sale divise). I capitoli a zero voti restano fuori dal denominatore. Banda basso/medio/alto con soglie configurabili, da passare al generatore del profilo. Soglia del capitolo 13 configurabile, default 50%.

**Capitolo 12** pesca la variante testuale dallo stato di I5 (§4.4).

**Edge case** (§5): pareggio esatto → vince «facile»; zero voti → «facile», con override del regista sempre disponibile; dedup per sessione, che è già così — `currentVotes` è una Map su `cid`, quindi last-write-wins per `(sessione, capitolo)` è già il comportamento (`server/session.js:81`).

**`reopenVote()`** diventa possibile grazie allo stato derivato.

**Check:** i quattro stati forzati su un intreccio a due nodi, i due di I6, I2 che risolve al capitolo 5 e non a fine serata, I6 invisibile alla sala dal capitolo 2 al 13, pareggio esatto, capitolo a zero voti.

---

## 4 · Fase 3 — Voto: timer, forbice, stato PARZIALE · *Patch C, §4.6* · M · ✅ fatta (asset a parte)

**Timer.** `openVote()` fissa un `voteEndsAt` **assoluto** e lo mette nelle viste: i client disegnano il countdown senza interrogare il server. A scadenza il voto si auto-chiude — che risolve di sponda il requisito del §9, «il copione deve funzionare anche se il cruscotto cade»: senza regista la serata avanza comunque.

**`mostra_live`.** Filtra in due punti: `server/session.js:82-85` (l'emissione a ogni voto) e in `mainView()`. A live spento la sala vede **quanti** hanno votato, non **da che parte** — che è la prima mitigazione elencata nella Criticità 2 della trama. La forbice si rivela alla chiusura. Il regista vede sempre tutto.

**Stato PARZIALE.** Il render sul nodo di apertura: a schermo compare qualcosa che si sta formando, senza rivelare cosa. Il posto è la fase `revealing` introdotta in Fase 2 — è già il momento in cui il capitolo mostra cosa ha prodotto, e su un nodo di apertura quello che ha prodotto è mezza figura. Il vincolo del §4.6 è che **non deve far capire il segno**, quindi **un solo asset per tutti e cinque gli intrecci** — non uno per esito, o la sala impara a leggerlo e corregge il voto successivo. L'asset è una dipendenza bloccante per questa fase (§11). Se in prova rivela il segno, si spegne dal dato, non dal codice.

**Loadtest** aggiornato: 90 sessioni che votano nella stessa finestra da 60 secondi.

**Fatto, con due precisazioni.** Il timer manda ai client i **millisecondi residui**, non un istante assoluto: un telefono con l'orologio fuori sincrono vedrebbe un countdown sbagliato, e chi entra a metà finestra deve vedere la barra già scesa al punto giusto. Barra senza cifre su proiettore e telefono — un numero che scende mette fretta.

Sulla mezza figura, il vincolo «non deve far capire il segno» non è solo grafico: **il dato non arriva al browser**. Il messaggio che la accende è un solo booleano, senza id, asse, stato o nome. In una sala di novanta diciottenni con lo smartphone in mano, è l'unica garanzia che tiene. Resta da sostituire il **segnaposto** (blocchi oscurati + barra al 50%) con l'asset disegnato: cambia un solo blocco di HTML, non la logica.

---

## 5 · Fase 4 — Cruscotto regista · *Patch G* · S · ✅ fatta (tranne `rivela_epiloghi`)

Aggiunge: timer con secondi residui, riapri voto, `rivela_epiloghi`, nome dell'esito appena risolto (quello che il narratore deve annunciare), Indice con la sua banda. «Forza esito» esiste già come i due pulsanti Tiebreak, va solo rinominato per quello che fa davvero.

Toglie: la card degli assi del tono, che non serve più a nessuno.

---

## 6 · Fase 5 — Scenario globale · *Patch E* · M · ✅ fatta

Il capitolo 14 si **compone a runtime** dai sei esiti risolti, dall'esito del climax e dal valore dell'Indice. Nessuna tabella di finali: le combinazioni sono 4⁵ × 2 × 2 = 4096, e pre-scriverle è l'errore più costoso possibile in questa patch (§7).

Output: una schermata con i sei esiti nominati e leggibili, che il narratore usa come scaletta per l'ultima parte e che resta consultabile. Sostituisce il blocco `ended` di `public/main.html:124-131`, che oggi ha «2038 → 2039» e il titolo del climax hardcoded.

---

## 7 · Fase 6 — Profilo individuale · *Patch F* · XL · ✅ fatta

L'unica funzione da costruire da zero.

**Onboarding.** `nome` (max 30 caratteri) e `data_nascita` (date picker, non testo libero) su `device:join`. Il `cid` passa da `sessionStorage` a `localStorage`, così una scheda chiusa o un telefono riavviato non perdono la sessione — è la risposta più economica al «sessione persa» del §5.

**Età.** `etaAl(dataNascita, riferimento)` calendario-consapevole: anni, mesi, giorni reali, non aritmetica su 365 giorni. Output `"32 anni, 6 mesi, 31 giorni"`. Caso 29 febbraio coperto da test.

**Derivati per partecipante** (§8.3): `scelte` con i `null` per i capitoli non votati, `indice_personale`, `voti_espressi`, e `voti_in_minoranza` — quest'ultimo è il dato che permette a un epilogo di distinguere chi ha subito il mondo da chi lo ha costruito.

**Generazione.** Finestra: dalla chiusura del voto del capitolo 12, durante i 9 minuti del capitolo 13. Fino a 90 chiamate parallele. I vincoli del §8.4 vanno nel **system prompt**, non nel messaggio utente, così i dati non li possono aggirare. Il nome resta fuori dalla chiamata: segnaposto `{NOME}` interpolato lato client — meno token e nessun dato personale nel payload.

**Fallback obbligatorio**: 6 testi pre-scritti per combinazione di banda dell'Indice × esito del climax, con la stringa età interpolata. Errore o timeout → fallback. Nessuno resta a mani vuote nell'ultimo momento della serata.

**Consegna.** Il testo resta lato server fino a `rivela_epiloghi` dal cruscotto: novanta schermi si accendono insieme quando il narratore lo decide.

**Persistenza.** `data/epiloghi/<token>.json` con `{nome, eta, testo}` — la data di nascita resta in memoria e muore con il processo. Due conseguenze che la patch non nomina:
- `data/` va in `.gitignore`
- serve una **retention dichiarata** (i file si cancellano dopo N giorni). Un link che non scade e il nome di un minore sullo stesso file sono due cose che non stanno insieme senza una decisione scritta.

Effetto collaterale utile: un riavvio del processo dopo il capitolo 12 non perde più gli epiloghi.

Questa fase rompe il principio dichiarato in testa a `server/session.js` — «effimero + anonimo: nessun DB, nessuna PII». Da qui in poi non è più vero, e il commento va aggiornato perché non menta a chi legge il file dopo.

**Test prima dell'evento**: generare qualche centinaio di profili sintetici sulle combinazioni estreme e **rileggerli**. È l'unico modo di sapere cosa produce il modello quando la sala ha fatto un disastro su tutti e cinque gli intrecci.

---

## 8 · Fase 7 — Collaudo

La checklist del §12, uno per uno. Sei voci diventano test automatici in `server/engine.test.js` (i quattro stati di un intreccio, i due di I6, I2 al capitolo 5, pareggio, zero voti, 29 febbraio); le altre sei sono prove in sala: I6 invisibile tra il 2 e il 13, 90 sessioni concorrenti, studente entrato al capitolo 6, timeout AI, `rivela_epiloghi`, caduta del cruscotto a metà evento.

---

## 9 · Ordine e dipendenze

```
Fase 1 (dati) → Fase 2 (motore) → ┬→ Fase 3 (voto + PARZIALE)
                                  ├→ Fase 4 (cruscotto)
                                  └→ Fase 5 (scenario globale)
                       Fase 6 (profilo) ── in parallelo da dopo la Fase 2
                                  ↓
                            Fase 7 (collaudo)
```

Fase 1 e 2 in serie: la seconda ha bisogno dell'anagrafica nuova. Dalla 3 alla 5 in qualunque ordine, toccano file diversi. La 6 è la più grossa e la più indipendente: dopo la Fase 2 può correre in parallelo a tutto.

---

## 10 · Dipendenze non-software aggiornate

Rispetto al §11 della patch, stato dopo la Fase 1:

| Testo | Stato |
|---|---|
| 22 testi di esito degli intrecci | Portati verbatim dalla trama |
| 12 coppie di opzioni di voto | **Bozza** — da rileggere e correggere |
| 4 varianti del capitolo 12 | **Bozza** |
| 2 testi del climax | **Bozza** |
| 6 fallback dell'epilogo | **Bozza** |
| `beats` dei 6 capitoli nuovi | **Bozza** |
| Asset dello stato PARZIALE | **Manca** — bloccante per la Fase 3 |

---

## 11 · Decisioni prese in fase di piano

- **Stato derivato** invece che accumulato, per l'intero motore
- **Intrecci personali eliminati**: il mondo è uno, quello della sala
- **PARZIALE dentro**, con un asset unico per tutti gli intrecci
- **Capitolo 14 e data di riferimento dell'età**: una sola manopola, 2040-10-21
- **Persistenza epiloghi su file**, senza data di nascita, con retention da fissare
