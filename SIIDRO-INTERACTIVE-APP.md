# siidro-interactive-app — specifica del fork

Fork di `n5d-future-book` (*Il Libro Vivo del 2040*). Stessa architettura, stessa grafica,
stesse transizioni. Cambiano tre cose: **il flusso non è più un racconto**, **si aggiunge
una chat moderata**, **il brand** (fatto: §3).

Questo documento è il contratto: cosa si cancella, cosa si tiene, cosa si scrive.
Va letto accanto al `README.md` del repo originale, che resta valido per deploy e loadtest.

---

## Stato dei lavori — 14 settembre 2026

**Fatto: tutta la specifica, chat compresa.** Motore narrativo cancellato,
`content.js` nella forma a `ESEMPI`, N opzioni end-to-end (server, proiettore,
telefono, regia), `goto` con l'elenco nel cruscotto, interludio senza date,
accoglienza col solo nome, brand SIIDRO, chat moderata, loadtest aggiornato.
`npm test` verde, e due giri completi provati dal vivo — uno col loadtest a
dodici client, uno sulla chat (rifiuti, troncamento, approvazione, silenzio).

**Fatto anche:** il brand (§3), col titolo **SIIDRO ICT Company Summit**, e i
cinque esempi veri in `content.js` — tono da tavolo riservato, domande aperte su
preventivi svalutati, junior e agenti, modello di business, conto economico e
dato del cliente nei modelli pubblici. I `counter` dentro i beats sono
segnaposto: vanno sostituiti con un dato citabile o tolti.

**Da fare, in ordine:**

1. Una **prova in sala col proiettore vero**. Si decidono lì, non qui: durata
   della wheel (`HOLD`, oggi 1,2s), leggibilità di quattro poli con guadagno e
   costo, permanenza delle bolle (`CHAT_BOLLA_MS`, oggi 12s) e se la banda bassa
   regge o serve il ripiego dell'elenco fisso (§2.4).
2. `README.md` — parla ancora del Libro Vivo e rimanda a file che ora stanno in
   `docs/legacy/`.
3. I `counter` negli esempi sono numeri segnaposto: dato citabile, o si tolgono.
4. Residui morti da cancellare: `.fired.*` in `style.css`, `.epilogo` in
   `device.html`, la riga sugli epiloghi in `.gitignore`.
5. Le due decisioni di §5: quanti esempi stanno in un'ora, e il deploy.

Dettaglio per sezione:

| § | Stato |
|---|---|
| 1.1 cancellazione | ✅ fatto — `engine.js` fuso in `session.js` e cancellato, con `engine.test.js` |
| 1.2 forma `ESEMPI` | ✅ fatto — cinque esempi votabili (da 3 a 4 opzioni) + uno di chiusura non votabile, scritti sul tono SIIDRO |
| 1.3 N opzioni, server | ✅ fatto — `tally()` a mappa di tag, pareggio al primo dell'ordine |
| 1.3 N opzioni, frontend | ✅ fatto — poli generati da JS, griglia a wrap, colore per indice |
| 1.4 `goto` + elenco in regia | ✅ fatto — elenco con stato «da fare / in corso / votato» e un «Vai» per riga |
| 1.5 fasi e rivelazione | ✅ fatto — rivelazione a N conteggi, via `esito` e mezza figura |
| 1.6 interludio senza date | ✅ fatto — resta la wheel con occhiello + titolo; `HOLD` da ritarare in sala |
| 1.7 accoglienza solo nome | ✅ fatto — server, `device.html` e `device.js`: un campo, il nome |
| 2 chat | ✅ fatto — coda di approvazione, validazione server-side testata, bolle sul proiettore, card in regia, cinque variabili in `.env.example` |
| 3 brand | ✅ fatto — palette lime su nero, Inter, titolo «SIIDRO ICT Company Summit» |
| 4 repo | ✅ `package.json`, docs legacy in `docs/legacy/`, `.env.example` ripulito |
| 5.1 colonna destra | ✅ colonna singola, come da default assunto |
| 5.2 schermata finale | ✅ entrambe: riepilogo sul proiettore, «tu vs il tavolo» sul telefono |
| loadtest | ✅ `SCENARIO` è ora una cifra per esempio = indice dell'opzione |

