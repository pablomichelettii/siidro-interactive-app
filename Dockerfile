# SIIDRO interactive app — un processo Node, stato in memoria, nessun volume.
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# solo le dipendenze di runtime: socket.io-client serve al loadtest, non qui
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY public ./public

USER node
EXPOSE 3000

# la configurazione arriva dall'ambiente (env_file nel compose), non da .env nell'immagine
CMD ["node", "server/index.js"]
