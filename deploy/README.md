# Mise en production et CI/CD

Site : **https://new-celeste.matthisripoche.com**

```
 PR ─▶ GitHub Actions ─▶ tests + build ─▶ image Docker construite, non publiée
 fusion sur main ─▶ tests ─▶ image Docker (GHCR) ─▶ SSH ─▶ VPS ─▶ Traefik ─▶ conteneur web (Node)
```

Images publiées sur `ghcr.io/<owner>/celeste-next:sha-<12 premiers caractères du commit>`. Ce modèle (image par commit, SSH depuis la CI, port SSH injoignable depuis le poste de dev) reprend `docker-compose.prod.yml`, `.github/workflows/ci-cd.yml` et `deploy/README.md` du dépôt d'origine.

## Ce dossier

| Fichier | Rôle |
|---|---|
| `Dockerfile` | Image de production, construite depuis la racine : `docker build -f deploy/Dockerfile .` |
| `Dockerfile.dockerignore` | Ce qui n'entre pas dans le contexte de build (lu par BuildKit à côté du Dockerfile) |
| `docker-compose.prod.yml` | Le service sur le VPS, derrière Traefik ; copié par la CI dans `~/celeste-next` |
| `README.md` | Ce document |

Le workflow `.github/workflows/ci-cd.yml` reste dans `.github/` : GitHub ne lit les workflows qu'à cet endroit.

Le modèle est celui du dépôt CelesteDeathTracker (`deploy/README.md`), simplifié : un seul conteneur, pas de base de données.

## 0. Le serveur existant

Le VPS (`57.129.139.62`) héberge d'autres applications derrière **Traefik v3** (conteneur `traefik-traefik-1`, réseau Docker `frontend`), qui possède les ports 80/443. **On ne lance pas de second reverse proxy et on ne publie aucun port** : le conteneur `web` rejoint le réseau `frontend` et se déclare à Traefik par des *labels* (`deploy/docker-compose.prod.yml`). Valeurs déjà relevées sur ce Traefik : entrypoint `websecure`, certresolver `ovhcloud`.

Le routeur s'appelle `celeste-next` : `celeste` est déjà pris par le site actuel. Deux routeurs du même nom se marcheraient dessus.

## 1. Une seule fois : DNS (fait)

Chez OVH, dans la zone `matthisripoche.com` : enregistrement **A** `new-celeste` → `57.129.139.62`.

Vérifier : `getent hosts new-celeste.matthisripoche.com` (ou `nslookup`).

## 2. Rien à faire sur le serveur

**GitHub est la seule source de vérité.** À chaque déploiement, la CI crée le dossier `~/celeste-next` dans le dossier personnel de l'utilisateur SSH (pas besoin de `sudo`), y copie `deploy/docker-compose.prod.yml` et **réécrit** le `.env` à partir des secrets (`DOMAIN`), des variables (`API_URL`, facultative) et de la version construite (`IMAGE`, `TAG`). Un `.env` modifié à la main sur le serveur est donc écrasé au déploiement suivant : pour changer une valeur, la changer dans GitHub.

## 3. Une seule fois : GitHub

Les secrets sont **propres à chaque dépôt** : ceux de CelesteDeathTracker ne sont pas visibles ici.