---

## 0. Cosa NON si tocca

Queste sono le parti che devono arrivare identiche dall'altra parte. Non sono negoziabili
perché sono l'identità visiva dell'applicazione.

| Cosa | Dove |
|---|---|
| Il *sistema* di palette, font e spaziature | `public/style.css` (`:root`, tutto in custom properties). I **valori** sono cambiati col brand SIIDRO (§3); la struttura no |
| Sistema di particelle (flocking + polarizzazione al voto) | `public/main.js:14-115` |
| Animazione della ruota / interludio | `public/main.js:187-258` (il *contenuto* cambia, il movimento no) |
| Timeline GSAP di entrata capitolo, voto, rivelazione | `public/main.js:262-348` |
| Architettura: un processo Node, Fastify + Socket.IO, stato in memoria, niente DB | `server/index.js`, `server/session.js` |
| Stato **derivato**, non accumulato (`history` → viste) | `server/session.js`, `server/engine.js` |
| Tre superfici sullo stesso server (`?role=main` / `?role=director` / device via QR) | `public/index.html` |
| Reconnect via `cid` in `localStorage` | `public/device.js:7` |
| Timer di voto server-side, con chiusura automatica | `server/session.js:105-119` |

---

## 1. Il flusso nuovo: esempi, non capitoli

### 1.1 Cosa cade

Il motore attuale calcola un mondo: sei intrecci che si aprono e si chiudono, un Indice di
Delega, un climax che legge l'Indice contro una soglia, uno scenario globale composto a
runtime, un epilogo personale generato da un LLM. **Serve tutto al racconto. Senza racconto,
non calcola più niente.** Si cancella, non si riadatta.

**File da eliminare:**

- `server/epilogo.js` — generazione LLM, fallback, persistenza, retention
- `tools/prova-epiloghi.mjs` — banco di prova degli epiloghi
- `data/epiloghi/`, `data/prove-epiloghi/`

**Funzioni da eliminare in `server/engine.js`:**

`statoIntreccio` · `indiceDelega` · `banda` · `esitoClimax` · `esitiVisibili` · `chiudeA` ·
`apreA` · `componiScenario` · `contaParziali` · `testoOracolo` · `etaAl` · `formattaEta` ·
`isDataValida` · la costante `GRUPPI`

Di `engine.js` sopravvivono `derive()` (ridotta ai soli `winners`) e `opzioni()` (da
generalizzare, vedi §1.3). È realistico che il file finisca sotto le 40 righe: a quel punto
**va fuso dentro `session.js` e cancellato**. Un modulo per due funzioni è cerimonia.

**Export da eliminare in `server/content.js`:**

`INTRECCI` · `ORACOLO_PER_I5` · `CLIMAX` · `SOGLIA_CLIMAX` · `BANDE` · `FALLBACK` ·
`REF_2040` · `START_DATE`

**Da eliminare in `server/session.js`:**

`generaEpiloghi` · `rivelaEpiloghi` · `personalView` · `consensusCount` · i campi
`epiloghiRivelati`, `generazione`, `generazionePromise` · l'helper `interpola` · i campi
`nascita` ed `eta` del partecipante

**Da eliminare in `server/index.js`:**

la rotta `GET /e/:token` · l'import di `epilogo.js` · la chiamata a `pulisciVecchi()` ·
il gestore `director:rivelaEpiloghi`

**Variabili d'ambiente che spariscono:**

`OPENROUTER_API_KEY` · `OPENROUTER_MODEL` · `OPENROUTER_BASE_URL` · `EPILOGO_TIMEOUT_MS` ·
`EPILOGO_MAX_TOKENS` · `EPILOGO_PARALLELE` · `EPILOGHI_DIR` · `EPILOGHI_RETENTION_GIORNI`

Restano: `PORT`, `DIRECTOR_TOKEN`. Vanno aggiunte quelle della chat (§2.6).

> **Conseguenza da tenere a mente:** senza epilogo l'app torna a essere quasi anonima. A
> disco non finisce più nulla (`data/` sparisce dal progetto), il nome vive in memoria e
> muore col processo. È una semplificazione grossa anche sul piano privacy, e va detta ai
> docenti nella stessa riga in cui oggi si spiega la data di nascita.

