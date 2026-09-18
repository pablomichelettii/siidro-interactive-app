# SIIDRO ICT Company Summit — app interattiva del tavolo

Web app real-time per il Forum: sul proiettore scorrono le domande, i telefoni
in sala votano, la regia pilota tutto da un cruscotto privato e decide quali
messaggi della chat finiscono sullo schermo.

Non c'è un racconto e non c'è una risposta giusta: ogni domanda è autonoma, la
sala sceglie, la scelta si rivela e si passa alla successiva. Il confronto tra
la domanda di apertura e quella di chiusura è il punto dell'intera serata.

Specifica e decisioni: [`SIIDRO-INTERACTIVE-APP.md`](./SIIDRO-INTERACTIVE-APP.md) ·
storia del progetto da cui nasce: [`docs/legacy/`](./docs/legacy/).

## Avvio

```bash
npm install
cp .env.example .env   # porta, token di regia, manopole della chat
npm start              # porta 3000 (PORT=xxxx per cambiarla)
npm test               # self-check della sessione: voto, pareggi, viste, chat
```

Serve **Node 22 o superiore** (`--env-file-if-exists` non esiste prima).
`npm start` legge `.env` da solo, senza `dotenv`: **senza `.env` l'app parte
comunque** coi default. Il file è in `.gitignore`.

Tre superfici, stesso server (host = IP LAN della macchina in sala):

| Superficie | URL | Cosa fa |
|---|---|---|
| **Proiettore** | `http://<ip-lan>:3000/?role=main` | QR d'ingresso, domande, poli di voto, particelle, chat approvata, esiti |
| **Regia** (privata) | `http://<ip-lan>:3000/?role=director` | comandi, forbice vera, elenco delle domande, coda della chat. In deploy pubblico: `...&k=<token>` |
| **Partecipanti** | inquadrano il QR sul proiettore | un campo solo: il nome, che firma i messaggi in chat |

> **Apri il proiettore dall'indirizzo che useranno i telefoni** (IP LAN, o il
> dominio pubblico), non da `localhost`: il QR codifica l'origin di quella pagina.

### Variabili d'ambiente
| Var | Default | Note |
|---|---|---|
| `PORT` | `3000` | porta di ascolto |
| `DIRECTOR_TOKEN` | *(vuoto)* | se impostata, la regia richiede `?role=director&k=<token>`. Vuota = regia libera: ok in locale, **da impostare in deploy pubblico** |
| `CHAT_ATTIVA` | `1` | `0` spegne la chat ovunque: la casella sparisce dal telefono e il server rifiuta comunque |
| `CHAT_MAX_CHARS` | `140` | oltre, il messaggio viene **troncato**, non rifiutato |
| `CHAT_COOLDOWN_MS` | `5000` | tra due messaggi dello stesso partecipante |
| `CHAT_MAX_IN_CODA` | `2` | quanti messaggi in attesa può avere una sola persona |
| `CHAT_BOLLA_MS` | `12000` | quanto dura la salita di una bolla sul proiettore. **Da calibrare col proiettore vero**: dal fondo sala, 4 secondi non bastano |

## Il contenuto: dove si cambiano le domande
Tutto in [`server/content.js`](./server/content.js), dati e basta, nessuna logica.
L'array `ESEMPI` oggi contiene 14 slide, di cui **11 votabili**: apertura, tre
blocchi da tre domande (ciascuno preceduto da una slide di stacco con la
macro-domanda), chiusura.

Campi di una slide:

| Campo | Note |
|---|---|
| `id` | stabile: sta negli URL, nei log e nel cruscotto. Non si riusa |
| `occhiello`, `titolo` | li mostra l'interludio tra una slide e l'altra |
| `votabile` | `false` = slide di stacco, il regista la passa con *Avanti* |
| `mostra_live` | `true` = la sala vede la forbice mentre si vota. Con `false` vede solo quanti hanno votato, e i numeri escono alla chiusura |
| `durata_voto_sec` | `0` = nessun timer, chiude solo il regista |
| `beats` | facoltativo: stringa = paragrafo, `{ sig }` = riquadro, `{ counter }` = numero che sale. **Senza `beats` il proiettore legge la domanda** |
| `q` + `opzioni` | da 2 a 4 opzioni, `tag` unico dentro la domanda. Nessuna è quella giusta |
| `guadagno` / `costo_nascosto` | facoltativi, per opzione: se ci sono, compaiono sotto l'opzione e alla rivelazione |
| `nota` | **solo cruscotto regia**: la lettura della risposta. Non si proietta mai |
| `chiusura` | la riga che chiude la rivelazione sul proiettore |

