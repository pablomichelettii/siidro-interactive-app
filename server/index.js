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
    socket.on("director:skip", () => session.skip());
    socket.on("director:reset", () => session.reset());

  } else {
    socket.on("device:join", (d, ack) => {
      const cid = session.addParticipant(d && d.cid, socket);
      const view = session.phase === "ended"
        ? { phase: "ended", options: null, ended: session.personalView(cid) }
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

console.log(`\n  Libro Vivo del 2039 — in ascolto su :${PORT}`);
console.log(`  Main screen  →  http://<ip-lan>:${PORT}/?role=main`);
console.log(`  Regista      →  http://<ip-lan>:${PORT}/?role=director`);
console.log(`  Partecipanti →  QR sul main screen (root)\n`);
