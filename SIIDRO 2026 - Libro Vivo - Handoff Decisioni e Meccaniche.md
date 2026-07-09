---
title: SIIDRO 2026 - Libro Vivo - Handoff Decisioni e Meccaniche
tags:
  - SIIDRO
  - scuole
  - next5000days
  - handoff
status: spec
date: 2026-07-08
---

# Libro Vivo del 2039 — Handoff (decisioni + meccaniche)

> [!info] A cosa serve questo file
> È il **ponte verso il repo di sviluppo**. Contiene le decisioni prese e le regole di funzionamento, non la narrazione (che sta in [[SIIDRO 2026 - Evento Scuole - Proposta Storia dal Futuro]]) né il prototipo (`mvp-libro-vivo.html`). Chi apre il repo deve poter costruire l'app leggendo solo questo.
>
> **I tre artefatti:**
> 1. `SIIDRO 2026 - Evento Scuole - Proposta Storia dal Futuro.md` → la storia, i capitoli, i bivi, gli intrecci, le fonti
> 2. `mvp-libro-vivo.html` → prototipo validato di usabilità/storytelling (single-file, vanilla JS)
> 3. **questo file** → decisioni e spec delle meccaniche

---

## 1. Cosa stiamo costruendo

Una web app narrativa in stile [ai-2027.com](https://ai-2027.com): il lettore **attraversa** i prossimi 13 anni (2026→2039) scrollando. La narrazione è un "libro di storia scritto nel 2039". A intervalli, la storia si ferma su un **bivio**: non si sceglie *se* un evento accade (accade comunque), ma *come l'umanità ci reagisce*. Ogni scelta sposta uno stato accumulato che decide verso quale futuro il mondo scivola. Uso reale: **evento scuole** con mainscreen collettivo + device individuali; l'app sopravvive all'evento come asset riusabile.

---

## 2. Log delle decisioni (le scelte prese, e perché)

| # | Decisione | Perché |
|---|---|---|
| D1 | **Il POV è rovesciato**: non "cosa farai tu" ma "cosa succede al mondo" | Toglie ai ragazzi il peso dell'orientamento; li rende lettori-testimoni di un'epoca |
| D2 | **Meccaniche rubate da ai-2027**: scroll=tempo, doppio pannello (storia + stato che si anima), bivio come fork, box espandibili opzionali | Sono le 4 meccaniche che fanno *sentire* un trend invece di raccontarlo |
| D3 | **La scelta non è mai l'evento, è la postura verso l'evento** (subire/reagire, fidarsi/verificare, delegare/tenere…) | Sblocca eventi "senza scelta" come il clima: la scelta è come rispondi, non se accade |
| D4 | **Asimmetria delle derive**: ↘ deriva facile = comoda/default (aggiunge delega); ↗ deriva difficile = attiva/costosa (tiene il controllo) | È il messaggio: il futuro distopico è la discesa in discesa, quello vivibile si paga |
| D5 | **Regola di catena**: il segnale debole del capitolo N+1 è piantato dalla deriva del capitolo N | Rende le scelte una linea causale; insegna a *riconoscere* la distopia a ritroso |
| D6 | **Due attrattori come sommatoria**: Σ scelte difficili = "Le Mani sul Volante"; Σ scelte facili = "Il Pilota Automatico". Tutto il resto sono somme intermedie | Il futuro non è un finale scelto, è l'accumulo delle scelte |
| D7 | **Un asse primario (Indice di Delega) + 3 assi del tono secondari** | L'asse primario decide la direzione (una barra sul mainscreen, leggibile); i tono colorano *che tipo* di mondo, senza appesantire lo schermo |
| D8 | **Distopia = incrocio Pressione × Delega-facile** (gli intrecci) | Nessun capitolo è distopico da solo; lo diventa sommandosi a un altro |
| D9 | **Intrecci canonici scritti a mano (~10), non 2^n stati** | Buildabile: pochi colpi drammatici + un contatore, non un albero esplosivo |
| D10 | **L'attrattore positivo non è utopia** (costa: più povero di comodità, disuguale nel prezzo) | Evita la predica "difficile=paradiso" |
| D11 | **J (agenti autonomi) e l'epilogo non aggiungono scelte: leggono lo stato** | Il climax è la lettura della somma; scrivi 1 pezzo, non N finali |
| D12 | **Scaletta = tutti i capitoli che reggono un intreccio** → 14 (12 bivi + climax + metanarrativo). Esclusi 4 in riserva | Selezione guidata dagli intrecci, non dai temi |
| D13 | **Scroll bloccato fino alla scelta** | Il capitolo successivo non esiste finché non scegli → gate per costruzione |
| D14 | **Mainscreen → device → mainscreen** (tecnica scelta dall'utente): lo scroll sul mainscreen fa comparire i bivi sui device connessi; le scelte tornano aggregate sul mainscreen | È il cuore dell'interattività collettiva in tempo reale |

---

## 3. Modello di stato

```
stato = {
  delega:  0..100   // Indice di Delega. Start 50. ↘ +12 (F/oracolo +14), ↗ -12 (F/oracolo -14)
  coesione: -3..+3  // asse tono
  verita:   -3..+3  // asse tono   (+ = polo caldo/buono, - = polo freddo)
  equita:   -3..+3  // asse tono
  choices:  { [capitoloId]: "facile" | "difficile" }
  fired:    [indici degli intrecci scattati]
}
```

**Asse primario — Indice di Delega** (unico visibile sul mainscreen):
- `≤ 38` → **Le Mani sul Volante** (faticoso, ma nostro)
- `≥ 62` → **Il Pilota Automatico** (comodo, non più nostro)
- in mezzo → **In bilico**

**Assi del tono** (letti solo da narratore/cruscotto + prompt epilogo, mai sul device dei ragazzi):

| Asse | Polo caldo (+) | Polo freddo (−) | Alimentato da |
|---|---|---|---|
| Coesione ↔ Solitudine | insieme | ognuno per sé | scuola, lavoro, (prompt) |
| Verità ↔ Nebbia | leggibile | dubbio costante | deepfake, arte, memoria, lucca, oracolo |
| Equità ↔ Divario | costo condiviso | caste | clima, medicina, giudice, dati |

Ogni bivio muove l'**Indice** *e* dà una spinta a **uno** degli assi del tono. Due sale allo stesso Indice possono vivere mondi diversissimi (es. "controllo senza comunità" vs "distopia morbida").

---

## 4. Sistema degli intrecci

**Regola:** un intreccio scatta quando **tutti i suoi nodi** sono stati scelti nella stessa direzione (tutti `facile` → negativo; tutti `difficile` → positivo). I negativi nascono da Pressione × Delega comode; i positivi chiedono scelte difficili ripetute (più rari).

| Intreccio | Tipo | Nodi (tutti stesso segno) |
|---|---|---|
| Il buio a punteggio | neg | clima ↘ + dati ↘ |
| La rete di quartiere | pos | clima ↗ + dati ↗ |
| La città in vendita | neg | deepfake ↘ + arte ↘ + lucca ↘ |
| La città che si racconta | pos | deepfake ↗ + arte ↗ + lucca ↗ |
| La testa vuota | neg | memoria ↘ + scuola ↘ + prompt ↘ |
| La testa allenata | pos | memoria ↗ + scuola ↗ + prompt ↗ |
| Il guinzaglio del sussidio | neg | lavoro ↘ + giudice ↘ |
| Il mestiere ritrovato | pos | lavoro ↗ + giudice ↗ |
| Il triage sociale | neg | medicina ↘ + giudice ↘ |
| Il medico che ti guarda in faccia | pos | medicina ↗ + giudice ↗ |

> Nota: **giudice** chiude tre intrecci (guinzaglio, triage) — è il nodo più caldo. **oracolo** è dove si *paga* la testa vuota/allenata (chi non sa pensare non si accorge dell'errore; chi sa, lo ferma).

---

## 5. Modello dati di un capitolo

```
capitolo = {
  id, anno, titolo,
  ruolo: "Pressione" | "Delega",
  beats: [ testo | {segnale} | {contatore:{to, unit, label}} ],   // in ordine di scroll
  bivio: {
    domanda,
    opzioni: [
      { testo, tag:"facile"|"difficile", delega:±N, asse:"coesione|verita|equita", d:±1, conseguenza }
    ]
  }
}
```

- Il **segnale** è un beat evidenziato (bordo dorato) + un **contatore animato** che parte quando il capitolo entra in vista (es. clima → 61 giorni >40°C). I numeri attuali nell'MVP sono inventati/futuribili: da sostituire con stime difendibili o lasciare dichiaratamente proiettate.
- Le opzioni **non sono etichettate** facile/difficile nell'UI: la comoda deve *sembrare* ragionevole. La direzionalità si scopre solo guardando lo stato che cambia.
- Il **climax** non ha bivio: legge `delega` (verdetto alto/basso/medio) e compone l'epilogo (`n scelte comode su tot` + intrecci scattati + domanda finale ai ragazzi).

**Scaletta definitiva (cronologica):** clima(2027) → deepfake(2028) → memoria(2030) → arte(2030) → lavoro(2031) → medicina(2032) → scuola(2033) → **giudice(2034)** → dati(2035) → prompt(2036) → lucca(2037) → oracolo(2038) → **climax J/metanarrativo(2038→39)**.
**Riserva** (fuori dagli intrecci, riusabili come capitoli "passivi" senza voto): 2 Volante, 6 Bambino disegnato, A Compagno digitale, G Nonna col robot.

---

## 6. Regole di interazione

1. **Scroll = tempo.** Scorrere avanza negli anni. Pannello di stato sempre visibile a lato.
2. **Gate:** il capitolo successivo non è raggiungibile finché non si sceglie (nell'MVP: non esiste nel DOM; nell'app reale: lo sblocca il regista/mainscreen).
3. **Flusso collettivo (evento reale):** il regista scrolla sul **mainscreen** → il bivio compare sui **device** → timer di voto → le % salgono in diretta sul mainscreen → la timeline/Indice si piega → il narratore commenta.
4. **Doppio stato:** *individuale* (per l'epilogo personale di ogni ragazzo) + *aggregato* (per il mainscreen e la narrazione live).
5. **Convergenze:** momenti dal vivo dove tutti rientrano nel tronco (prologo, capitolo centrale sugli aggregati, piccoli gruppi sui dilemmi, epilogo). Vedi proposta.

---

## 7. Vincoli su AI / LLM (cruciale per il repo)

- **L'LLM non decide mai dove va la storia.** Il branching è hardcoded nell'engine. L'AI riempie i nodi (dialoghi con personaggi-AI, epilogo personalizzato), non li crea.
- Output AI **sempre strutturato** (`generateObject` su schema, es. Zod): es. `{ commento, tono: enum, next_node: enum_di_rami_noti }`. L'enum forza l'output sui rami previsti → l'AI è creativa *dentro* il guardrail.
- **Media generati in anticipo**, non live (controllo qualità): finti articoli/foto/audio del futuro.
- **Epilogo personalizzato:** l'LLM riceve il profilo individuale completo, output ≤200 parole, stile fissato in system prompt, registro tarato con prompt caching.

---

## 8. Decisioni ancora aperte (da chiudere nel repo)

- [ ] **Ritmo:** 12 bivi sono tanti (la regola d'oro diceva ~1h di scelte). Leve: capitoli-Pressione "passivi" (si leggono, non si vota), due nodi su una schermata, intrecci a 3 nodi = 1 voto forte + 2 leggeri.
- [ ] **Voto:** maggioranza (una sala, una timeline) o a gruppi (più timeline che si confrontano)?
- [ ] **Divergenza:** le due timeline divergono *davvero* dopo J (raddoppia scrittura finale) o solo nel tono/epilogo?
- [ ] **Segnali:** contatori con numeri reali/difendibili o dichiaratamente proiettati?
- [ ] **Stack:** engine di branching (Ink o equivalente) + backend per aggregare i voti in tempo reale + integrazione LLM. Da definire.
- [ ] **Anonimato:** i ragazzi entrano con nome/classe o anonimi? Cambia il senso dell'epilogo.
- [ ] **Output cartaceo** dell'epilogo (manifesto/mini-libro da portare a casa)?

---

## 9. Riferimenti

- Modello visivo/UX: [ai-2027.com](https://ai-2027.com) (scroll=tempo, doppio pannello, fork race/slowdown)
- Modello strutturale: Kai-Fu Lee + Chen Qiufan, *AI 2041*
- Explorable explanations: Nicky Case (ncase.me)
- Voto live: Mentimeter / Wooclap (meccanica delle % che salgono)
- Tutto il resto (capitoli, fonti, rischi): [[SIIDRO 2026 - Evento Scuole - Proposta Storia dal Futuro]]
