---
title: SIIDRO 2026 - Patch funzionale applicativo
tags:
  - SIIDRO
  - sviluppo
  - specifica
destinatario: Paolo
versione: 1.0
date: 2026-08-05
annotato: 2026-08-06 — note di implementazione Fasi 1-6
---

# SIIDRO 2026 — Patch funzionale all'app "Libro Vivo del 2040"

**Destinatario:** Paolo · **Riferimento:** [[SIIDRO 2026 - Evento Scuole - Proposta Storia dal Futuro]] · **Versione:** 1.0

> ⚙️ **Note di implementazione.** I blocchi marcati ⚙️ sono aggiunti in fase di sviluppo: rispondono ai «da verificare» della specifica e registrano le conseguenze che l'implementazione ha avuto sul copione. Non modificano la specifica, la annotano. Piano di lavoro: [[SIIDRO 2026 - Piano Implementazione Patch]]. Stato al 6 agosto 2026: **tutte le fasi implementate**. Restano le dipendenze non-software (testi da rileggere, asset della mezza figura) e le prove in sala.

---

## 0 · In due righe

L'app oggi presenta i capitoli e raccoglie i voti. La revisione della trama cambia **l'anagrafica dei capitoli**, sostituisce il motore degli intrecci con una versione **a tre esiti invece di due**, e aggiunge l'unica funzione davvero nuova: la **generazione del profilo individuale di ogni studente** a fine serata.

Tutto il resto (presentazione capitolo, contatore giorni nel futuro, raccolta voti, contatori a schermo) resta com'è.

---

## 1 · Quadro d'insieme

| Area | Stato | Impatto sviluppo |
|---|---|---|
| A · Anagrafica capitoli | Da aggiornare | Basso — dati, non logica |
| B · Motore intrecci | **Da riscrivere** | Medio-alto — il cuore della patch |
| C · Regole di voto | Da formalizzare | Basso-medio |
| D · Indice di Delega | **Da definire** — oggi non è specificato da nessuna parte | Medio |
| E · Scenario globale finale | Nuovo | Medio |
| F · Profilo individuale + AI | **Nuovo — l'implementazione extra** | Alto |
| G · Cruscotto regista | Da verificare se esiste | Medio |

⚠️ **Prima di iniziare:** verificare quale anagrafica capitoli è effettivamente a database. La revisione della trama ha cambiato quattro capitoli su quattordici, e non è detto che l'app parta dalla versione aggiornata.

> ⚙️ **Verificato — il sospetto era fondato, e non c'è nessun database.** I capitoli erano hardcoded in `server/engine.js`, in **13 voci della versione pre-revisione**: c'erano ancora Memoria, Medicina, Prompt e Lucca, mancavano Compagno digitale, Esilio algoritmico, Tasto muto e Doping neurale, e gli anni erano slittati (Deepfake stava al 2028 invece del 2029). Il capitolo 14 non esisteva affatto: il finale era una fase a parte con «2038 → 2039» scritto a mano nell'HTML.
>
> I testi ora stanno in `server/content.js`, separati dalla logica, così chi scrive e chi programma non si toccano. Il resto dello stato è **derivato** invece che accumulato: `derive(history)` ricava Indice, banda, stato dei sei intrecci e climax dall'elenco dei vincitori. È per questo che «riapri voto» e «forza esito» sono diventati un `pop` di una lista invece di logica di annullamento.

---

## 2 · Decisioni già prese

Non ci sono decisioni bloccanti: il motore si può iniziare oggi. Tre punti chiusi, da implementare così come sono.

**2.1 · Nessuna soglia asimmetrica.** Il motore è **simmetrico**: maggioranza semplice (50,1%) per tutti gli esiti, negativi e positivi. Non serve nessuno stato intermedio tipo "vittoria di misura", e non c'è nessun parametro di soglia da esporre oltre al 50,1%.

**2.2 · Voto singolo.** Un solo voto per capitolo, facile o difficile. Nessun doppio voto, nessuna domanda di previsione affiancata alla scelta personale: il modello dati del voto resta quello che è.

**2.3 · Un interruttore per la forbice in diretta.** Durante il voto la sala vede i due contatori muoversi. Serve però poter **spegnere quella visualizzazione capitolo per capitolo** — cioè un campo `mostra_live` con valore vero/falso su ogni capitolo, che l'app legge per decidere se disegnare i numeri o tenerli nascosti fino alla chiusura del voto.

Il motivo è narrativo: su alcuni capitoli (deepfake, social credit, filtri AR) mostrare la forbice fa parte del punto — la sala vede sé stessa accodarsi mentre il narratore le sta raccontando il conformismo. Su altri l'effetto gregge falserebbe soltanto il risultato. Non serve decidere adesso su quali capitoli sì e su quali no: serve che l'interruttore esista, per poterlo tarare in prova senza toccare il codice.

---

## 3 · Patch A — Anagrafica capitoli

14 capitoli, 2027→2040. I capitoli **1-12 si votano**, il 13 e il 14 no.

```json
{
  "id": 1,
  "anno": 2027,
  "titolo": "L'estate in cui ci siamo accorti del clima",
  "ruolo": "pressione",
  "votabile": true,
  "mostra_live": true,
  "durata_voto_sec": 60,
  "opzione_facile": { "label": "...", "guadagno": "...", "costo_nascosto": "..." },
  "opzione_difficile": { "label": "...", "guadagno": "...", "costo_nascosto": "..." }
}
```

