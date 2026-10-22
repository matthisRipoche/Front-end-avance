# Celeste Tracker — front Analog.js (projet de cours)

Nouveau front du projet **CelesteDeathTracker** (`~/projects/CelesteDeathTracker`, GitHub `matthisRipoche/CelesteDeathTracker`), écrit avec **Analog.js 2.9** (Angular 22, Vite 8, serveur Nitro, Node 24). Il consomme l'**API Spring Boot existante** sans la modifier.
Tout est **en français** : échanges, documentation, commentaires, commits.

Conventions du framework (routage par fichiers, routes serveur, chargement de données, contenu Markdown) : voir @AGENTS.md, qui renvoie au guide livré avec la version installée d'Analog.

## Cadre du cours

- Projet front-end avec Node.js et Analog.js. **Le front ET la partie Node (serveur Nitro) sont notés** : le serveur doit avoir de vraies responsabilités, pas seulement relayer `/api`.
- Livrables : ce dépôt Git, un **site en production**, un **oral sur l'organisation de travail avec l'IA agentique**.
- Échéance : 3 jours de cours + 3 à 4 semaines à la maison, à partir du 2026-10-22.

## Façon de travailler (mode mixte)

L'objectif n'est pas un code produit en boîte noire : l'organisation avec l'agent doit **faire comprendre les concepts** à l'utilisateur.

- **Outillage** (Docker, CI/CD, configuration, déploiement) : l'agent l'implémente et explique ses choix.
- **Première fois qu'un concept d'Analog ou de Node apparaît** (page SSR, page SSG, route serveur, relais, garde de route, chargement de données, middleware, cookies côté serveur…) :
  1. l'agent l'explique (skill `teach` : réponse courte ou leçon) ;
  2. il prépare le squelette (fichiers, imports, tests) avec des `TODO` ;
  3. **l'utilisateur écrit le cœur du code** ;
  4. l'agent relit, signale ce qui ne va pas et pourquoi, sans corriger à sa place sauf demande.
- **Cas répétitifs** d'un concept déjà acquis : l'agent implémente, l'utilisateur relit.
- **Décisions structurantes** (architecture, découpage, dépendance ajoutée, contrat avec l'API) : l'agent présente les options et leurs compromis, recommande, et **attend la validation avant de coder**.
- Ne pas sur-outiller : le temps va à l'apprentissage, pas à la configuration.

## Journal de l'IA : `docs/journal-ia.md`

C'est la matière de l'oral. **À chaque étape** (décision, fonctionnalité, correction notable), l'agent ajoute une entrée : la demande, sa proposition, ce que l'utilisateur a validé ou corrigé, et pourquoi. Noter aussi les erreurs de l'agent et la façon dont elles ont été rattrapées.

## Git

- **Chaque commit passe par le skill `commit`** (`.claude/skills/commit/SKILL.md`).
- Jamais de commit sur `main`. Une branche par sujet (`feat/…`, `fix/…`, `docs/…`, `chore/…`), puis pull request, fusion en **squash** (le titre de la PR devient le commit sur `main`).
- **Conventional Commits en français**, commits atomiques, build et tests avant chaque commit.
- Demander avant chaque `git push`.

## Commandes

| Action | Commande |
|---|---|
| Serveur de dev | `npm run dev` (Vite, port 5173) |
| Build (client, SSR, prérendu, serveur Nitro) | `npm run build` → `dist/analog/` |
| Tests | `npx vitest run` |
| Lancer le build | `npm run preview` (`node dist/analog/server/index.mjs`) |

## Périmètre

Un nouveau front pour CelesteDeathTracker, en partie neuf. Ce n'est pas une copie du site Angular actuel (`web/` du dépôt d'origine).

| Partie | Site actuel | Ce front |
|---|---|---|
| Pages publiques : accueil, page du mod, FAQ, confidentialité | N'existent pas | **Nouvelles**, en SSR ou SSG (FAQ et confidentialité en Markdown) |
| Pages connectées : tableau de bord, mes maps, détail d'une face | Rendues dans le navigateur | **Refaites** sur la couche serveur et la connexion côté serveur |
| Historique, détail d'une room, direct, appareils, appairage | Existent | Hors périmètre au départ, s'il reste du temps |