### 1.2 Cosa prende il loro posto

Un **esempio** è autonomo. Non apre niente, non chiude niente, non lascia traccia sullo stato
del mondo. Ha un testo, una domanda, da due a quattro risposte, un voto, una rivelazione.

Nuova forma di `server/content.js` — un solo export:

```js
export const ESEMPI = [
  {
    id: "deepfake",                 // stabile: il regista ci salta sopra, sta negli URL e nei log
    titolo: "Il video che non è mai successo",
    occhiello: "Identità sintetica",   // sostituisce il campo `anno` nel layout (stessa classe .year)
    beats: [ /* … come oggi: il corpo dell'esempio, stessa struttura */ ],

    votabile: true,                 // false = esempio che si discute e basta, senza voto
    durata_voto_sec: 60,            // 0 = nessun timer, chiude solo il regista
    mostra_live: false,             // se true la sala vede la forbice mentre vota

    q: "Cosa fai?",
    opzioni: [                      // da 2 a 4
      { tag: "a", label: "…", guadagno: "…", costo_nascosto: "…" },
      { tag: "b", label: "…", guadagno: "…", costo_nascosto: "…" }
    ],

    chiusura: "…"                   // opzionale: cosa mostra la rivelazione oltre all'opzione vinta
  }
];
```

Note sulla forma:

- `tag` è arbitrario (`"a"`, `"b"`, `"denuncio"`, quel che si vuole) purché **unico dentro
  l'esempio**. Non c'è più `facile`/`difficile`, e con loro sparisce il giudizio implicito:
  negli esempi slegati non esiste una "strada comoda" da misurare.
- `guadagno` e `costo_nascosto` restano perché sono il cuore della schermata di voto
  (`main.js:368-375`) e il motivo per cui la scelta non è banale.
- Gli `id` **non** vanno riordinati o riusati tra un evento e l'altro.

### 1.3 Da due opzioni a N (2–4)

È il pezzo di lavoro più grosso del fork, ed è tutto frontend. Punti da toccare:

**`server/`** — meccanico, poche righe:

| Punto | Oggi | Domani |
|---|---|---|
| `engine.js:191` `opzioni()` | costruisce a mano `facile`/`difficile` | ritorna `{ q, opts: ch.opzioni }` |
| `session.js:226` `tally()` | due contatori | `Map<tag, n>` costruita dai tag dell'esempio corrente, **zero incluso** |
| `session.js:131` `closeVote()` | `difficile > facile ? … : "facile"` | vince il tag col conteggio più alto; **a parità vince il primo nell'ordine di `opzioni`** |
| `session.js:237` `tallyPerSala()` | annulla i due numeri | annulla tutti i conteggi, tiene `total` |
| `session.js:288` `revealView()` | cerca `opzione_facile`/`_difficile` | `ch.opzioni.find(o => o.tag === ultimo.winner)` |
| `session.js:146` `history.push` | `{ facile, difficile, … }` | `{ id, titolo, conteggi: {tag: n}, winner }` |

La regola del pareggio va scritta esplicitamente nel codice **e** nel cruscotto, perché con
quattro opzioni i pareggi smettono di essere rari. Il regista deve poter forzare comunque:
`director:closeVote({ option: tag })` esiste già e continua a funzionare.

**`public/main.js`** — fatto così (era il pezzo più grosso del fork):

- `polePos()` non conosce più i poli: legge dal DOM quelli che `renderPoles()` ha disegnato
  e ne mette le coordinate in `poles[tag]`. Le posizioni restano quelle vere del layout.
- `setOrbit()` prende il colore da `coloreTag`, riempita per indice dell'opzione dalla scala
  `--pole-1..4` del brandboard. Nessun colore inventato a runtime.
- `swarm()` non è stata toccata: funzionava già con qualunque numero di cluster.
- I poli sono generati da `renderPoles()`, e si ridisegnano **solo** quando cambiano davvero
  le opzioni — rigenerarli a ogni sync farebbe ripartire le animazioni sotto le particelle.
  La griglia va a wrap (`auto-fit`), e con più di due opzioni la classe `.stretta` accorcia
  i testi.
- `showTally()` cicla sui poli renderizzati e legge `tally.conteggi[tag]`.