| # | Anno | Titolo | Ruolo | Votabile |
|---|---|---|---|---|
| 1 | 2027 | L'estate in cui ci siamo accorti del clima | Pressione | Sì |
| 2 | 2028 | Il compagno digitale | Delega | Sì |
| 3 | 2029 | L'elezione che nessuno aveva votato (Deepfake) | Delega | Sì |
| 4 | 2030 | Quando l'arte smise di avere un autore | Delega | Sì |
| 5 | 2031 | La generazione senza mestiere | Pressione | Sì |
| 6 | 2032 | L'esilio algoritmico (Social Credit) | Pressione | Sì |
| 7 | 2033 | Quando hanno chiuso le scuole | Pressione | Sì |
| 8 | 2034 | Il giudice di silicio | Delega | Sì |
| 9 | 2035 | Il tasto muto sulla realtà (Filtri AR) | Delega | Sì |
| 10 | 2036 | La piccola guerra dei dati | Delega | Sì |
| 11 | 2037 | Il doping neurale | Delega | Sì |
| 12 | 2038 | L'oracolo che si era sbagliato | Delega | Sì |
| 13 | 2039 | Agenti Autonomi | Climax | **No** |
| 14 | 2040 | Lo Specchio | Chiusura | **No** |

**Rispetto alla versione precedente della trama:**
- **Rimossi:** Memoria (2030), Medicina (2032), Prompt (2036), Lucca (2037)
- **Aggiunti:** Esilio algoritmico / Social Credit (2032), Tasto muto sulla realtà / Filtri AR (2035), Doping neurale (2037)
- **Cambio anno:** il capitolo finale è **2040**, non 2039. Il 13 è 2039.

**Nota su `ruolo`:** oggi non ha più effetto sulla meccanica — Pressioni e Deleghe si votano allo stesso modo. Resta un campo descrittivo, utile solo al copione. Se in app cambia il comportamento in base a questo campo, va rimosso quel ramo.

**Da verificare:** il contatore "giorni nel futuro" (168 per il 2027) è calcolato dalla data evento o è un valore fisso a database? Se è fisso, servono i valori aggiornati per tutti i 14 anni, incluso il nuovo 2040.

> ⚙️ **Verificato — è calcolato**, quindi non servono i quattordici valori: `giorni = data_capitolo − data_evento`. Con data evento 21 ottobre 2026 e capitolo 1 al 7 aprile 2027 fanno esattamente **168**, il numero della specifica. C'è un assert che lo protegge: se qualcuno sposta la data dell'evento, il test lo dice.
>
> Una scelta presa qui: il **capitolo 14 è fissato al 21 ottobre 2040**, cioè stesso giorno e mese dell'evento. Così è *la stessa data* del riferimento per il calcolo dell'età (§8.2) — una manopola sola invece di due che possono divergere senza che nessuno se ne accorga.
>
> Sul campo `ruolo`: il ramo che cambiava comportamento c'era (`climax: true`) ed è stato rimosso. Ora il comportamento lo decide solo `votabile`, e `ruolo` è descrittivo come chiede la specifica.

---

## 4 · Patch B — Motore degli intrecci

### 4.1 · Cosa cambia

Ci sono **sei intrecci**: cinque a due nodi e uno a nodo singolo.

I cinque a due nodi hanno **quattro esiti risolvibili** invece di due:

| Voto nodo apertura | Voto nodo chiusura | Esito |
|---|---|---|
| facile ↘ | facile ↘ | `NEGATIVO` |
| difficile ↗ | difficile ↗ | `POSITIVO` |
| facile ↘ | difficile ↗ | `TERZA_VIA_PENTIMENTO` |
| difficile ↗ | facile ↘ | `TERZA_VIA_RESA` |

Non esiste più lo stato "silenzioso": **ogni intreccio produce sempre un pezzo di mondo**. L'ordine conta — il nodo di apertura è sempre quello cronologicamente precedente.

Il sesto (I6, capitolo 2) è a **nodo singolo**: un voto, due esiti (`NEGATIVO` / `POSITIVO`), nessuna terza via, perché non c'è un secondo voto che possa contraddire il primo.

### 4.2 · Modello dati

```json
{
  "id": "I1",
  "asse": "Ecologico-Tecnologico",
  "nodo_apertura": 1,
  "nodo_chiusura": 10,
  "esiti": {
    "NEGATIVO":              { "nome": "Il buio a punteggio",  "testo": "..." },
    "POSITIVO":              { "nome": "La rete di quartiere", "testo": "..." },
    "TERZA_VIA_PENTIMENTO":  { "nome": "La toppa",             "testo": "..." },
    "TERZA_VIA_RESA":        { "nome": "La toppa",             "testo": "..." }
  }
}
```

Per I6, `nodo_chiusura` è nullo e gli esiti sono solo due:

```json
{
  "id": "I6",
  "asse": "Affettivo-Relazionale",
  "nodo_apertura": 2,
  "nodo_chiusura": null,
  "rivela_a_capitolo": 14,
  "esiti": {
    "NEGATIVO": { "nome": "La stanza mai vuota",           "testo": "..." },
    "POSITIVO": { "nome": "L'amico che poteva dirti no",    "testo": "..." }
  }
}
```

