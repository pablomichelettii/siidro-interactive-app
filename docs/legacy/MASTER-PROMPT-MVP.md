---
title: SIIDRO 2026 - Libro Vivo del 2039 - Master Prompt MVP
status: dev-spec
date: 2026-07-08
---

# Master Prompt — MVP "Il Libro Vivo del 2039"

> Prompt di sviluppo per implementare l'MVP multiplayer real-time.
> **Fonte di verità per meccaniche e contenuti:** `SIIDRO 2026 - Libro Vivo - Handoff Decisioni e Meccaniche.md`.
> **Fonte di verità per il contenuto scritto e l'engine di riferimento:** `mvp-libro-vivo.html` (prototipo single-player validato — `CHAPTERS[]`, `INTRECCI[]` e il riduttore nel click-handler vanno **portati verbatim** lato server).
> Ignora ogni documento precedente in caso di conflitto.

---

## 0. Cosa stai costruendo (in una frase)

Un'unica sala di ragazzi vive **una** storia collettiva su un **Main Screen** guidato da un regista; ognuno vota dal proprio telefono; il Main Screen avanza sulla **maggioranza**; il backend traccia in parallelo il **percorso personale di ogni socket anonimo**; alla fine ogni telefono mostra il confronto *"la sala è arrivata a X, tu saresti arrivato a Y"*. Un sistema particellare sul Main Screen mostra in tempo reale la polarizzazione della sala mentre si vota.

---

## 1. Principi architetturali VINCOLANTI

1. **Effimero.** Tutto lo stato vive **in memoria** (una sessione = un processo = una sala). Nessun DB, nessuna persistenza post-partita. Alla chiusura della sessione i dati spariscono.
2. **Anonimo / GDPR-clean.** L'identità dell'utente **è** l'id di sessione del socket. Zero PII, zero login, zero dati personali nei prompt. Il QR porta a una connessione anonima.
3. **Sincrono e rigido nel flusso, divergente nei dati.** Tutti vedono la stessa cosa nello stesso momento (il flusso UI è collettivo); solo la *contabilità dello stato* si biforca per utente.
4. **Un solo processo Node.** Niente microservizi, niente Redis, niente message broker. Stato in memoria. Un evento = un'istanza.
5. **Laziness prescritta.** L'engine narrativo esiste già (MVP): non riscriverlo, portalo. L'"albero" per-utente è lineare → è un `Map` di stati, non un grafo. Il sistema particellare per ~100 pallini è **Canvas 2D**, non serve Pixi/Three (upgrade solo se il conteggio o gli effetti lo richiedono davvero).

---

## 2. Stack

