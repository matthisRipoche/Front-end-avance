# ---- Étape 1 : build Analog (client, SSR, prérendu, serveur Nitro) ----
FROM node:24-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Étape 2 : seulement le serveur produit par Nitro ----
# dist/analog/server embarque ses propres dépendances : pas de node_modules complet dans l'image.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
COPY --from=build --chown=node:node /build/dist/analog ./
# Utilisateur non root fourni par l'image node
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "server/index.mjs"]
