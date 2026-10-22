# Mise en production et CI/CD

Site : **https://new-celeste.matthisripoche.com**

```
 PR ─▶ GitHub Actions ─▶ tests + build
 fusion sur main ─▶ tests ─▶ image Docker (GHCR) ─▶ SSH ─▶ VPS ─▶ Traefik ─▶ conteneur web (Node)
```

Le modèle est celui du dépôt CelesteDeathTracker (`deploy/README.md`), simplifié : un seul conteneur, pas de base de données.

## 0. Le serveur existant

Le VPS (`57.129.139.62`) héberge d'autres applications derrière **Traefik v3** (conteneur `traefik-traefik-1`, réseau Docker `frontend`), qui possède les ports 80/443. **On ne lance pas de second reverse proxy et on ne publie aucun port** : le conteneur `web` rejoint le réseau `frontend` et se déclare à Traefik par des *labels* (`docker-compose.prod.yml`). Valeurs déjà relevées sur ce Traefik : entrypoint `websecure`, certresolver `ovhcloud`.

Le routeur s'appelle `celeste-next` : `celeste` est déjà pris par le site actuel. Deux routeurs du même nom se marcheraient dessus.

## 1. Une seule fois : DNS (fait)

Chez OVH, dans la zone `matthisripoche.com` : enregistrement **A** `new-celeste` → `57.129.139.62`.

Vérifier : `getent hosts new-celeste.matthisripoche.com` (ou `nslookup`).

## 2. Rien à faire sur le serveur

**GitHub est la seule source de vérité.** À chaque déploiement, la CI crée le dossier `~/celeste-next` dans le dossier personnel de l'utilisateur SSH (pas besoin de `sudo`), y copie `docker-compose.prod.yml` et **réécrit** le `.env` à partir des secrets (`DOMAIN`) et de la version construite (`IMAGE`, `TAG`). Un `.env` modifié à la main sur le serveur est donc écrasé au déploiement suivant : pour changer une valeur, la changer dans GitHub.

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

4. *Settings → Actions → General → Workflow permissions* : « Read and write permissions » (pour publier l'image dans GHCR).

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