**`public/device.js`** — già cicla su `view.options.opts` (`device.js:44`): funziona con N
senza modifiche. Va solo verificato che 4 bottoni stiano in un telefono piccolo senza scroll
durante il voto: se non ci stanno, il voto si perde.

**`loadtest/`** — la variabile `SCENARIO=` codifica dodici lettere `f`/`d`. Con tag liberi
o si generalizza (una lettera per indice di opzione) o si toglie. Il resto del loadtest
(connessioni, voti, latenza) va tenuto: è l'unico modo di sapere se la sala regge.

### 1.4 Ordine: sequenza fissa, salto libero

Esiste un ordine di default (l'ordine dell'array `ESEMPI`), e `Avanti ▷` lo segue come oggi.
**In più** il cruscotto mostra l'elenco completo e il regista può saltare a un esempio
qualsiasi, avanti o indietro, se la discussione porta altrove.

Nuovo comando: `director:goto({ id })`.

```
goto(id):
  se phase === "voting" → rifiuta (prima si chiude il voto: saltare via da un voto aperto
                                   lascia i telefoni con dei bottoni che non contano più)
  chapterIndex = indice di `id` in ESEMPI
  phase = "narrating"
  broadcast()
```

Non cancella la `history`: se si torna a un esempio già votato, quel voto resta registrato
e il regista lo vede. Se vuole rivotarlo usa `reopenVote()`, che già fa il `pop` giusto.