L'ordine dell'array è solo il default: dal cruscotto si salta dove si vuole.

## Flusso in sala
1. Apri proiettore (lobby col QR) e regia.
2. I partecipanti scansionano, lasciano il nome, e diventano una particella che fluttua.
3. Regia: **Inizia** → la slide → **Apri voto** → i telefoni votano, le particelle si polarizzano. Il voto **si chiude da sé** allo scadere di `durata_voto_sec`; *Chiudi voto* serve solo ad anticipare.
4. **Chiudere il voto non avanza**: la domanda resta a schermo con l'opzione vinta, la forbice completa e la `chiusura`. Poi **Avanti ▷**. **Riapri voto** annulla l'ultima chiusura, anche dopo essere andato avanti.
5. A parità di voti vince la prima opzione dell'elenco — regola sola, scritta e prevedibile. Dal cruscotto si può **forzare** qualunque altra.
6. Alla fine il proiettore mostra cosa ha scelto il tavolo, domanda per domanda; ogni telefono mostra le **proprie** risposte accanto a quelle della sala, e quante volte è rimasto in minoranza.

### Chat moderata
Si scrive **solo a voto aperto**, firmata col nome, un messaggio ogni
`CHAT_COOLDOWN_MS`. Niente arriva sul proiettore se il regista non lo approva:
dalla coda del cruscotto si pubblica, si rifiuta, o si silenzia per la serata
chi esagera. Il mittente vede sempre che fine ha fatto il suo messaggio — senza,
lo riscrive e la coda raddoppia da sola. Sullo schermo i messaggi approvati
salgono su tre corsie decodificandosi: servono al narratore per pescare gli
interventi, non a essere letti come un documento.

## Provare in locale
> ⚠️ **Node non ricarica i moduli.** Dopo ogni modifica a `server/…` il processo
> va riavviato: un server lasciato acceso risponde benissimo e parla il codice di
> ieri. Le modifiche a `public/…` bastano un hard-reload.

- **Tab multipli**: ogni scheda su `/?role=device` è un socket distinto, ma il `cid` sta in `localStorage` — per avere partecipanti *diversi* dallo stesso browser serve una finestra in incognito o un altro profilo.
- **Telefoni sulla stessa wifi** (il server ascolta su `0.0.0.0`):
  ```bash
  ipconfig getifaddr en0     # macOS, es. 192.168.1.42
  hostname -I                # Linux
  # apri http://<ip>:3000/?role=main → i telefoni scansionano il QR
  ```
- **Load test** — N partecipanti finti che entrano e votano ogni domanda, con la regia pilotata in automatico:
  ```bash
  npm run loadtest -- 80           # veloce, pura verifica di carico
  npm run loadtest -- 30 5         # DEMO guardabile: 30 utenti, 5s per fase
  URL=https://summit.tuodominio.it DIRECTOR_TOKEN=xxx npm run loadtest -- 120
  ```
  - **2° argomento = secondi per fase** (lettura + finestra di voto). `0` = full speed. Con ritmo > 0 i voti arrivano scaglionati e sul proiettore si vedono le particelle migrare.
  - **`SCENARIO=` forza l'esito**: una cifra per domanda votabile (oggi 11) = indice dell'opzione che deve vincere. Serve a vedere a schermo un risultato preciso senza sperarci.
    ```bash
    SCENARIO=00000000000 npm run loadtest -- 90   # tutti sulla prima opzione
    SCENARIO=01230123012 npm run loadtest -- 90   # uno per opzione, a giro
    ```
    Un indice fuori portata si arrotonda giù (le domande hanno da 2 a 4 opzioni).
  - Override fini: `READ_MS` e `VOTE_MS`, in millisecondi.
  - Verificato fino a 200 client in locale (~40ms/round). **Resetta e guida la sessione: non lanciarlo durante l'evento.**

