// ==========================================================================
// BOOTSTRAP — Fastify (static + QR) + Socket.IO. Un solo processo.
// ==========================================================================

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { Server } from "socket.io";
import QRCode from "qrcode";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Session } from "./session.js";
import { leggi, pulisciVecchi } from "./epilogo.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = Fastify();
await app.register(fastifyStatic, { root: path.join(__dirname, "..", "public") });
// GSAP self-hosted (offline-safe, niente CDN) da node_modules
await app.register(fastifyStatic, {
  root: path.join(__dirname, "..", "node_modules", "gsap", "dist"),
  prefix: "/vendor/gsap/", decorateReply: false
});

// QR generato server-side (offline-safe): dark su bianco per la scansione
app.get("/qr", async (req, reply) => {
  const data = (req.query && req.query.data) || "/";
  const buf = await QRCode.toBuffer(String(data), { width: 640, margin: 1, color: { dark: "#171818", light: "#ffffff" } });
  return reply.type("image/png").send(buf);
});

// "Il tuo 2040", rileggibile nei giorni dopo (Patch §8.5). Pagina autonoma:
// niente socket, niente JS — deve funzionare sull'autobus.
app.get("/e/:token", async (req, reply) => {
  const e = await leggi(req.params.token);
  if (!e) return reply.code(404).type("text/html; charset=utf-8")
    .send(`<!doctype html><meta charset=utf-8><title>Non trovato</title>
<body style="background:#233e4d;color:#fff;font:1.1rem/1.6 Georgia,serif;padding:2rem">
<p>Questo epilogo non esiste più.</p></body>`);
  return reply.type("text/html; charset=utf-8").send(`<!doctype html>
<html lang=it><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Il tuo 2040 — ${esc(e.nome) || "Il Libro Vivo"}</title>
<body style="background:#233e4d;color:#fff;font:1.15rem/1.65 Georgia,serif;margin:0">
<main style="max-width:34em;margin:auto;padding:3rem 1.4rem">
  <p style="font:700 .8rem/1 system-ui;letter-spacing:.22em;text-transform:uppercase;color:#ecae31">Il tuo 2040</p>
  <p style="white-space:pre-wrap;margin:1.5rem 0">${esc(e.testo)}</p>
  <hr style="border:0;border-top:1px solid rgba(255,255,255,.2);margin:2.5rem 0">
  <p style="font-size:.85rem;color:rgba(255,255,255,.65)">Il Libro Vivo del 2040 · SIIDRO 2026.
  Questo testo è stato scritto per te dai voti della tua sala.</p>
</main></body></html>`);
});

// Retention: i file degli epiloghi non restano per sempre.
pulisciVecchi().then(n => { if (n) console.log(`  epiloghi scaduti rimossi: ${n}`); });

await app.listen({ port: PORT, host: "0.0.0.0" });

const io = new Server(app.server, { cors: { origin: "*" } });
const session = new Session(io);

// gate regia: attivo solo se DIRECTOR_TOKEN è impostato (deploy pubblico). Locale = libero.
io.use((socket, next) => {
  const role = (socket.handshake.query && socket.handshake.query.role) || "device";
  const token = process.env.DIRECTOR_TOKEN;
  if (role === "director" && token && (socket.handshake.query.k || "") !== token)
    return next(new Error("unauthorized"));
  next();
});

io.on("connection", (socket) => {
  const role = (socket.handshake.query && socket.handshake.query.role) || "device";

  if (role === "main") {
    socket.join("main");
    socket.emit("main:sync", session.mainView());

  } else if (role === "director") {
    socket.join("director");
    socket.emit("director:sync", session.directorView());
    socket.on("director:start", () => session.start());
    socket.on("director:openVote", () => session.openVote());
    socket.on("director:closeVote", (d) => session.closeVote(d && d.option));
    socket.on("director:reopenVote", () => session.reopenVote());
    socket.on("director:skip", () => session.skip());
    socket.on("director:rivelaEpiloghi", () => session.rivelaEpiloghi());
    socket.on("director:reset", () => session.reset());

  } else {
    socket.on("device:join", (d, ack) => {
      const cid = session.addParticipant(d && d.cid, socket, d);
      const view = session.phase === "ended" || session.epiloghiRivelati
        ? { phase: session.phase, options: null, ended: session.personalView(cid) }
        : session.deviceViewGeneric();
      if (typeof ack === "function") ack({ cid, ...view });
    });
    socket.on("device:vote", (d, ack) => {
      session.vote(socket.data.cid, d && d.option);
      if (typeof ack === "function") ack({ ok: true });
    });
    socket.on("disconnect", () => session.markDisconnected(socket.data.cid));
  }
});

console.log(`\n  Libro Vivo del 2040 — in ascolto su :${PORT}`);
console.log(`  Main screen  →  http://<ip-lan>:${PORT}/?role=main`);
console.log(`  Regista      →  http://<ip-lan>:${PORT}/?role=director`);
console.log(`  Partecipanti →  QR sul main screen (root)\n`);