Il cruscotto marca ogni esempio con tre stati: **da fare** · **in corso** · **votato**
(con l'opzione che ha vinto). Serve perché in sala, saltando, si perde il conto.

### 1.5 Le fasi restano quelle

`lobby → narrating → voting → revealing → ended`, identiche. Cambia solo cosa ci sta dentro.

**Rivelazione** (`revealView`): opzione vinta, forbice completa di tutti i tag, il
`costo_nascosto` di quello che ha vinto, e la `chiusura` se c'è. Spariscono `esito` e
`parziale` (erano intrecci). Sparisce il blocco `PARZIALE_HTML` in `main.js:323`.

**Fine serata** (`ended`): non c'è più uno scenario globale da comporre. Resta la lista
degli esempi affrontati con cosa ha scelto la sala. Vedi il punto aperto in §5.

### 1.6 L'interludio: la ruota senza le date

L'animazione «N giorni nel futuro» resta come movimento, perde il contenuto: non c'è più una
cronologia 2027→2040 da percorrere.

Quello che cade in `public/main.js:187-258`:
- `buildTrack()` — il nastro dei giorni con i mesi
- `heatCells()` / `runHeatGrid()` (`main.js:134-166`) — la griglia dei giorni caldi
- `daysBetween`, `fmtDate`, `MONTHS_IT`, le costanti `PPD`, `START_HOLD`
- i campi `startDate`, `endDate`, `prevDate` in `mainView()`
- il contatore `#iDays` / `#iDaysLabel` in `main.html:138-141`

Quello che resta: la **wheel** — il titolo che nasce grande al centro e si rimpicciolisce
nella sua posizione a riposo (`WHEEL_SCALE`, `REST_SCALE`, `WHEEL_CY` in `main.js:190-192`).
È l'effetto riconoscibile, ed è indipendente dalle date. Mostra **occhiello + titolo**
dell'esempio, e `startTransition()` (`main.js:427`) si semplifica: niente più `from`/`to` in
giorni, solo il titolo nuovo.

Il costante `SCROLL_DUR = 2.4` va **ritarato**: senza nastro da percorrere, 2,4 secondi di
transizione su un titolo fermo sono lunghi. Partire da ~1,2s e provarlo in sala col
proiettore vero, non sul portatile.

### 1.7 Accoglienza: solo il nome

`device.html:60-73` perde il campo data di nascita e tutto il testo che lo spiega. Resta un
campo: **nome o nickname**, max 30 caratteri, obbligatorio — firma i messaggi in chat.

`device.js:108-120` si riduce di conseguenza: via il controllo sulla data futura, via
`isDataValida` lato server (`session.js:71-74`).

Il nome va validato lato server come oggi (`trim`, `slice(0,30)`) **e** va escapato ovunque
finisca in `innerHTML` — sul main screen adesso ci finisce a ogni messaggio.

---

## 2. La chat

Requisito: durante il voto, dal telefono si scrivono messaggi che compaiono sul main screen,
leggibili da tutta la sala.

### 2.1 Regole

| | |
|---|---|
| **Quando si scrive** | solo a `phase === "voting"`. La casella compare con le opzioni e sparisce alla chiusura del voto. |
| **Moderazione** | **coda di approvazione**. Nessun messaggio arriva sul main screen se il regista non lo manda. |
| **Dove appare** | overlay sopra le particelle, a bolle che salgono e svaniscono. |
| **Firma** | il nome dell'accoglienza. Nessun anonimo. |
| **Persistenza** | nessuna. In memoria, muore col processo, come i voti. |

### 2.2 Protocollo

**Device → server**
```
device:chat { testo }   →  ack { ok: true }              accodato, in attesa
                        →  ack { ok: false, motivo }     rifiutato (vedi §2.3)
```

**Server → device** (solo al mittente, sul suo socket)
```
device:chatState { id, stato }    stato: "attesa" | "pubblicato" | "rifiutato"
```
Il mittente deve sapere che fine ha fatto il suo messaggio, o riscrive. Tre stati bastano.

**Server → regia**
```
director:chatQueue [ { id, cid, nome, testo, ts } ]      la coda completa, a ogni cambiamento
```

**Regia → server**
```
director:chatApprove { id }      → pubblica sul main screen
director:chatReject  { id }      → scarta, il mittente lo sa
director:chatMute    { cid }     → silenzia quel partecipante per il resto della serata
director:chatClear   {}          → svuota la coda (a voto chiuso, per ripartire puliti)
```

**Server → main**
```
main:chat { id, nome, testo }    un messaggio approvato, da far salire
```

### 2.3 Validazione (lato server, non negoziabile)

Sono controlli a un confine di fiducia: novanta telefoni che scrivono su un proiettore.
Vanno fatti **sul server**, indipendentemente da cosa fa il client.

```
rifiuta se phase !== "voting"              motivo: "chiuso"
rifiuta se cid è mutato                    motivo: "silenziato"
rifiuta se testo.trim() è vuoto            motivo: "vuoto"
tronca  testo a 140 caratteri              (lunghezza leggibile da 20 metri, non un romanzo)
rifiuta se < 5s dall'ultimo msg dello stesso cid   motivo: "aspetta"
rifiuta se il cid ha già N msg in coda (default 2) motivo: "aspetta"
rifiuta se la coda globale supera 200              motivo: "coda piena"
```

L'escaping HTML va fatto **in rendering** su tutte e tre le superfici (`main`, `director`,
`device`): l'helper `esc` esiste già in `server/index.js:14` e `public/device.js:65`, va
spostato in un punto solo e riusato. Nessun `innerHTML` con testo utente non escapato.

Non serve un filtro parolacce: c'è un umano che approva, ed è più bravo di qualunque lista.

Due cose decise scrivendo il codice, oltre all'elenco:

- **`motivo: "senza nome"`** — un partecipante senza nome non scrive. «Nessun anonimo»
  (§2.1) è un requisito di cosa va a schermo, e va fatto rispettare dove si decide, cioè
  qui: l'accoglienza obbliga al nome, ma un `cid` vecchio in `localStorage` no.
- **Silenziare svuota anche la sua coda.** Pubblicare dopo aver zittito qualcuno è
  l'opposto di quello che il regista ha appena chiesto.

L'helper `esc` vive in `public/esc.js`, caricato da tutte e tre le pagine prima del
proprio script. Il testo viaggia grezzo e si escapa **in rendering**: il server non
compone più HTML, quindi è lì che serve.

### 2.4 Sul main screen

- Le bolle entrano dal basso, salgono, svaniscono. GSAP, coerente con il resto.
- **Massimo 3 bolle contemporanee.** Le altre restano in coda e entrano quando c'è posto.
- **Permanenza ~12 secondi.** Da calibrare in sala col proiettore vero: il requisito è
  "leggibili da tutti", e una bolla che passa in 4 secondi dal fondo aula non si legge.
  `CHAT_BOLLA_MS` va tenuta come costante in cima al file, non sparsa nelle timeline.
