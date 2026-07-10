# Il Libro Vivo del 2039 — MVP

Web app narrativa multiplayer real-time per l'evento scuole SIIDRO 2026.
Spec: [`MASTER-PROMPT-MVP.md`](./MASTER-PROMPT-MVP.md) · Meccaniche: `SIIDRO 2026 - Libro Vivo - Handoff...md`.

## Avvio

```bash
npm install
npm start          # porta 3000 (PORT=xxxx per cambiarla)
npm test           # self-check del doppio binario
```

Tre superfici (stesso server, host = IP LAN della macchina in sala):

| Superficie | URL | Note |
|---|---|---|
| **Main Screen** (proiettore) | `http://<ip-lan>:3000/?role=main` | mostra QR, storia, particelle, finale |
| **Regista** (privato) | `http://<ip-lan>:3000/?role=director` | comandi + assi del tono. In deploy pubblico: `...&k=<token>` |
| **Partecipanti** (telefoni) | inquadrano il QR sul Main Screen | anonimi |

> **Apri sempre il Main Screen dall'indirizzo che useranno i telefoni** (IP LAN in sala, o dominio pubblico), non da `localhost`: il QR codifica l'origin della pagina Main.

### Variabili d'ambiente
| Var | Default | Note |
|---|---|---|
| `PORT` | `3000` | porta di ascolto |
| `DIRECTOR_TOKEN` | *(vuoto)* | se impostata, la regia è accessibile solo con `?role=director&k=<token>`. Vuota = regia libera (ok in locale, **da impostare in deploy pubblico**) |

## Flusso in sala
1. Apri Main Screen (lobby: QR) e Regista.
2. I ragazzi scansionano → pallini che fluttuano.
3. Regista: **Inizia** → scorre il capitolo → **Apri voto** → i telefoni votano → le particelle si polarizzano → **Chiudi voto** (o Tiebreak sul pareggio) → capitolo successivo.
4. Dopo i 12 bivi: finale globale sul Main Screen + "il tuo 2039" su ogni telefono.

## Testare più connessioni in locale
- **Tab multipli** (rapido): ogni scheda su `/?role=device` è un socket distinto (il `cid` sta in `sessionStorage`, per-tab → partecipanti diversi). Apri Main + Regia in due finestre e qualche tab device.
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
  - **2° argomento = secondi per fase** (lettura capitolo + finestra di voto). `0` = full speed. Durata partita ≈ `24 × secondi` (12 bivi × 2 fasi). Con ritmo > 0 i voti arrivano scaglionati → apri `…/?role=main` e guardi le particelle migrare a poco a poco.
  - Override fini: `READ_MS` (sosta sul capitolo) e `VOTE_MS` (finestra di voto), in millisecondi.
  - Riporta connessioni riuscite, voti/latenza per round ed esito. Verificato fino a 200 client in locale (~40ms/round). NB: resetta e guida la sessione, non lanciarlo durante un evento reale.

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
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
git clone <repo> && cd n5d-future-book
npm install
sudo npm i -g pm2
DIRECTOR_TOKEN="una-stringa-lunga-e-segreta" PORT=3000 pm2 start npm --name libro -- start
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
- `pm2 restart` mantiene `PORT` e `DIRECTOR_TOKEN` impostati al primo avvio.
- Le modifiche solo-frontend (`public/…`) sono già servite dopo il `git pull`: basta un hard-reload del browser, il `pm2 restart` non è indispensabile (ma non fa danni).
- Modifiche a `server/…`: il `pm2 restart` è necessario.
- Verifica: `pm2 status next5000days` e `pm2 logs next5000days --lines 30`.

## Architettura (essenziale)
- Un processo Node (Fastify + Socket.IO). Stato **in memoria**, **anonimo**, **effimero** (niente DB).
- `server/engine.js` — contenuti + riduttore puro (portati dall'MVP). Storia lineare.
- `server/session.js` — doppio binario: `collective` (maggioranza → Main Screen) + `personal` per ogni socket (`Map<cid, state>`).
- `public/` — 3 pagine vanilla; particelle su Canvas 2D.

## Limiti noti (MVP)
- Reconnect entro la sessione via `cid` in `sessionStorage`; chiuso il processo, tutto sparisce (voluto).
- Epilogo personale = template deterministico dallo stato. Aggancio LLM: vedi §11 del Master Prompt.
- Nessun rate-limit sui voti (un voto per socket, sovrascrivibile). Adatto a una sala fidata, non a internet aperto.