I sei intrecci e i loro nodi:

| ID | Asse | Apre | Chiude | Nome ↘ | Nome ↗ | Nome ⇅ |
|---|---|---|---|---|---|---|
| I1 | Ecologico-Tecnologico | cap. 1 | cap. 10 | Il buio a punteggio | La rete di quartiere | La toppa |
| I2 | Rilevanza Umana | cap. 4 | cap. 5 | L'eclissi del senso | Il mestiere ritrovato | L'arte in teca |
| I3 | Legale e Sociale | cap. 6 | cap. 8 | La morte civile | L'appello che resta possibile | Il doppio binario |
| I4 | Verità e Relazioni | cap. 3 | cap. 9 | La bolla paranoica | Il patto di realtà | La realtà a intermittenza |
| I5 | Apprendimento e Autonomia | cap. 7 | cap. 11 | Il cortocircuito cognitivo | La testa allenata | La generazione cerniera |
| I6 | Affettivo-Relazionale | cap. 2 | — | La stanza mai vuota | L'amico che poteva dirti no | *(nessuna)* |

I testi degli esiti sono nel documento di trama, sezione "Gli intrecci".

### 4.3 · Quando si risolvono

Un intreccio a due nodi si risolve **nel momento in cui chiude il voto del suo nodo di chiusura**, e il testo dell'esito va mostrato lì — non a fine serata. Ordine effettivo:

| Capitolo | Cosa risolve |
|---|---|
| 2 | I6 si **determina** (voto unico) ma **non si mostra** |
| 5 | I2 |
| 8 | I3 |
| 9 | I4 |
| 10 | I1 |
| 11 | I5 |
| 12 | **Ri-legge I5** con un testo aggiuntivo (vedi 4.4) |
| 13 | Legge l'Indice di Delega |
| 14 | Compone tutto, **incluso I6** (vedi Patch E) |

⚠️ Due note per la scaletta:
- **I2 chiude al capitolo 5**, cioè in prima metà. Non è un errore: è l'unico intreccio a due nodi che si risolve prima dell'intervallo.
- **I6 si vota al capitolo 2 e si tiene nascosto** fino allo scenario finale. Tecnicamente il suo stato è noto dal capitolo 2, ma non deve comparire da nessuna parte visibile alla sala prima del capitolo 14.

> ⚙️ **Questo requisito ha aggiunto una battuta al copione, e va messa in scaletta.**
>
> «Mostrare l'esito lì» richiede un posto dove stare. Chiudere il voto **non fa più avanzare** la serata: il capitolo resta a schermo in una fase nuova, la *rivelazione*. Il motivo è concreto: avanzando subito, l'interludio «giorni nel futuro» si infilava **tra il voto e la sua conseguenza** — undici mesi narrativi tra la scelta e l'esito che quella scelta aveva appena prodotto, che è esattamente il contrario di quello che il capoverso qui sopra chiede.
>
> La rivelazione mostra: cosa ha scelto la sala, il costo nascosto di quella scelta, la forbice finale, e — solo sui cinque capitoli che chiudono un intreccio — l'esito col suo nome. Sui sette capitoli che aprono e non chiudono resta muta, perché non c'è niente da annunciare.
>
> **Conseguenza per il narratore: tre battute per capitolo invece di due.** Apri voto → Chiudi voto → Avanti. Con il timer della Fase 3 (che chiude da sé allo scadere) tornano due. Il blocco «Bivio» del copione va ripensato con questa terza battuta dentro i suoi 2,5 minuti: la pausa in cui il narratore annuncia il nome dell'esito è un tempo reale, non una transizione.
>
> Verificato che scatti a 5, 8, 9, 10, 11 e in nessun altro punto — in particolare **muto al capitolo 2**, che è la voce di collaudo su I6.

### 4.4 · Il capitolo 12 dipende da I5

Il capitolo 12 (Oracolo) non apre nessun intreccio: mostra un testo determinato dallo stato di I5, quindi servono **quattro varianti testuali** aggiuntive:

| Stato I5 | Cosa accade all'Oracolo |
|---|---|
| `NEGATIVO` | Né occhi né spina dorsale: non si accorgono dell'errore e non lo fermano |
| `POSITIVO` | Entrambi: si accorgono e fermano |
| `TERZA_VIA_PENTIMENTO` | Spina dorsale ma non occhi: vorrebbero fermarlo e non capiscono dove è l'errore |
| `TERZA_VIA_RESA` | Occhi ma non spina dorsale: vedono l'errore perfettamente e non fermano niente |

### 4.5 · Pseudocodice

```
risolvi_intreccio(I):
    a = esito_maggioranza(I.nodo_apertura)     # "facile" | "difficile"

    # I6 — nodo singolo: due soli esiti
    if I.nodo_chiusura is null:
        return NEGATIVO if a == "facile" else POSITIVO

    b = esito_maggioranza(I.nodo_chiusura)

    if a == "facile"    and b == "facile":     return NEGATIVO
    if a == "difficile" and b == "difficile":  return POSITIVO
    if a == "facile"    and b == "difficile":  return TERZA_VIA_PENTIMENTO
    if a == "difficile" and b == "facile":     return TERZA_VIA_RESA
```

Nessuna soglia oltre alla maggioranza semplice: `esito_maggioranza()` restituisce semplicemente il lato che ha preso più voti (per il pareggio vedi 5).

