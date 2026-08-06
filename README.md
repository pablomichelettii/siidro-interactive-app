# Il Libro Vivo del 2040 — MVP

Web app narrativa multiplayer real-time per l'evento scuole SIIDRO 2026.
Spec: [`MASTER-PROMPT-MVP.md`](./MASTER-PROMPT-MVP.md) · Meccaniche: `SIIDRO 2026 - Libro Vivo - Handoff...md`.

## Avvio

```bash
npm install
cp .env.example .env   # configurazione: chiave OpenRouter, token regia, porta…
npm start              # porta 3000 (PORT=xxxx per cambiarla)
npm test               # self-check motore + sessione
```

`npm start` legge `.env` da solo — lo fa Node, non serve `dotenv`. **Senza `.env` l'app parte comunque** coi default. Il file è in `.gitignore`, la chiave non finisce nel repo. Tutte le variabili sono documentate in [`.env.example`](./.env.example) e riassunte qui sotto.

Tre superfici (stesso server, host = IP LAN della macchina in sala):

| Superficie | URL | Note |
|---|---|---|
| **Main Screen** (proiettore) | `http://<ip-lan>:3000/?role=main` | mostra QR, storia, particelle, finale |
| **Regista** (privato) | `http://<ip-lan>:3000/?role=director` | comandi + Indice di Delega + nomi degli esiti da annunciare. In deploy pubblico: `...&k=<token>` |
| **Partecipanti** (telefoni) | inquadrano il QR sul Main Screen | accoglienza con nome/nickname + data di nascita |

> **Apri sempre il Main Screen dall'indirizzo che useranno i telefoni** (IP LAN in sala, o dominio pubblico), non da `localhost`: il QR codifica l'origin della pagina Main.

### Variabili d'ambiente
| Var | Default | Note |
|---|---|---|
| `PORT` | `3000` | porta di ascolto |
| `DIRECTOR_TOKEN` | *(vuoto)* | se impostata, la regia è accessibile solo con `?role=director&k=<token>`. Vuota = regia libera (ok in locale, **da impostare in deploy pubblico**) |
| `OPENROUTER_API_KEY` | *(vuota)* | chiave per generare gli epiloghi individuali. **Senza, la serata funziona lo stesso**: tutti ricevono il fallback pre-scritto |
| `OPENROUTER_MODEL` | `deepseek/deepseek-v4-flash-0731` | slug del modello su OpenRouter. Il default è **il modello economico di proposito**: uno più caro va scelto apposta in `.env`, non subito per distrazione. ⚠️ se lo slug non esiste la chiamata fallisce e parte il fallback |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | endpoint OpenAI-compatibile |
| `EPILOGO_TIMEOUT_MS` | `60000` | oltre questo, l'epilogo di quello studente è il fallback |
| `EPILOGO_MAX_TOKENS` | `4000` | tetto su **ragionamento + testo**. I modelli che ragionano spendono 400-550 token prima di scrivere: sotto i 2000 gli epiloghi escono troncati. È un tetto, non una prenotazione — si paga il consumo reale |
| `EPILOGO_PARALLELE` | `6` | chiamate simultanee. I 9 minuti del cap. 13 bastano; alzare se in prova risulta lento |
| `EPILOGHI_DIR` | `data/epiloghi` | dove finiscono gli epiloghi rileggibili dal link |
| `EPILOGHI_RETENTION_GIORNI` | `30` | dopo quanti giorni i file vengono cancellati all'avvio |