- **Runtime:** Node.js (LTS).
- **HTTP server:** Fastify (serve i tre client statici + healthcheck).
- **Realtime:** Socket.IO (rooms + reconnect + ack gratis).
- **Frontend:** vanilla JS + Canvas 2D (nessun framework richiesto per l'MVP; il prototipo è già vanilla). Tre pagine statiche.
- **LLM (epilogo):** opzionale per l'MVP — vedi §11. Fallback deterministico obbligatorio.

---

## 3. Topologia (3 superfici + 1 server)

```
        ┌──────────────────────────────────────────────┐
        │                 Node process                   │
        │   Fastify (static + REST healthz)              │
        │   Socket.IO  →  Session (in-memory singleton)  │
        └──────────────────────────────────────────────┘
             ▲ role=main      ▲ role=director   ▲ role=device (xN)
             │                │                 │
        ┌────┴────┐     ┌─────┴─────┐     ┌─────┴──────┐
        │ Main    │     │ Regista   │     │ Smartphone │
        │ Screen  │     │ Dashboard │     │ (partecip.)│
        │ (proiet)│     │ (privato) │     │  anonimo   │
        └─────────┘     └───────────┘     └────────────┘
```

Ruolo scelto via query param alla connessione: `/?role=main | director | device`.
- `main` e `director`: un solo client atteso ciascuno (nessuna auth per l'MVP, la dashboard sta su URL non pubblicizzato).
- `device`: N client anonimi (target 50, deve reggere ~100).

Socket.IO rooms: `main`, `director`, `devices`. Il server emette agli insiemi giusti.

---

## 4. Modello di stato (server, in-memory)

```js
// Un solo oggetto Session vivo nel processo.
const session = {
  phase: 'lobby',            // 'lobby' | 'narrating' | 'voting' | 'ended'
  chapterIndex: 0,           // indice in CHAPTERS
  collective: makeState(),   // stato AGGREGATO (guida il Main Screen)
  participants: new Map(),   // socketId -> Participant
  currentVotes: new Map(),   // socketId -> 'facile'|'difficile'  (solo bivio aperto)
};

// Participant
{
  personal: makeState(),     // stato INDIVIDUALE (percorso personale)
  connected: true,
}

// makeState()  — identico al modello dell'Handpoff §3 e all'MVP
function makeState() {
  return { delega: 50, coesione: 0, verita: 0, equita: 0, choices: {}, fired: [] };
}
```

**Doppio binario (la meccanica centrale, da clarification #1):**
- `session.collective` avanza applicando **solo** l'opzione vincente della maggioranza. Guida il Main Screen.
- Ogni `participant.personal` avanza applicando **il voto reale di quel socket** (se ha votato). L'astenuto non riceve delta per quel capitolo (percorso onesto e incompleto).
- Alla fine, per ogni utente si confronta `personal` (dove sarebbe arrivato lui) con `collective` (dove è arrivata la sala).

---

## 5. Engine narrativo (porta dall'MVP, non riscrivere)

**Contenuti:** copia `CHAPTERS` e `INTRECCI` verbatim da `mvp-libro-vivo.html`. Sono il contenuto canonico validato. Ogni opzione ha la forma:
```js
O(testo, tag /* "facile"|"difficile" */, delega /* ±N */, axis /* "coesione"|"verita"|"equita" */, d /* ±1 */, conseguenza)
```
L'ultimo capitolo (`climax:true`) **non ha bivio**: legge lo stato.

**Riduttore (una funzione pura, applicata sia al collettivo sia al personale):**
```js
function applyChoice(state, chapter, opt) {
  state.delega = clamp(state.delega + opt.delega, 0, 100);
  state[opt.axis] = clamp(state[opt.axis] + opt.d, -3, 3);
  state.choices[chapter.id] = opt.tag;
  checkIntrecci(state);        // porta la funzione dall'MVP
  return state;
}
// clamp e checkIntrecci: identici all'MVP.
```

**Attrattore (lettura dello stato, Handoff §3):**
```js
function attractor(delega) {
  if (delega <= 38) return { name: 'Le Mani sul Volante', sub: 'faticoso, ma ancora nostro' };
  if (delega >= 62) return { name: 'Il Pilota Automatico', sub: 'comodo, non più in mano nostra' };
  return { name: 'In bilico', sub: 'alcune soglie tenute, altre no' };
}
```

**Intrecci:** scattano quando *tutti* i nodi dell'intreccio sono stati scelti nello stesso segno (`neg` = tutti `facile`, `pos` = tutti `difficile`). Logica in `checkIntrecci`, già nell'MVP. Calcolati **sia** sul collettivo (per il cruscotto/Main Screen) **sia** sul personale (per l'epilogo del singolo).

> **Nota di architettura (perché NON serve un grafo):** l'Handoff è lineare — tutti i 14 capitoli sono canonici e in ordine fisso (D13), J e l'epilogo *leggono* lo stato (D11). Quindi il "tree traversal" per-utente degenera in un **accumulatore per-socket**: lo stesso `applyChoice` girato sui voti personali. Non costruire strutture ad albero né persistenza a grafo. `Map<socketId, personalState>` è tutto ciò che serve, e resta estendibile se un domani un capitolo ramificasse davvero.

---

## 6. Ciclo di vita / macchina a stati

Le transizioni sono **guidate dal regista** dal suo cruscotto (mai automatiche, tranne il timer di voto opzionale).

| Fase | Trigger → | Effetto server | Main Screen | Smartphone |
|---|---|---|---|---|
| **lobby** | `director:start` | phase='narrating', chapterIndex=0 | QR + conteggio connessi + particelle idle | "Segui lo schermo" |
| **narrating** | `director:openVote` | phase='voting', svuota `currentVotes`, push opzioni ai device | capitolo che scorre + pannello stato collettivo | "Segui lo schermo" |
| **voting** | `device:vote` (N volte) | registra voto in `currentVotes`, emette tally live + evento particella al Main | opzioni + tally live + particelle che migrano | opzioni + timer + "hai votato" (voto modificabile finché aperto) |
| **voting** | `director:closeVote` (o timer) | calcola maggioranza → `applyChoice(collective,...)`; per ogni participant `applyChoice(personal, votoSuo)`; astenuti = nessun delta; chapterIndex++ | mostra esito + stato aggiornato | torna a "Segui lo schermo" |
| … ripete narrating/voting per ogni capitolo con bivio … |
| **ended** | ultimo capitolo (climax) | phase='ended', calcola epilogo collettivo + N epiloghi personali | finale globale + aggregati voti | **resoconto personale + confronto** (§11) |

Pareggio nel voto: **il regista fa da tiebreak** (pulsante sul cruscotto). Fallback automatico se non interviene entro X s: vince `facile` (la deriva comoda è la gravità del sistema — Handoff D4).

---

## 7. Protocollo Socket.IO

**device → server**
- `device:join` → `ack({ sessionId, phase })` — se `phase==='voting'`, invia subito le opzioni correnti.
- `device:vote { option: 'facile'|'difficile' }` → `ack({ ok })`. Ignorato se non in `voting`. Sovrascrive un voto precedente finché il voto è aperto.

**director → server**
- `director:start`, `director:openVote`, `director:closeVote`, `director:tiebreak { option }`, `director:skip`, `director:reset`.

**server → main** (room `main`)
- `main:state { phase, chapter, collectiveState, attractor, connectedCount }`
- `main:options { chapterId, question, options: [{option, text}] }`
- `main:tally { facile, difficile, total }`  (live durante il voto)
- `main:particle { socketId, option }`  (un utente ha votato → sposta il suo pallino)
- `main:participantJoined { socketId }` / `main:participantLeft { socketId }`
- `main:ended { collectiveEpilogue, aggregates }`

**server → director** (room `director`)
- `director:dashboard { phase, chapterIndex, collective: {delega, coesione, verita, equita, fired}, attractor, connectedCount, tally }` — include i **3 assi del tono** (visibili SOLO qui e nell'epilogo, mai sul device — Handoff D7).

**server → device** (room `devices`)
- `device:phase { phase }`
- `device:options { chapterId, question, options }`
- `device:voteAck { option }`
- `device:ended { comparison }` (§11)

---

## 8. Interfaccia — Main Screen (`role=main`)

Proiettato in sala. **Non interattivo** (nessun input). Mostra, per fase:
- **lobby:** titolo + **QR code** verso `/?role=device` + contatore "N collegati" + campo particellare idle.
- **narrating:** il capitolo corrente scrollato dal regista (testo + segnali + contatori animati, stile MVP/ai-2027) + **barra Indice di Delega** + nome attrattore. Assi del tono NON mostrati qui.
- **voting:** la domanda + le due opzioni come **due zone/poli** sullo schermo; **tally live**; il **sistema particellare** (§10) che polarizza. Al `closeVote`: evidenzia l'opzione vincente.
- **ended:** finale globale della sala (attrattore raggiunto + intrecci scattati) + **aggregati dei voti** (% facile/difficile per capitolo).

Porta lo stile visivo dall'MVP (`:root` variabili colore, pannello di stato, contatori con `IntersectionObserver`).

---

## 9. Interfaccia — Smartphone (`role=device`)

Mobile-first, essenziale. Stati:
1. **Readiness:** dopo lo scan → "Sei nel Libro Vivo del 2039. **Segui lo schermo.**"
2. **Attesa (narrating):** resta "Segui lo schermo" (nessun contenuto della storia sul telefono — la narrazione è sul Main Screen).
3. **Voto (voting):** appaiono le opzioni (spinte via WS) + timer. Tap = voto. Feedback "voto registrato", modificabile finché il voto è aperto. Le opzioni **non** sono etichettate facile/difficile (Handoff §5: la comoda deve *sembrare* ragionevole).
4. **Epilogo (ended):** resoconto personale + confronto (§11).

Il device **non** vede mai gli assi del tono né l'Indice numerico.

---

## 10. Sistema particellare (Main Screen) — spec

Obiettivo: rendere **visibile la polarizzazione della sala in tempo reale**, prima del calcolo della maggioranza.

- **Tecnologia:** Canvas 2D. ~100 particelle sono banali per il canvas; niente Pixi/Three per l'MVP. `// ponytail: Canvas 2D basta a 100 pallini; passare a Pixi solo se servono migliaia di particelle o shader.`
- **Una particella per socket connesso.** `main:participantJoined` la crea, `main:participantLeft` la rimuove (fade-out).
- **Idle (lobby / narrating):** drift lento e randomico (moto browniano o rumore di Perlin leggero), particelle sparse al centro.
- **Voting:** lo schermo ha **due poli** (es. sinistra = opzione 1, destra = opzione 2). All'evento `main:particle { socketId, option }` la particella di quel socket riceve un **target** verso il polo scelto (interpolazione morbida, non teletrasporto). Chi non ha ancora votato resta al centro. → la sala *vede* la nuvola separarsi.
- **closeVote:** il polo vincente pulsa/si illumina; opzionale: le particelle perdenti scivolano verso il polo vincente (mostra "la sala si allinea alla maggioranza").
- **Il fisica delle particelle è tutta client-side sul Main Screen.** Il server invia solo eventi (`joined`/`left`/`particle`). Le posizioni sono cosmetiche, non vanno sincronizzate né persistite.
- Performance: un solo `requestAnimationFrame` loop, aggiornamento posizioni O(n). Nessun collision detection.

---

## 11. Epilogo comparativo (la resa del doppio binario)

Al termine, per ogni participant:
```
collectiveFinal = attractor(session.collective.delega) + session.collective.fired
personalFinal   = attractor(participant.personal.delega) + participant.personal.fired
facili_personali / totale_voti_espressi
```
Messaggio sul telefono (device:ended):
> *"La sala è arrivata a **{collectiveFinal.name}**. Ma con le TUE scelte ({n} comode su {tot}), tu saresti arrivato a **{personalFinal.name}**."* + eventuali intrecci personali scattati + la domanda-specchio finale ("E voi del 2026…").

**LLM (opzionale per l'MVP):** se integrato, genera l'epilogo personale con `generateObject` su schema (output ≤200 parole, registro fissato in system prompt, prompt caching). Riceve **solo** il vettore di stato anonimo (delega, assi, choices, fired) — mai PII (non ce n'è). **Fallback deterministico obbligatorio** e sufficiente per l'MVP: template costruito dallo stato (la logica esiste già in `buildClimax` dell'MVP). Se l'LLM manca o fallisce, si usa il template.

---

## 12. Edge cases (comportamento richiesto)

- **Disconnessione device:** Socket.IO reconnect. Per ripristinare `personal` dopo un blip, il client conserva un token in `sessionStorage` e lo re-invia al `device:join`; il server ri-associa lo stato se ancora in memoria. (Resta anonimo ed effimero.) Se lo stato non c'è più, riparte neutro dal capitolo corrente.
- **Join a partita avviata:** entra al capitolo corrente con `personal` neutro (`makeState()`). Non recupera i voti persi. Epilogo su meno capitoli — accettabile.
- **Timeout / non voto:** astensione. Non conta nell'aggregato, nessun delta al `personal`, `choices` resta vuoto per quel capitolo. L'epilogo lo dichiara.
- **Voto multiplo dallo stesso socket:** un solo voto per socket per bivio, sovrascrivibile finché aperto, congelato al `closeVote`.
- **Pareggio:** tiebreak del regista; fallback automatico → `facile`.
- **Crash/refresh del regista o del Main Screen:** lo stato autorevole è nel **server**, non nei loro browser. Al reload si ri-agganciano allo stato corrente (`main:state` / `director:dashboard` inviati su `join`). La sessione sopravvive.
- **Nessun device connesso all'apertura voto:** il regista può comunque chiudere; maggioranza vuota → fallback `facile` (o skip).

---

## 13. Struttura del progetto (proposta minima)

```
/server
  index.js         // Fastify + Socket.IO bootstrap, static serving
  session.js       // Session singleton, macchina a stati, transizioni
  engine.js        // CHAPTERS, INTRECCI, makeState, applyChoice, checkIntrecci, attractor  (port da MVP)
  protocol.js      // handler eventi socket per ruolo
/public
  main.html/.js    // Main Screen + canvas particellare
  device.html/.js  // Smartphone
  director.html/.js// Cruscotto regista
  style.css        // porta le :root variabili dall'MVP
package.json
```
`// ponytail: 3 pagine statiche + 1 processo. Nessun bundler necessario per l'MVP.`

---

## 14. Definition of Done (MVP)

1. QR sul Main Screen → uno smartphone si connette anonimo e vede "Segui lo schermo".
2. Il regista fa partire e scorre; all'`openVote` il telefono riceve le opzioni.
3. Più telefoni votano; il Main Screen mostra tally live **e** le particelle che si polarizzano verso i due poli.
4. Al `closeVote` la maggioranza avanza il Main Screen; ogni `personal` viene aggiornato col voto reale del suo socket.
5. Un utente che vota sistematicamente diverso dalla maggioranza riceve alla fine un `personalFinal` **diverso** dal `collectiveFinal` — verificabile.
6. Reload del regista e del Main Screen non perdono la sessione.
7. All'`ended`: Main Screen mostra finale globale + aggregati; ogni telefono mostra il confronto personale.
8. Zero dati persistiti su disco; alla chiusura del processo tutto sparisce.

**Test minimo richiesto:** un self-check che, dato un insieme di voti simulati (sala vota A, un utente vota B su ogni bivio), verifica che `collective` e quel `personal` divergano e che gli intrecci scattino correttamente. (Riusa il riduttore puro: nessun framework, un assert.)

---

## 15. Scope guard — cosa NON costruire nell'MVP

- ❌ Database, account, login, persistenza post-evento (clarification #3, #4).
- ❌ Ink/Twine o qualsiasi engine di branching esterno (l'engine è già l'array MVP).
- ❌ Strutture a grafo/albero per i percorsi (sono lineari → `Map` di stati).
- ❌ Pixi/Three (Canvas 2D basta a 100 particelle).
- ❌ Fasi di lettura autonoma sul device (il device è un vote-pad; la narrazione è sul Main Screen — clarification #2).
- ❌ Media generati live, timeline strutturalmente divergenti dopo J (l'epilogo *legge* lo stato).
- ⚠️ **Aperto, da decidere in scrittura, non ora:** compressione del ritmo (capitoli-Pressione "passivi" per ridurre i voti da 12 a ~7-8, Handoff §8). L'MVP tiene tutti i bivi dell'array.
```