### 4.6 · Opzionale — l'intreccio che si accende a metà

Feature di trama non ancora decisa, ma da valutare **prima** di chiudere la UI perché aggiunge uno stato al ciclo di vita: quando chiude il voto del nodo di apertura, l'intreccio entra in stato `PARZIALE` e a schermo compare qualcosa che si sta formando (sagoma, barra al 50%, titolo oscurato) senza rivelare cosa sia. Si completa al nodo di chiusura.

Vincolo importante: la rappresentazione parziale **non deve far capire il segno** (buono/cattivo), altrimenti la sala corregge il voto successivo. Serve quindi un asset unico, indipendente dall'esito che si sta formando.

> ⚙️ **Deciso: si fa, ed è in Fase 3.** Lo stato costa meno di quanto sembrasse: essendo lo stato derivato, `PARZIALE` non va salvato da nessuna parte — è per definizione «questo intreccio ha un vincitore sul nodo di apertura e non ancora sulla chiusura», cioè una domanda che si fa al motore. Il conteggio esiste già.
>
> E ha già un posto dove vivere: la fase di *rivelazione* introdotta al §4.3. È lo stesso momento in cui il capitolo mostra cosa ha prodotto — su un nodo di chiusura è l'esito, su un nodo di apertura è la mezza figura. Nessuna quarta fase da inventare.
>
> **Fatto in Fase 3, con un segnaposto al posto dell'asset.** La meccanica c'è: sui sei capitoli che aprono un intreccio la rivelazione mostra una mezza figura — una riga di blocchi oscurati dove andrà il nome, una barra ferma al 50%, e «Qualcosa ha cominciato a formarsi. Si vedrà più avanti.» Identica su tutti, e senza colore di segno.
>
> Una precisazione sul vincolo «non deve far capire il segno»: non basta che la grafica sia neutra, **il dato non deve nemmeno arrivare al browser**. Il messaggio che accende la mezza figura contiene un solo booleano: niente id dell'intreccio, niente asse, niente stato, niente nome. Quello che non viene mandato non si legge dagli strumenti dello sviluppatore — e in una sala di novanta diciottenni con lo smartphone in mano, quella è l'unica garanzia che tiene.
>
> **Nota sul capitolo 2.** La mezza figura si mostra anche lì, dove I6 si vota. Tecnicamente I6 è già risolto in quel momento e non ha un nodo di chiusura da aspettare, ma dal punto di vista della sala è esattamente la stessa cosa: qualcosa è stato piantato e si vedrà alla fine. Senza questo, il capitolo 2 sarebbe l'unico in cui un voto non produce niente di visibile — il contrario di «ogni intreccio produce sempre un pezzo di mondo».
>
> **Resta l'asset disegnato**, che sostituisce il segnaposto senza toccare la logica. Non è più bloccante per il codice, lo è per la messa in scena.

---

## 5 · Patch C — Regole di voto

- **Maggioranza semplice dei votanti.** Chi non vota non entra nel denominatore.
- **Sala fino a 90 studenti** → indicativamente ~46 voti decidono un capitolo. Dimensionare per 90 sessioni concorrenti.
- **Cambio di idea consentito** fino allo scadere del timer: vale l'ultima scelta registrata (last-write-wins su `(sessione, capitolo)`).
- **Forbice live** secondo il flag `mostra_live` del capitolo.
- **Durata del voto configurabile per capitolo** (`durata_voto_sec`). Il blocco "Bivio" nel copione dura 2,5 minuti in tutto, quindi la finestra effettiva sta indicativamente tra 45 e 90 secondi — da tarare in prova.

**Edge case da gestire esplicitamente:**

| Caso | Comportamento richiesto |
|---|---|
| Pareggio esatto 50/50 | Serve una regola. *Proposta: vince "facile"* — la comodità che passa per inerzia è anche coerente col tema. Alternativa: il regista sblocca dal cruscotto |
| Zero voti su un capitolo | Non bloccare la serata: fallback a "facile" o scelta del regista, da decidere |
| Studente che entra a metà evento | Ammesso. I capitoli già chiusi restano non votati per lui: il profilo individuale deve gestire scelte mancanti (vedi 8.3) |
| Sessione persa / telefono scarico | Se possibile, ripresa sessione via link o codice. Da valutare quanto vale l'investimento |
| Doppio voto dallo stesso device | Deduplicare per sessione, non per IP (studenti sulla stessa rete dati) |