## Flusso in sala
1. Apri Main Screen (lobby: QR) e Regista.
2. I ragazzi scansionano → **accoglienza**: nome (o nickname) e data di nascita, che serve per l'età esatta nel 2040. Poi pallini che fluttuano.
3. Regista: **Inizia** → scorre il capitolo → **Apri voto** → i telefoni votano → le particelle si polarizzano. Il voto **si chiude da sé** allo scadere di `durata_voto_sec` (60s di default): **Chiudi voto** serve solo per anticipare, **Forza ↘/↗** per il pareggio.
4. **Chiudi voto non avanza**: il capitolo resta a schermo e mostra cosa ha scelto la sala, la forbice finale e — se questo capitolo chiudeva un intreccio — l'esito col nome che il narratore annuncia. Il cruscotto lo scrive nella card *Da annunciare*. Poi **Avanti ▷**. **Riapri voto** annulla l'ultima chiusura, da qui o dopo essere avanzato.
5. Dopo i 12 bivi restano il capitolo 13 (climax, legge l'Indice di Delega) e il 14 (chiusura): non si votano, li avanza **Avanti ▷**.
6. **Alla chiusura del capitolo 12 gli epiloghi si generano da soli**, nei 9 minuti del 13. Il cruscotto mostra l'avanzamento; quando è pronto si accende **📱 Rivela epiloghi**.
7. Il narratore chiude lo scenario globale, dice «adesso guardate il telefono», e **solo allora** il regista preme: novanta schermi si accendono insieme. Ogni studente ha anche un link `/e/<token>` per rileggerlo nei giorni dopo.

## Testare più connessioni in locale
> ⚠️ **Node non ricarica i moduli.** Dopo ogni modifica a `server/…` il processo va riavviato, anche in locale: un server lasciato acceso risponde benissimo e parla il codice di ieri. Il loadtest se ne accorge e lo dice, il browser no.

- **Tab multipli** (rapido): ogni scheda su `/?role=device` è un socket distinto (il `cid` sta in `localStorage`, quindi per schede dello **stesso** browser serve una finestra in incognito o un profilo diverso per avere partecipanti distinti). Apri Main + Regia in due finestre e qualche tab device.
- **Telefoni sulla stessa wifi**: il server ascolta su `0.0.0.0`. Trova l'IP e apri il Main da lì:
  ```bash
  ipconfig getifaddr en0     # macOS, es. 192.168.1.42
  hostname -I                # Linux
  # apri http://<ip>:3000/?role=main → i telefoni scansionano il QR
  ```
- **Load test** (N partecipanti finti che si connettono, entrano e votano ogni bivio, con la regia pilotata in automatico):
  ```bash
  npm run loadtest -- 80            # veloce, pura verifica di carico
  npm run loadtest -- 30 5         # DEMO guardabile: 30 utenti, 5s per fase
  # contro un server remoto / con token regia:
  URL=https://libro.tuodominio.it DIRECTOR_TOKEN=xxx npm run loadtest -- 120
  ```
  - **2° argomento = secondi per fase** (lettura capitolo + finestra di voto). `0` = full speed. Durata partita ≈ `28 × secondi` (12 bivi × 2 fasi + 2 capitoli narrati). Con ritmo > 0 i voti arrivano scaglionati → apri `…/?role=main` e guardi le particelle migrare a poco a poco.
  - **`SCENARIO=` forza la serata**: 12 lettere `f`/`d`, una per capitolo. Serve a vedere a schermo un mondo preciso senza sperare che i voti casuali ci arrivino.
    ```bash
    SCENARIO=dddddddddddd npm run loadtest -- 90   # tutti e sei gli esiti positivi
    SCENARIO=ffffffffffff npm run loadtest -- 90   # tutti e sei negativi
    SCENARIO=ffffffdddddd npm run loadtest -- 90   # la sala si pente a metà → terze vie
    SCENARIO=ddddddffffff npm run loadtest -- 90   # la sala si stanca a metà
    ```
  - Senza `SCENARIO` la sala è casuale su **due livelli**: una disposizione per l'intera serata, più un umore per capitolo. Serve perché con una probabilità fissa per client, a 90 votanti la maggioranza non gira mai e usciva sempre lo stesso mondo.
  - Override fini: `READ_MS` (sosta sul capitolo) e `VOTE_MS` (finestra di voto), in millisecondi.
  - Riporta connessioni riuscite, voti/latenza per round ed esito. Verificato fino a 200 client in locale (~40ms/round). NB: resetta e guida la sessione, non lanciarlo durante un evento reale.

## Provare gli epiloghi prima dell'evento
Il §8.4 della patch chiede di generare qualche centinaio di profili sintetici sulle combinazioni estreme **e rileggerli**: è l'unico modo di sapere cosa produce il modello quando la sala ha fatto un disastro.

```bash
npm run epiloghi              # 8 profili — verifica al volo che chiave e slug funzionino
npm run epiloghi -- 200       # la prova vera, da rileggere
npm run epiloghi -- 200 json  # anche in JSON, per analizzarli altrove
npm run epiloghi -- 1 prompt  # il prompt esatto, senza chiamare nulla (gratis)
```

**Salva sempre un file** in `data/prove-epiloghi/` e ne stampa il percorso — duecento epiloghi non si leggono a terminale, e redirigere con `>` non funziona perché ci finirebbe dentro l'intestazione di npm. La cartella `data/` è in `.gitignore`.

Ogni epilogo porta accanto la **sintesi delle scelte**, per verificare la coerenza senza tornare indietro: due righe di frecce (le tue e quelle della sala), quante volte sei rimasto in minoranza, e **la rosa che il modello ha ricevuto** con l'ordine di costruirci sopra la scena — se il testo non tocca nessuna di quelle, non ha obbedito.

Copre 5 tipi di sala × 4 tipi di studente, compresi *entrato al capitolo 6* e *non ha mai votato*. Controlla in automatico: lunghezza 180-220 parole, apertura conforme, parole vietate (morte, malattia, diagnosi…), gergo dello spettacolo che trapela, tono giudicante. **Non** giudica il tono, le immagini, né se l'epilogo chiude davvero su un elemento di agentività — quelli si leggono.

## Deploy — evento in sala (LAN, consigliato)
Per l'evento la LAN è la scelta più robusta: offline, bassa latenza, nessuna dipendenza da internet.
```bash
git clone <repo> && cd n5d-future-book
npm install
PORT=3000 npm start                 # apri la porta 3000 nel firewall
# device → http://<ip-macchina>:3000 ; Main → http://<ip-macchina>:3000/?role=main
```

## Deploy — pubblico su internet (Linux + dominio + nginx + TLS)
Serve la macchina raggiungibile dall'esterno su 80/443 e un record DNS `A` `libro.tuodominio.it` → IP pubblico.
(Se la macchina **non** è raggiungibile — no IP pubblico, CGNAT, porte chiuse — allora un tunnel tipo `cloudflared tunnel --url http://localhost:3000` è l'alternativa che bypassa il NAT.)

**1) Node + app + persistenza**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -   # Node 22: sotto, --env-file-if-exists non esiste
sudo apt-get install -y nodejs
git clone <repo> && cd n5d-future-book
npm install
sudo npm i -g pm2
cp .env.example .env && nano .env      # DIRECTOR_TOKEN, OPENROUTER_API_KEY, PORT
pm2 start npm --name libro -- start     # npm start legge .env da solo
pm2 save && pm2 startup             # esegui la riga che stampa (auto-avvio al boot)
```
Node resta su `localhost:3000`, non esposto direttamente; nginx fa da fronte.

**2) nginx come reverse proxy** — `/etc/nginx/sites-available/libro`:
```nginx
server {
    listen 80;
    server_name libro.tuodominio.it;
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
sudo ln -s /etc/nginx/sites-available/libro /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**3) TLS con Let's Encrypt** (aggiunge da solo il blocco 443 + redirect 80→443):
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d libro.tuodominio.it
sudo ufw allow 'Nginx Full'         # 80 + 443
```

**Insidia unica:** senza le righe `Upgrade`/`Connection` nginx non fa l'upgrade del protocollo e Socket.IO cade in polling o si rompe sull'handshake `ws`. Con quelle, tutto passa trasparente (il path `/socket.io/` è coperto da `location /`).

**URL all'evento** (su `https://`):
- Main (proiettore) → `https://libro.tuodominio.it/?role=main`
- Regia (solo operatore) → `https://libro.tuodominio.it/?role=director&k=una-stringa-lunga-e-segreta`
- Device → il QR sul Main Screen

## Aggiornare sul server (deploy attuale)
Setup in produzione: `/var/www/next5000days` · pm2 `next5000days` · dietro nginx su `next5000days.pablomicheletti.it`.
```bash
cd /var/www/next5000days
git pull
npm install            # solo se sono cambiate le dipendenze (package.json)
pm2 restart next5000days
```
- La configurazione sta in `.env`, letto a ogni avvio: dopo averlo modificato serve `pm2 restart`.
- Le modifiche solo-frontend (`public/…`) sono già servite dopo il `git pull`: basta un hard-reload del browser, il `pm2 restart` non è indispensabile (ma non fa danni).
- Modifiche a `server/…`: il `pm2 restart` è necessario.
- Verifica: `pm2 status next5000days` e `pm2 logs next5000days --lines 30`.

## Architettura (essenziale)
- Un processo Node (Fastify + Socket.IO). Stato **in memoria**, niente DB. **Non più del tutto anonimo**: nome e data di nascita servono all'epilogo. La data di nascita resta in memoria e muore col processo; a disco finisce solo l'epilogo salvato (nome + stringa età + testo), con retention.
- `server/epilogo.js` — generazione via OpenRouter (API OpenAI-compatibile, `fetch`, nessuna dipendenza), fallback obbligatorio, persistenza e retention. **Il nome non entra mai nella chiamata**: il modello scrive `{NOME}`/`{ETA}` e il server interpola dopo.
- `server/content.js` — **tutti i testi**, nessuna logica: 14 capitoli 2027→2040, 6 intrecci, varianti del cap. 12, climax, fallback dell'epilogo.
- `server/engine.js` — solo funzioni pure. Lo stato **non è accumulato**: `derive(history)` ricava Indice, banda, stato dei sei intrecci e climax dall'elenco dei vincitori. Per questo "riapri voto" e "forza esito" sono un `pop` di `history`.
- `server/session.js` — doppio binario: `history` (maggioranza → Main Screen) + i voti di ognuno (`Map<cid, Map<capitolo, tag>>`).
- `public/` — 3 pagine vanilla; particelle su Canvas 2D.

## Limiti noti (MVP)
- Reconnect via `cid` in `localStorage`: una scheda chiusa o un telefono riavviato ritrovano la sessione. Chiuso il processo, i voti spariscono (voluto); gli epiloghi già generati no, restano nei file.
- Epilogo personale generato a fine capitolo 12. Senza `OPENROUTER_API_KEY` tutti ricevono uno dei 6 fallback pre-scritti — la serata regge comunque.
- Nessun rate-limit sui voti (un voto per socket, sovrascrivibile). Adatto a una sala fidata, non a internet aperto.