- Font display, corpo grande, nome in ocra e testo in bianco. Ombra o pannello semi-opaco
  dietro: le particelle sotto rendono illeggibile il testo bianco su bianco.
- Le bolle non devono coprire i poli di voto né la domanda. Con 4 opzioni lo spazio si
  stringe: vanno confinate in una banda laterale o bassa dell'overlay, non al centro.
- `prefers-reduced-motion`: niente salita, comparsa e scomparsa in dissolvenza. La costante
  `REDUCED` esiste già (`main.js:7`).

> **Tensione da risolvere in prova:** bolle effimere e "leggibile da tutti" tirano in
> direzioni opposte. Se in sala non si leggono, il ripiego è un elenco fisso degli ultimi
> 3 messaggi in una fascia bassa — meno bello, ma è il requisito che conta.

### 2.5 Sul cruscotto

Una card **Chat da approvare**, nella colonna dei comandi:
- ogni messaggio con nome, testo, e da quanto è in attesa
- due bottoni grossi: **Pubblica** / **Scarta**
- un **Silenzia** per partecipante
- il conteggio della coda sempre visibile, anche quando la card è chiusa

Il regista in sala guarda il palco, non lo schermo. I bottoni vanno dimensionati per essere
premuti senza mirare, e **Pubblica** deve essere quello che si becca per sbaglio — non
**Scarta**.

### 2.6 Nuove variabili d'ambiente

| Var | Default | Note |
|---|---|---|
| `CHAT_ATTIVA` | `1` | `0` disattiva la chat ovunque: serve se un istituto non la vuole |
| `CHAT_MAX_CHARS` | `140` | tetto sul messaggio |
| `CHAT_COOLDOWN_MS` | `5000` | tra due messaggi dello stesso partecipante |
| `CHAT_MAX_IN_CODA` | `2` | messaggi in attesa per partecipante |
| `CHAT_BOLLA_MS` | `12000` | permanenza sul main screen |

---

## 3. Il brand — applicato

Titolo dell'evento: **SIIDRO ICT Company Summit**. Posizionamento: *un tavolo, non un palco*.

Il brandboard sta tutto in custom properties, `public/style.css:6-30`. Le variabili sono
state rinominate per nome di ruolo, non di tinta — un `--ochre` che contiene del lime è
esattamente il tipo di cosa che si paga alle due di notte prima dell'evento:

| Prima | Adesso | Valore |
|---|---|---|
| `--bg-slate` | `--bg` | `#0a0a0a` — dark mode, dominante |
| `--bg-black` | `--ink` | `#111111` — testo su lime o su fondo chiaro |
| — | `--card` | `#1e1e1e` — card, sfondi secondari, divisori |
| `--ochre` | `--accent` | `#ccff00` — lime: CTA, keyword, alto impatto |
| `--terra` | `--accent-2` | `#ffffff` |
| `--font-serif` | `--font-text` | Inter (Google Fonts) + Helvetica/system-ui di fallback |

I quattro poli di voto hanno una scala dedicata, `--pole-1..4`: lime e bianco sono
brandboard, gli altri due sono gradini della stessa scala. Non sono colori nuovi inventati
a runtime: servono solo a tenere distinti quattro gruppi di particelle su fondo nero. Se il
designer del brand ne ha di suoi, si sostituiscono lì, in un punto solo.

Fatto anche fuori dal CSS: `public/main.js:4` (`POLI`, duplicati perché il canvas non legge
le custom properties), il QR in `server/index.js` (`#0a0a0a` su bianco: il lime su nero non
si scansiona), i `<title>` e i testi di lobby/regia/telefono, `package.json`.

Tolta la grana analogica su `body::after`: era texture da stampa, fuori registro con un
brandboard high-tech minimal.

Restano coerenti col vecchio brand — e cadono col rifacimento del frontend (§1.3, §1.6) —
le regole `.fired.*` e `.hg-cell` in `style.css` / `main.html`: sono CSS di intrecci e
heatgrid, cioè di roba già cancellata lato server.

---

## 4. Il repo

Fork con la storia, non copia-incolla: la storia di `n5d-future-book` spiega perché metà
delle scelte sono come sono, e serve quando qualcosa si rompe in sala.