> ⚙️ **Stato di queste regole.**
> - **Maggioranza semplice, pareggio → facile, zero voti → facile**: fatti, con override del regista sempre disponibile. Entrambi coperti da test.
> - **Cambio di idea / dedup per sessione**: già così da prima. I voti stanno in una mappa su chiave sessione, quindi last-write-wins su `(sessione, capitolo)` è il comportamento naturale, non una regola aggiunta.
> - **90 sessioni concorrenti**: verificato. 90 client, 90 voti su 90 a ogni bivio, ~40ms per round, i 12 bivi più i due capitoli narrati fino alla fine. Al ritmo massimo i voti arrivano tutti nello stesso istante, quindi è una condizione più dura della finestra da 60 secondi, non più facile.
> - **Forbice live**: fatto. A live spento la sala vede **quanti** hanno votato ma non da che parte (i due numeri diventano `···`), e la forbice si rivela alla chiusura — che è la prima mitigazione elencata nella Criticità 2 della trama. La regia vede sempre i numeri veri, e legge a schermo se la sala sta vedendo o no. Impostato come suggerisce la trama: acceso su deepfake, social credit e filtri AR, spento sugli altri nove.
> - **`durata_voto_sec`**: fatto, e il timer **non esisteva**, è stato costruito. Sta sul server, non sul client: alla scadenza il voto si chiude da sé. Ai client arrivano i **millisecondi residui**, non un istante assoluto, così un telefono con l'orologio fuori sincrono non vede un countdown sbagliato — e chi entra a metà finestra vede la barra già scesa al punto giusto. Barra senza cifre, sul proiettore e sul telefono: un numero che scende mette fretta, una barra dà il tempo che resta senza contarlo. Durata `0` = nessun timer, chiude solo il regista.
> - Una decisione che la specifica non copriva: **un capitolo con zero voti ha un vincitore per fallback ma non una quota**, quindi resta fuori dal denominatore dell'Indice. Contarlo come 100% di «facile» avrebbe fatto pesare sull'Indice un capitolo in cui nessuno ha detto niente.

---

## 6 · Patch D — Indice di Delega

⚠️ **Questo indicatore è citato in tutta la trama ma non è mai stato definito numericamente.** Va deciso, perché il capitolo 13 si legge esclusivamente su di esso.

Due modelli possibili:

| Modello | Formula | Pro |
|---|---|---|
| **Conteggio** | numero di capitoli su 12 in cui ha vinto "facile" → 0-12 | Semplice da spiegare dal palco |
| **Media delle quote** | media della quota "facile" sui 12 capitoli → 0-100% | Si muove in modo continuo, molto meglio per una barra sul ledwall |

*Raccomandazione: media delle quote.* Con il modello a conteggio la barra salta di 8 punti alla volta e non racconta le sale divise.

Il capitolo 13 legge l'Indice contro una **soglia configurabile** (default 50%):
- Indice ≥ soglia → esito ↘ "smisero di chiederci permesso"
- Indice < soglia → esito ↗ "La soglia che ha tenuto"

Serve anche una **banda** (basso / medio / alto) da passare al generatore del profilo individuale, per non fargli interpretare un numero grezzo.

> ⚙️ **Fatto, col modello raccomandato:** media delle quote «facile», 0-100, arrotondata. Soglia del capitolo 13 configurabile, default 50%. Bande configurabili: basso sotto 34, alto da 67, medio in mezzo. Il cruscotto mostra Indice, banda, e **quale esito del climax uscirebbe se la serata finisse adesso** — utile in prova per capire dove sta andando la sala prima di arrivare al 13.

---

## 7 · Patch E — Scenario globale

La schermata finale collettiva è la composizione di:
- i **6 stati degli intrecci** — 5 coppie a quattro esiti possibili, più I6 a due
- l'**esito del climax** (capitolo 13)
- il **valore dell'Indice**

⚠️ **Non pre-scrivere i finali globali.** Le combinazioni sono 4⁵ × 2 × 2 = **4096**. Lo scenario globale va **composto a runtime** dai frammenti già scritti, non selezionato da una tabella di finali. È l'errore più costoso possibile in questa patch.

Output atteso: una schermata con i sei esiti nominati e leggibili, che il narratore usa come scaletta per l'ultima parte, e che resta consultabile.

> ⚙️ **Fatto.** Nessuna tabella di finali: quello che si compone a runtime non è il testo, è il **raggruppamento**. I sei esiti si dispongono per cosa hanno fatto al mondo — *si è rotto*, *è cambiato a metà strada*, *ha tenuto* — e i gruppi vuoti non compaiono. Sei fatti slegati diventano una frase su questa sala, che è anche la scaletta del narratore: «tre rotti, due a metà, uno tenuto». Il cruscotto la mostra in una riga.
>
> L'ordine non fabbrica speranza: *ha tenuto* è in fondo, ma se non ha tenuto niente quel gruppo non esiste e la schermata finisce su quello che è rimasto rotto. Chiude il climax, che è l'unica cosa a non essere un intreccio.
>
> **Correzione di dove stava.** Lo scenario era sulla schermata di fine partita, cioè *dopo* il capitolo 14 — il capitolo che compone mostrava tre righe di testo e nient'altro, e la composizione arrivava quando il narratore era già andato oltre. Adesso vive nel capitolo 14 e la schermata finale tiene la stessa, senza ricomporla: è così che «resta consultabile».
>
> Provato su cinque sale diverse. Una sala che cede sempre: sei rotti. Una che regge: sei tenuti. Una che si pente a metà: due rotti, tre a metà, uno tenuto. Sono mondi diversi, non lo stesso finale con parole diverse.
>
> ⚠️ **Una cosa emersa dalla prova, da decidere in taratura.** Tutte e tre le sale «di mezzo» sono finite a Indice 50 e hanno preso lo stesso climax negativo, perché la soglia è `≥` — come dice il §6, e coerente col pareggio che va a «facile». Ma se in prova le sale reali si assestano tutte attorno al 50, l'esito positivo del climax non uscirà mai. La leva è `SOGLIA_CLIMAX`, che è configurabile apposta.

---

## 8 · Patch F — Profilo individuale (implementazione nuova)