## Deploy — in sala, via LAN (consigliato)
Offline, latenza bassa, nessuna dipendenza da internet.
```bash
git clone <repo> && cd siidro-interactive-app
npm install
PORT=3000 npm start          # apri la porta 3000 nel firewall
# proiettore → http://<ip-macchina>:3000/?role=main
```

## Deploy — pubblico su internet (Linux + dominio + nginx + TLS)
Serve la macchina raggiungibile su 80/443 e un record DNS `A` verso il suo IP.
(Se non è raggiungibile — CGNAT, porte chiuse — `cloudflared tunnel --url
http://localhost:3000` bypassa il NAT.)

**1) Node + app**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -   # Node 22 minimo
sudo apt-get install -y nodejs
git clone <repo> && cd siidro-interactive-app
npm install
sudo npm i -g pm2
cp .env.example .env && nano .env       # DIRECTOR_TOKEN su tutto: la regia non va lasciata aperta
pm2 start npm --name siidro -- start    # npm start legge .env da solo
pm2 save && pm2 startup                 # esegui la riga che stampa (auto-avvio al boot)
```

**2) nginx come reverse proxy** — `/etc/nginx/sites-available/siidro`:
```nginx
server {
    listen 80;
    server_name summit.tuodominio.it;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        # --- indispensabile per Socket.IO / WebSocket ---
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        # ------------------------------------------------
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;   # non chiudere le connessioni WS lunghe
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/siidro /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**3) TLS con Let's Encrypt** (aggiunge da sé il blocco 443 e il redirect):
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d summit.tuodominio.it
sudo ufw allow 'Nginx Full'
```

**L'insidia è una sola:** senza le righe `Upgrade`/`Connection` nginx non fa
l'upgrade di protocollo e Socket.IO cade in polling o si rompe sull'handshake.
Con quelle, `/socket.io/` passa trasparente dentro `location /`.

**Aggiornare** (con `<dir>` e `<nome-pm2>` del tuo deploy):
```bash
cd <dir> && git pull
npm install                 # solo se è cambiato package.json
pm2 restart <nome-pm2>      # necessario per server/… e dopo aver toccato .env
```

## Architettura (essenziale)
- Un processo Node (Fastify + Socket.IO), stato **in memoria**, niente DB, niente disco: nomi e voti muoiono col processo. Un processo = una sala.
- [`server/content.js`](./server/content.js) — tutti i testi, zero logica.
- [`server/session.js`](./server/session.js) — lo stato autorevole. Non accumula: tiene `history` (un vincitore per domanda) e i voti di ciascuno, e **ricava tutto il resto a ogni vista**. Per questo *riapri voto* è un `pop` di `history`. Qui stanno anche i controlli della chat, lato server, qualunque cosa faccia il client.
- [`server/index.js`](./server/index.js) — bootstrap, QR generato server-side, GSAP servito da `node_modules` (niente CDN: la rete della sede non è un requisito), gate della regia.
- [`public/`](./public/) — tre pagine vanilla, particelle su Canvas 2D, transizioni GSAP, fondo a circuiti in [`circuit.svg`](./public/circuit.svg). I colori del brand stanno in [`style.css`](./public/style.css) (`--accent: #4391FF`, `--bg: #1C1C1C`) — sono duplicati a mano nei due file JS che disegnano fuori dal CSS.

## Limiti noti
- Reconnect via `cid` in `localStorage`: una scheda chiusa o un telefono riavviato ritrovano i propri voti. Chiuso il processo, spariscono tutti (voluto).
- Nessun rate-limit sui voti (uno per socket, sovrascrivibile fino alla chiusura). Adatto a una sala fidata, non a internet aperto.
- La chat non ha filtro automatico sulle parole: c'è un umano che approva, ed è più bravo di qualunque lista. Se il regista si distrae, però, non passa niente — è un tuo collo di bottiglia, non un bug.
- Una sola sessione per processo: due sale insieme = due processi su due porte.