```bash
git clone https://<origine>/n5d-future-book.git siidro-interactive-app
cd siidro-interactive-app
git remote rename origin upstream          # l'originale resta raggiungibile
git remote add origin <url-del-nuovo-repo>
git checkout -b master
git push -u origin master
```

Poi, in ordine:

1. `package.json` → `name: "siidro-interactive-app"`, `description`, versione a `0.1.0`
2. Cancellare quello che sta in §1.1 — **prima** di scrivere codice nuovo. Cancellare per
   ultimo significa riadattare cose che stavi per buttare.
3. `.env.example` → via le variabili degli epiloghi, dentro quelle della chat
4. `README.md` → riscritto: deploy e loadtest restano validi, il flusso in sala no
5. `MASTER-PROMPT-MVP.md`, i quattro `SIIDRO 2026 - …md`, `mvp-libro-vivo.html` →
   sono la specifica del *racconto*. Vanno in `docs/legacy/` o fuori: lasciarli in radice
   significa che qualcuno tra sei mesi li legge come se fossero questa app.

**Da tenere assolutamente:** `server/engine.test.js` e `server/session.test.js`. Vanno
riscritti insieme al motore, non dopo. Perdono i test su intrecci/Indice/climax e ne
guadagnano su: vittoria con N opzioni, regola del pareggio, `goto` che rifiuta a voto aperto,
e tutta la validazione della chat (§2.3) — che è logica a un confine di fiducia e senza un
test si rompe in silenzio.

---

## 5. Punti ancora aperti

Da decidere prima di scrivere codice sulle prime due, le altre possono aspettare.

1. **La colonna destra del main screen si svuota.** Oggi tiene Indice di Delega, esiti,
   contatore (`main.html:186-198`): tutto materiale del racconto. Le opzioni sono: colonna
   a una sola colonna (più spazio ai 4 poli di voto, raccomandato), oppure la colonna resta
   e ospita l'elenco degli esempi già affrontati. **Default assunto: colonna singola.**

2. **La schermata finale.** Senza scenario globale, cosa resta? Il riepilogo degli esempi
   con la scelta della sala esiste già (`#aggregates`, `main.js:391`) e costa zero. Sul
   telefono la griglia di frecce "tu vs la sala" (`device.js:70-81`) funziona ancora perché
   i voti per `cid` ci sono: sono ~30 righe da tenere in vita per un finale personale che
   altrimenti non c'è. **Default assunto: si tengono entrambi.**

3. **Chi scrive gli esempi, e quanti.** L'app regge qualunque numero, ma il ritmo in sala no:
   oggi sono 12 bivi da 60 secondi. Con la discussione in mezzo e la chat da moderare,
   8-10 esempi sono probabilmente già troppi per un'ora.

4. **Nome, palette, dominio.** Vedi §3.

5. **Deploy.** Oggi: `/var/www/next5000days`, pm2 `next5000days`, nginx su
   `next5000days.pablomicheletti.it`. Il fork gira sulla stessa macchina con un'altra porta
   e un altro server block, o su un'altra macchina? Se coabitano, le due app non devono
   condividere `PORT` né il nome pm2.

---

## 6. Ordine di lavoro consigliato

1. ✅ Fork del repo, `package.json`, docs legacy spostati
2. ✅ **Cancellazione** (§1.1) — l'app deve tornare verde su `npm test` con il motore ridotto
3. ✅ `content.js` nuovo: due esempi finti, da due opzioni, per far girare tutto
4. ✅ Generalizzazione a N opzioni (§1.3), server e frontend
5. ✅ Interludio senza date (§1.6) — `SCROLL_DUR` sostituito da `HOLD`, ancora da ritarare in sala
6. ✅ Accoglienza col solo nome (§1.7)
7. ✅ Chat: server e validazione (§2.2, §2.3) → cruscotto (§2.5) → bolle sul main (§2.4)
8. ✅ `goto` e lista degli esempi sul cruscotto (§1.4)
9. Loadtest ✅ · **una prova in sala col proiettore vero** ⬜ **prossimo passo**, prima di
   scrivere i testi definitivi: leggibilità delle bolle e ritmo della transizione si
   decidono lì, non qui
10. ✅ Brand (§3)