L'unica funzione davvero da costruire da zero. Obiettivo: alla fine, **ogni studente riceve sul proprio telefono una "giornata tipo nel 2040"** che incrocia la sua età esatta, le sue scelte personali e il mondo che la sala ha costruito.

> ⚙️ **Fatta.** Accoglienza con nome e data di nascita, età calendario-consapevole, generazione, fallback, `rivela_epiloghi` e link di rilettura.
>
> **Provider: OpenRouter**, API OpenAI-compatibile chiamata con `fetch`. Nessuna dipendenza aggiunta al progetto. Lo **slug del modello è da confermare** sul catalogo OpenRouter: se è sbagliato la chiamata fallisce e parte il fallback, che è comunque il comportamento voluto, ma nessuno riceverebbe un testo scritto per lui.
>
> **Il nome non entra mai nella chiamata**, come chiede la specifica: il modello scrive `{NOME}` e `{ETA}` e il server interpola dopo. La specifica diceva «lato client»; lo fa il server, perché la stessa interpolazione serve anche alla pagina del link, che è statica. La proprietà che conta — nessun dato personale nel payload — è identica.
>
> **Senza chiave la serata regge lo stesso**: tutti ricevono uno dei 6 fallback. Ed è così che è stata collaudata, il che copre in pieno la voce «timeout della generazione AI → fallback consegnato».
>
> **Un bug trovato dai test dell'età, che vale la pena registrare.** Il primo algoritmo prendeva in prestito i giorni dal mese precedente — l'approccio da manuale. Va in negativo per chi è nato il 31 di un mese quando il mese prestante ne ha 28, 29 o 30: cioè proprio intorno al 29 febbraio, il caso che il §12 chiede di collaudare. Ora i giorni si contano davvero, avanzando la data di nascita di anni+mesi e misurando il resto. Verificato su 4000 date di nascita: i campi restano nei loro intervalli e chi nasce dopo non risulta mai più vecchio.
>
> ⚠️ **Il principio in testa al codice della sessione era «effimero e anonimo, nessun DB», e da oggi non è più vero** — riscritto, così non mente a chi legge. In memoria stanno nome e data di nascita; **a disco va solo l'epilogo salvato**: nome, stringa dell'età e testo. La data di nascita non finisce mai su file, non per delicatezza ma perché non serve — l'età è già calcolata. Retention di default **30 giorni**, con la cartella `data/` in `.gitignore`.

### 8.1 · Onboarding

Due campi in accoglienza, in sessione browser:

| Campo | Tipo | Vincoli |
|---|---|---|
| `nome` | testo libero | max 30 caratteri. Nome o nickname |
| `data_nascita` | data gg/mm/aaaa | date picker, non testo libero |

### 8.2 · Calcolo dell'età

Serve una **data di riferimento fissa nel 2040**. *Proposta: stesso giorno e mese dell'evento, anno 2040* (coerente con "il libro è scritto fra 14 anni").

- Calcolo **calendario-consapevole**: anni, mesi, giorni reali. Non aritmetica su 365 giorni, o le cifre finali risultano visibilmente sbagliate
- Output nel formato dell'esempio: `"32 anni, 6 mesi, 31 giorni"`
- Edge case: nati il 29 febbraio

### 8.3 · Dati raccolti per studente

```json
{
  "sessione_id": "...",
  "nome": "Mario",
  "eta_2040": "32 anni, 6 mesi, 31 giorni",
  "scelte": [
    { "capitolo": 1, "voto": "facile" },
    { "capitolo": 2, "voto": "difficile" },
    { "capitolo": 3, "voto": null }
  ],
  "indice_personale": 58,
  "voti_in_minoranza": 4,
  "voti_espressi": 11
}
```

Due campi derivati che valgono molto e costano poco:
- **`indice_personale`** — la sua quota personale di scelte "facili", da confrontare con quella della sala
- **`voti_in_minoranza`** — quante volte ha votato contro la maggioranza. È il dato più potente disponibile per un epilogo: *"quattro volte su dodici hai provato a fermarli"*. Senza questo, gli epiloghi di chi ha subito il mondo e di chi lo ha costruito suonano identici

### 8.4 · Generazione

**Quando.** Tutti i dati sono definitivi alla chiusura del voto del capitolo 12. Il capitolo 13 dura 9 minuti e non prevede voti: **è la finestra di generazione**. Fino a 90 chiamate parallele in 9 minuti è ampiamente sostenibile e non lascia nessuno in attesa.

**Payload al modello:** stringa età, elenco delle 12 scelte, i 6 stati degli intrecci, l'esito del climax, banda dell'Indice, `voti_in_minoranza`.

Il nome può restare fuori dalla chiamata: si fa restituire il testo con un segnaposto `{NOME}` e si interpola lato client. Meno token e nessun dato personale nel payload.

**Output richiesto:** italiano, seconda persona, registro intimo e retrospettivo, **massimo 200 parole**, apertura sul modello `"Mario, nel 2040 avrai 32 anni, 6 mesi, 31 giorni. Vivi in un mondo..."`.

**Vincoli da fissare nel system prompt** (non nel messaggio utente, così non sono aggirabili dai dati):
- Mai previsioni su morte, malattia o condizioni di salute dello studente o dei suoi familiari
- Niente contenuti medici, psichiatrici, romantici o sessuali
- Niente tono moraleggiante o giudicante sulle scelte fatte
- **Chiudere sempre su un elemento di agentività** — mai su un vicolo cieco
- Restare dentro il mondo determinato dagli stati passati: non inventare eventi non presenti negli intrecci