Remplacer un jour le site actuel : à décider à la fin. La comparaison des deux architectures sert l'oral.

## Architecture visée

```
navigateur ──▶ serveur Node d'Analog (Nitro) ──────────────▶ API Spring (celeste.matthisripoche.com)
                 ├─ pages publiques : SSR ou SSG
                 ├─ pages connectées : SSR, connexion vérifiée côté serveur
                 ├─ couche serveur dédiée au front (routes src/server/routes/)
                 └─ middlewares : /health, journaux, limitation de débit
```

Rôle du serveur Node (validé, pistes A + B + E) :

- **A. Couche serveur dédiée au front (BFF)** : des routes Nitro (`h3`) qui appellent Spring, combinent les réponses et renvoient ce dont la page a besoin. Validation des paramètres, traduction des erreurs.
- **B. Connexion vérifiée côté serveur** : pendant le rendu SSR, Node transmet le cookie de session à Spring et sait si l'utilisateur est connecté avant d'envoyer la page. La redirection vers le login se fait côté serveur, sans clignotement.
- **E. Transversal** : route `/health` (contrôle de santé Docker), journaux des requêtes, limitation de débit sur le login.
- S'il reste du temps : **C.** cache serveur de données publiques (page du mod), **D.** relais du flux SSE `/api/live/stream`. Pas de base de données propre, sauf si la consigne l'exige.

Détails techniques :

- Le navigateur ne voit qu'une origine : le cookie de session `JSESSIONID` et le CSRF (`XSRF-TOKEN` → en-tête `X-XSRF-TOKEN`) fonctionnent sans CORS. Les appels qui n'ont pas besoin d'être transformés sont relayés tels quels vers Spring.
- En production, Spring est joint par son **adresse publique**, donnée par une variable d'environnement : son conteneur est sur le réseau privé de l'autre projet.
- Contrat de l'API et vocabulaire (face, tentative, SID) : `docs/api-spring.md`.
- Spécification des pages : `docs/arborescence-pages.md` du dépôt d'origine. Modèles TypeScript à reprendre : `web/src/app/core/*.model.ts` du dépôt d'origine.
- Connexion : **email et mot de passe d'abord**. Discord (OAuth2) plus tard : il faudra déclarer une seconde adresse de retour.

## Design

- Design system **« Topo »** du dépôt d'origine : jetons `web/src/styles/tokens.css`, composants `web/src/styles/ds.css` (classes `.ds-*`), doc `docs/design-system.md`.
- Clair et sombre, police Archivo, un seul surligneur doré par écran, des filets plutôt que des cartes ou des ombres. Pas de Tailwind.
- **Interdit** : sprites et assets de Celeste (© Extremely OK Games), police du jeu (Renogare). Seuls les motifs pixel dessinés pour le site sont autorisés (`shared/pixel/pixel-icons.ts` du dépôt d'origine).

## Production

- Sous-domaine prévu : `next.celeste.matthisripoche.com` (enregistrement DNS à créer), sur le VPS 57.129.139.62.
- **Traefik v3.7** (conteneur `traefik-traefik-1`, réseau Docker `frontend`) possède les ports 80 et 443 : **ne jamais publier 80/443 ni lancer un second reverse proxy**. Labels : entrypoint `websecure`, certresolver `ovhcloud`.
- Le VPS héberge d'autres applications. Modèle de déploiement : `docker-compose.prod.yml`, `.github/workflows/ci-cd.yml` et `deploy/README.md` du dépôt d'origine (images `ghcr.io/<owner>/…:sha-…`, SSH depuis la CI ; le port SSH n'est pas joignable depuis le poste de dev).

## Pièges d'environnement

- Docker Desktop ne démarre pas depuis le bac à sable de l'agent : demander à l'utilisateur de le lancer.
- Ports locaux déjà pris : 8080, 8081, 8090 (site Angular actuel), 5000 (API Spring locale).
- `npm audit` signale des vulnérabilités dans les dépendances générées par `create-analog` (à examiner, ne pas lancer `npm audit fix --force`).
