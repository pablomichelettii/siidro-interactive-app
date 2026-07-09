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
| **Regista** (privato) | `http://<ip-lan>:3000/?role=director` | comandi + assi del tono |
| **Partecipanti** (telefoni) | inquadrano il QR sul Main Screen | anonimi |

## Flusso in sala
1. Apri Main Screen (lobby: QR) e Regista.
2. I ragazzi scansionano → pallini che fluttuano.
3. Regista: **Inizia** → scorre il capitolo → **Apri voto** → i telefoni votano → le particelle si polarizzano → **Chiudi voto** (o Tiebreak sul pareggio) → capitolo successivo.
4. Dopo i 12 bivi: finale globale sul Main Screen + "il tuo 2039" su ogni telefono.

## Architettura (essenziale)
- Un processo Node (Fastify + Socket.IO). Stato **in memoria**, **anonimo**, **effimero** (niente DB).
- `server/engine.js` — contenuti + riduttore puro (portati dall'MVP). Storia lineare.
- `server/session.js` — doppio binario: `collective` (maggioranza → Main Screen) + `personal` per ogni socket (`Map<cid, state>`).
- `public/` — 3 pagine vanilla; particelle su Canvas 2D.

## Limiti noti (MVP)
- Reconnect entro la sessione via `cid` in `sessionStorage`; chiuso il processo, tutto sparisce (voluto).
- Epilogo personale = template deterministico dallo stato. Aggancio LLM: vedi §11 del Master Prompt.
- Nessun rate-limit sui voti (un voto per socket, sovrascrivibile). Adatto a una sala fidata, non a internet aperto.