**Fallback obbligatorio.** Se la generazione va in errore o in timeout, serve un testo pre-scritto per combinazione di *banda Indice × esito climax* (indicativamente 6 varianti), con la stringa età interpolata. Nessuno studente deve restare a mani vuote: è l'ultimo momento della serata.

**Test prima dell'evento:** generare qualche centinaio di profili sintetici coprendo le combinazioni estreme, e rileggerli. È l'unico modo di sapere cosa produce il modello quando la sala ha fatto un disastro su tutti e cinque gli intrecci.

### 8.5 · Consegna

Il testo generato **resta lato server e non compare sul telefono** fino a un comando esplicito dal cruscotto regista (`rivela_epiloghi`). Serve a rendere possibile la messa in scena: il narratore chiude lo scenario globale, dice "adesso guardate il telefono", e novanta schermi si accendono insieme.

Da prevedere anche la **persistenza**: un link o QR che permetta di rileggere il proprio 2040 nei giorni successivi. È ciò che riapre la conversazione a casa.

---

## 9 · Patch G — Cruscotto regista

Da verificare se esiste già. Il narratore deve poter leggere e comandare dal palco (o un tecnico per lui):

**Lettura:** capitolo corrente, stato del voto, timer, forbice live, esito appena risolto con il nome da annunciare, valore dell'Indice.

**Comandi:** apri/chiudi voto, riapri voto, prossimo capitolo, forza esito (per pareggi e guasti), `rivela_epiloghi`.

Il copione deve funzionare anche se il cruscotto cade: il narratore va messo in condizione di proseguire a voce senza numeri.

> ⚙️ **Verificato: il cruscotto esisteva già**, con inizia, apri/chiudi voto, forza esito (si chiamavano «Tiebreak»), salta, reset; e leggeva capitolo, collegati, indice, forbice, intrecci.
>
> Aggiunti: **riapri voto**, **Avanti ▷** per la nuova battuta di rivelazione, Indice con banda, il climax che uscirebbe adesso, e la card **Da annunciare** — il nome dell'esito appena risolto col suo testo e il suo asse, che è la richiesta di questo paragrafo. Rimossa la card degli assi del tono (coesione/verità/equità): non è citata da nessuna parte in questa patch e non serviva più a nessuno.
>
> Poi aggiunti in Fase 3: **timer** con secondi residui, e l'indicazione se la sala sta vedendo la forbice o no. Resta solo **`rivela_epiloghi`**, che dipende dalla Fase 6 — non esiste ancora niente da rivelare.
>
> Sul «se il cruscotto cade»: la risposta non era un pezzo di UI, era il **timer che chiude il voto da sé**. Verificato via socket con la regia che tace: il voto si è chiuso da solo a 1503ms su una finestra di 1500, il voto arrivato prima dello scadere è stato contato, e la serata è passata alla rivelazione senza che nessuno premesse niente. Il narratore deve solo continuare a parlare.
>
> ⚙️ **Fase 4 — c'era un bug che sarebbe uscito a metà serata.** Il cruscotto trattava *qualunque* errore di connessione come «token errato» e sostituiva la pagina con un messaggio di accesso negato: irrecuperabile senza ricaricare. Ma quell'errore lo tira anche un blip di rete, e il client di suo si riconnette da solo. Un secondo di wifi ballerino al minuto 90 avrebbe cancellato il cruscotto per il resto della serata. Ora si distingue: `unauthorized` è il token, tutto il resto è la rete.
>
> E la caduta silenziosa era il caso peggiore: numeri fermi che sembrano veri sono peggio di nessun numero. Ora la perdita di connessione si vede — banda rossa, KPI sbiaditi, comandi spenti, «prosegui a voce».
>
> Altre tre cose che servono a chi guida dal palco e che la specifica non elencava:
> - **I comandi si accendono solo quando hanno senso.** Un pulsante che non fa niente, sul palco, è indistinguibile da un pulsante che non ha funzionato.
> - **«Da leggere adesso».** Ai capitoli 12 e 13 il narratore ha un testo da dire ad alta voce — la variante che dipende da I5, il verdetto sull'Indice. Stavano solo sul proiettore, cioè dietro le spalle di chi parla.
> - **«Poi», e se il capitolo pianta o raccoglie.** Il capitolo successivo con l'indicazione se si vota, e per quello corrente se apre un intreccio (si pianta e basta) o ne chiude uno (c'è un nome da annunciare). Serve al ritmo, non ai numeri.

---

## 10 · Fuori scope

Cose deliberatamente **non** da costruire, per evitare che rientrino dalla finestra:
- Lettura individuale autonoma dei capitoli sull'app — la narrazione è tutta dal vivo
- Personaggio-AI con cui chattare
- Funzioni per il confronto in piccoli gruppi
- Il capitolo su Lucca e gli altri capitoli rimossi
- Output stampato (da decidere separatamente, non è codice)

---

## 11 · Dipendenze non-software

Testi che l'app deve ospitare e che **non esistono ancora**:
- 12 coppie di opzioni di voto (label + guadagno + costo nascosto)
- 22 testi di esito degli intrecci (5 coppie × 4 stati, più I6 × 2 stati) — le bozze sono nel documento di trama
- 4 varianti testuali del capitolo 12 in funzione di I5
- 2 testi del climax (capitolo 13)
- 6 testi di fallback per l'epilogo individuale
- Eventuale asset dello stato `PARZIALE`, se si adotta