1. *Settings → Environments → New environment* : `production`.
2. Dans cet environnement, ajouter les **secrets**. On peut réutiliser la clé SSH de déploiement de CelesteDeathTracker si elle est encore disponible, sinon en créer une (voir le `deploy/README.md` d'origine, étape 3).

   | Secret | Valeur |
   |---|---|
   | `SSH_HOST` | `57.129.139.62` |
   | `SSH_USER` | utilisateur SSH du serveur |
   | `SSH_PORT` | (facultatif) port SSH si différent de 22 |
   | `SSH_PRIVATE_KEY` | clé privée de déploiement |
   | `SSH_KNOWN_HOSTS` | empreinte du serveur (`ssh-keyscan -p <port> 57.129.139.62`) |
   | `DOMAIN` | `new-celeste.matthisripoche.com` |

3. *Settings → Secrets and variables → Actions → Variables* :

   | Variable | Valeur |
   |---|---|
   | `DEPLOY_ENABLED` | `true` : **interrupteur du déploiement**. Sans elle, la fusion sur `main` construit l'image sans la déployer. |
   | `DEPLOY_PATH` | (facultatif) dossier sur le serveur ; par défaut `celeste-next`, relatif au dossier personnel de l'utilisateur SSH |
   | `API_URL` | (facultatif) surcharge de l'adresse de Spring. Sans la variable, le workflow prend `http://celeste-web-1`, le nginx de l'ancien projet, qui relaie `/api` vers Spring (voir « Adresse de Spring » ci-dessous) : c'est la bonne valeur, rien à poser. Une adresse publique (`https://celeste.matthisripoche.com`) casserait la connexion Discord, qui renverrait sur l'ancien site. Le serveur Node la lit au démarrage (`NITRO_API_URL`) : la changer ne demande pas de reconstruire l'image, seulement de redéployer. |

4. *Settings → Actions → General → Workflow permissions* : « Read and write permissions » (pour publier l'image dans GHCR).

### Adresse de Spring

Le conteneur de Spring est sur le réseau privé de l'autre projet. Son nginx, `celeste-web-1`, est aussi sur le réseau `frontend`, que notre conteneur rejoint pour Traefik : on le joint par là, en http (décision D2 de #35, 2026-11-18).

Pourquoi pas l'adresse publique : Spring construit la `redirect_uri` de Discord à partir de `X-Forwarded-Host`, que le relais lui envoie. Par Traefik, cet en-tête est réécrit en `celeste.matthisripoche.com` et Discord renverrait le joueur sur l'ancien site. Mesuré en production : par `http://celeste-web-1`, la `redirect_uri` est bien `https://new-celeste.matthisripoche.com/…` (détail : `docs/api-spring.md`, « Connexion Discord »).

**Risque** : on dépend du nom de conteneur de l'autre projet. S'il est renommé, ou s'il quitte le réseau `frontend`, l'API devient injoignable (503 sur `/api`, pages connectées en 503). Vérifier : `docker exec celeste-next-web-1 wget -qO- http://celeste-web-1/api/auth/providers` doit répondre `{"discord":true}`.

### Connexion Discord : adresses de retour

Portail développeur Discord → application → *OAuth2 → Redirects*. Ajouter, **sans retirer** celle de l'ancien site :

| Environnement | Adresse de retour |
|---|---|
| Production | `https://new-celeste.matthisripoche.com/api/auth/oauth2/callback/discord` |
| Local (`npm run dev`) | `http://localhost:5173/api/auth/oauth2/callback/discord` |

Une adresse absente de cette liste : Discord refuse la connexion avant même de demander l'autorisation.

## 4. Premier déploiement

1. DNS et secrets prêts, puis `DEPLOY_ENABLED=true`.
2. *Actions → CI/CD → Re-run all jobs* sur le dernier commit de `main` (ou fusionner une PR).
3. Le job « Vérification » attend que `https://new-celeste.matthisripoche.com/health` réponde 200. Traefik demande le certificat à la première requête : compter une minute.

### Si le site ne répond pas

```bash
cd ~/celeste-next
docker compose -f docker-compose.prod.yml ps          # « healthy » ?
docker compose -f docker-compose.prod.yml logs --tail 50 web
docker logs traefik-traefik-1 --tail 50 | grep -i celeste-next
```

Causes fréquentes : DNS pas encore propagé, conteneur absent du réseau `frontend`, image GHCR privée et `docker login` raté.

## 5. Au quotidien

| Besoin | Action |
|---|---|
| Déployer | fusionner une PR sur `main` (tests verts) |
| Journaux | `docker compose -f docker-compose.prod.yml logs -f web` |
| **Revenir en arrière** | `sed -i 's/^TAG=.*/TAG=sha-<ancien>/' .env && docker compose -f docker-compose.prod.yml up -d` (les tags `sha-…` restent dans GHCR) |

## 6. Tester l'image en local

Docker Desktop doit être lancé à la main (il ne démarre pas depuis le bac à sable de l'agent).

```bash
docker build -t celeste-next .
docker run --rm -p 3000:3000 celeste-next     # puis http://localhost:3000 et /health
```

## 7. Dépendances et audit

Point fait le 2026-11-19 (#28).

**Ce que contient l'image.** Seulement `dist/analog` (étape 2 du `Dockerfile`) : pas le `node_modules` du projet, donc aucune `devDependency`. Le `server/node_modules` de l'image compte 8 paquets (esprima, front-matter, github-slugger, js-yaml, marked, marked-gfm-heading-id, marked-mangle, rxjs), tous des `dependencies`.

**Ce que `npm audit --omit=dev` ne voit pas.** Nitro embarque dans ses chunks du code venu de `devDependencies` : h3, ofetch, unstorage et le runtime Nitro, tirés par nitropack sous `@analogjs/platform`. Ce code part en production sans figurer dans `node_modules`, donc l'audit de production le rate. C'est pourquoi la CI audite aussi tout l'arbre.

**Contrôle en CI.** Le job `audit` de `.github/workflows/ci-cd.yml`, séparé du déploiement :

| Contrôle | Effet |
|---|---|
| `npm audit --omit=dev`, seuil `high` | bloquant |
| `npm audit` sur tout l'arbre | non bloquant (avertissement) |

**Vulnérabilité acceptée : esbuild 0.27 (low).** Le serveur de dev peut lire des fichiers, sous Windows et via l'API `serve`.
- Absente de la production : esbuild n'est pas dans l'image.
- Aucun correctif dans la plage `^0.27.3` de `@analogjs/vite-plugin-nitro` ; même `@analogjs/platform` 2.9.7 garde cette plage.
- Poste de développement sous Linux, CI sous Ubuntu : le cas Windows ne s'applique pas.
- Pas d'`overrides` : on forcerait `buildSync` hors de sa plage.

**Vulnérabilité acceptée : minimatch 10 (moderate, DoS par amplification de globparts).** Un seul défaut, signalé sur quatre paquets de la même chaîne : nitropack → archiver → readdir-glob → minimatch.
- Absente de la production : c'est le code de Nitro qui crée des archives (presets que nous n'utilisons pas), au build seulement.
- Aucun correctif dans les plages : `archiver` 8.0.0, la dernière version publiée, dépend de `readdir-glob@^3.0.0`, qui dépend de `minimatch@^10`. `npm audit fix` ne change rien ; seule une montée vers `readdir-glob` 4 (`minimatch@^11`) la corrigerait, et elle exige un `overrides`.
- Pas d'`overrides`, pour la même raison qu'esbuild : forcer une dépendance hors de la plage déclarée par Nitro.
- Conséquence : `npm audit` en liste 7 (3 low, 4 moderate) tant qu'archiver n'est pas à jour. C'est attendu : le job `audit` ne regarde que le seuil `high`, donc ces avis ne déclenchent rien ; l'avertissement jaune n'apparaît que si un avis `high` tombe sur l'arbre de build.

**Règle : jamais `npm audit fix --force`.** Il rétrograderait `@analogjs/platform` en 2.3.1.

**Quand réexaminer.** À chaque montée d'Analog, avec la recopie du skill `analogjs`.