> ⚙️ **Stato al 5 agosto.** I 22 esiti degli intrecci sono **portati verbatim dal documento di trama**, con una sostituzione deliberata: il positivo di I1 usa la versione sensoriale del consiglio «gli esiti positivi hanno bisogno di immagini, non di comunicati» — l'assemblea del giovedì, i 18 gradi scelti da voi — invece della frase da comunicato stampa.
>
> Tutto il resto esiste come **bozza di sviluppo, marcata `bozza:` nel codice**, e va riletta e corretta dall'autore: le 12 coppie di opzioni, le 4 varianti del capitolo 12, i 2 climax, i 6 fallback, più i testi di scena dei sei capitoli nuovi (2, 6, 9, 11, 13, 14) che il §11 non elencava ma che il ledwall mostra.
>
> Nelle bozze delle opzioni sono applicati i due consigli che le riguardano: guadagno-vs-costo invece di pro/contro, e due strade 🔴 scritte come rivendicazioni invece che come astinenze — arte «vieni accreditato e pagato quando il tuo lavoro addestra un modello», scuola «il programma lo scrivono gli studenti».
>
> Una scelta narrativa non decisa che ho preso per poter scrivere: nei sei capitoli nuovi ho tenuto **Marta come personaggio ricorrente**, che è il consiglio della trama e costa zero. Se non piace si cambia in un file solo.
>
> ⚠️ L'**asset `PARZIALE` non è più «eventuale»**: la funzione è stata adottata e l'asset blocca la Fase 3. Serve una figura sola, uguale per tutti e cinque gli intrecci.

---

## 12 · Checklist di collaudo

- [x] Forzare tutti e quattro gli stati su un intreccio a due nodi e verificare il testo mostrato — *motore verificato da test; il testo **a schermo** non ancora guardato in un browser*
- [x] Forzare i due stati di I6 e verificare che compaiano **solo** al capitolo 14
- [x] Verificare che I2 si risolva al capitolo 5 e non a fine serata
- [x] Verificare che lo stato di I6 non sia visibile alla sala tra il capitolo 2 e il 13
- [x] Pareggio esatto 50/50
- [x] Capitolo con zero voti
- [x] 90 sessioni concorrenti che votano nella stessa finestra di 60 secondi — *verificato al ritmo massimo, cioè tutti nello stesso istante*
- [x] Studente entrato al capitolo 6: profilo individuale generato correttamente con scelte mancanti
- [x] Data di nascita 29 febbraio — *più una verifica di proprietà su 4000 date di nascita*
- [x] Timeout della generazione AI → fallback consegnato — *e anche il caso «nessuna chiave», che è come è stato collaudato*
- [x] `rivela_epiloghi` accende tutti gli schermi insieme — *90 su 90 in 41ms*
- [x] Caduta del cruscotto a metà evento: la serata prosegue — *il timer chiude il voto da sé; verificato via socket con la regia che tace*

**Aggiunte alla checklist emerse in sviluppo:**

- [x] Il contatore del capitolo 1 fa 168 giorni, e un test lo protegge se si sposta la data evento
- [x] Riapertura del voto sia dalla rivelazione sia dopo che il regista è già avanzato
- [x] Nessuno dei quattro capitoli rimossi dalla trama è tornato dalla finestra
- [x] Ogni capitolo votabile ha domanda e due opzioni complete di label, guadagno e costo
- [x] I 6 fallback dell'epilogo stanno sotto le 200 parole e hanno i segnaposto giusti
- [x] Il timer chiude da sé, e un timer vecchio non chiude anzitempo il bivio successivo
- [x] A live spento la sala non riceve i due numeri, la regia sì
- [x] La mezza figura non manda al browser nessun dato da cui dedurre il segno
- [x] Solo il capitolo 12 non ha niente da mostrare alla rivelazione; da 1 a 11 tutti sì
- [x] Prima del comando del regista l'epilogo non esce dal server
- [x] Il link `/e/<token>` rilegge l'epilogo giusto; un token inventato dà 404
- [ ] **Confermare lo slug del modello su OpenRouter** — se è sbagliato vanno tutti in fallback
- [ ] Rileggere qualche centinaio di epiloghi generati davvero, sulle combinazioni estreme (§8.4)
- [ ] Decidere se 30 giorni di retention è il numero giusto
- [ ] Il **segnaposto** della mezza figura va sostituito con l'asset disegnato
- [ ] La mezza figura non fa capire il segno — da provare su gente che non conosce la trama
- [ ] La terza battuta del regista sta dentro i 2,5 minuti del blocco «Bivio»
- [ ] Tarare `durata_voto_sec` in prova, capitolo per capitolo (default 60, finestra utile 45-90)
- [x] Un blip di rete non cancella più il cruscotto: solo `unauthorized` è un problema di token
- [x] La regia sa quando è caduta, invece di mostrare numeri fermi che sembrano veri
- [ ] Guardare tutto in un browser: timer, mezza figura, rivelazione, forbice mascherata e stati dei pulsanti sono scritti ma non ancora visti
- [ ] Staccare la rete alla regia a metà prova e verificare che si riprenda da sola
