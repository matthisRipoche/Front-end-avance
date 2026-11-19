# Celeste Tracker — front Analog.js (projet de cours)

Nouveau front du projet **CelesteDeathTracker** (`~/projects/CelesteDeathTracker`, GitHub `matthisRipoche/CelesteDeathTracker`), écrit avec **Analog.js 2.9** (Angular 22, Vite 8, serveur Nitro, Node 24). Il consomme l'**API Spring Boot existante** sans la modifier.
Tout est **en français** : échanges, documentation, commentaires, commits.

Conventions du framework (routage par fichiers, routes serveur, chargement de données, contenu Markdown) : voir @AGENTS.md, qui renvoie au guide livré avec la version installée d'Analog.

## Cadre du cours

- Projet front-end avec Node.js et Analog.js. **Le front ET la partie Node (serveur Nitro) sont notés** : le serveur doit avoir de vraies responsabilités, pas seulement relayer `/api`.
- Livrables : ce dépôt Git, un **site en production**, un **oral sur l'organisation de travail avec l'IA agentique**.
- Échéance : 3 jours de cours + 3 à 4 semaines à la maison, à partir du 2026-10-22.

## Façon de travailler

- L'agent implémente tout (code, outillage, configuration, déploiement) et explique brièvement ses choix.
- **Décisions structurantes** (architecture, découpage, dépendance ajoutée, contrat avec l'API) : l'agent présente les options et leurs compromis, recommande, et **attend la validation avant de coder**.
- L'utilisateur relit les PR.
- Ne pas sur-outiller : le temps va au produit, pas à la configuration.

## Workflow agentique

Une fonctionnalité ou une issue non triviale passe par la skill **`/issue <n>`** (`.claude/skills/issue/SKILL.md`). La session principale coordonne et garde Git ; les agents du projet (`.claude/agents/`) produisent et vérifient :

| Étape | Qui | Rôle |
|---|---|---|
| 1 | `planner` | Plan découpé en lots aux fichiers disjoints, décisions à trancher. Lecture seule. |
| 2 | **utilisateur** | Valide le plan et tranche les décisions. |
| 3 | `dev` (un par lot, en parallèle si indépendants) | Code et tests d'un lot, selon les conventions. Ne commite pas. |
| 4 | `verifier` (Sonnet) + `reviewer` en parallèle | Le `verifier` est **seul** à construire et tester (build, tests, requêtes sur le serveur construit) ; le `reviewer` relit le diff face au plan posté sur l'issue. Lecture seule. |
| 5 | session principale | Corrections, journal, commits (skill `commit`). |
| 6 | **utilisateur** | Accord pour le push, relecture de la PR. |

Un agent ne parle pas à l'utilisateur : une décision imprévue remonte à la session principale, qui pose la question.

**Bibliothèque de skills des agents** (`.claude/skills/`), préchargés par le champ `skills:` de chaque agent et utilisables aussi par la session principale :

| Skill | Contenu | Agents |
|---|---|---|
| `analogjs` | Skill **officiel** d'Analog, livré dans `@analogjs/platform` (copie de `node_modules/@analogjs/platform/skills/analogjs`, version 2.9.1 : à recopier à chaque mise à jour d'Analog) : routage par fichiers, routes serveur, `load`, contenu Markdown | dev, planner, reviewer |
| `conventions-analog` | Où va chaque fichier, composants, SSR ou SSG, `routeMeta`, Markdown, design system, interdits | dev, planner, reviewer |
| `bff-spring` | Couche serveur : appeler Spring, cookies et CSRF, validation, traduction des erreurs, `load` SSR | dev, planner, reviewer |
| `tests-analog` | Tester une page, une route Nitro, un utilitaire ; simuler Spring | dev, reviewer, verifier |
| `review-analog` | Méthode de relecture, grille des pièges SSR/Nitro, gravité | reviewer |
| `conflits` | Résoudre les conflits d'une PR avec `main` sans rien perdre (PR empilées après un squash, doc modifiée des deux côtés) | session principale, réveillée par Auto-fix |

Une règle de code se met à jour **dans le skill**, pas dans un agent. Les points marqués « à vérifier » se tranchent au premier usage.

## Backlog : issues GitHub

Les tâches sont des issues GitHub, toutes assignées à l'utilisateur, rangées par jalon (« Étape 2 · Pages publiques » … « Étape 5 · Finitions et oral », « Bonus »). Labels de type : `front`, `serveur`, `outillage`, `design`, `doc`. Les labels `mode : à moi` et `mode : agent` restent sur GitHub mais ne changent plus la façon de travailler. Une branche traite une issue ; sa PR la ferme (`Closes #n`).

## Journal de l'IA : `docs/journal/`

C'est la matière de l'oral. **À chaque étape** (décision, fonctionnalité, correction notable), l'agent ajoute une entrée : la demande, sa proposition, ce que l'utilisateur a validé ou corrigé, et pourquoi. Noter aussi les erreurs de l'agent et la façon dont elles ont été rattrapées.

**Une entrée = un nouveau fichier** `docs/journal/AAAA-MM-JJ-NN-sujet.md` (règles dans `docs/journal/README.md`), jamais un ajout à un fichier commun : deux PR ouvertes n'entrent ainsi pas en conflit.

## Git

- **Chaque commit passe par le skill `commit`** (`.claude/skills/commit/SKILL.md`).
- Jamais de commit sur `main`. Une branche par sujet (`feat/…`, `fix/…`, `docs/…`, `chore/…`), puis pull request, fusion en **squash** (le titre de la PR devient le commit sur `main`).
- **Auto-fix** est activé sur chaque PR à sa création (skill `commit`) : l'app réveille la session sur un échec de CI, un conflit ou un commentaire. Un conflit se résout avec le skill `conflits`, et la session pousse sans redemander.
- **Conventional Commits en français**, commits atomiques, build et tests avant chaque commit. Imposé par un hook (`.claude/hooks/verifier-avant-commit.mjs`) : un `git commit` de l'agent est bloqué si les tests, le build ou les en-têtes échouent.
- Demander avant chaque `git push`.

## Commandes

| Action | Commande |
|---|---|
| Serveur de dev | `npm run dev` (Vite, port 5173) |
| Build (client, SSR, prérendu, serveur Nitro) | `npm run build` → `dist/analog/` |
| Tests | `npx vitest run` |
| Lancer le build | `npm run preview` (`node dist/analog/server/index.mjs`) |

## Conventions de code

Dans le skill **`conventions-analog`** (où va chaque fichier, template et styles séparés de la logique, pages Markdown, design system, interdits). Il fait foi : une règle de code se met à jour là, pas ici.

## Périmètre et architecture

Détail dans `docs/architecture.md`. L'essentiel :

- Pages publiques en SSR ou SSG ; pages connectées refaites en SSR, connexion vérifiée côté serveur. Historique, direct, appareils : hors périmètre au départ.
- Le serveur Node a de vraies responsabilités (pistes A + B + E validées) : couche serveur dédiée au front (BFF), session vérifiée pendant le rendu, `/health`, journaux, limitation de débit.
- Le navigateur ne voit qu'une origine (relais `/api`) ; Spring est joint par `NITRO_API_URL` : en production, le nginx de l'ancien projet (`http://celeste-web-1`, réseau Docker `frontend`), pas l'adresse publique, que Traefik réécrit (connexion Discord, 2026-11-18) ; en local, l'adresse du fichier `.env` (modèle `.env.example`), l'API Spring locale par défaut ; l'API de production y marche aussi, sauf la connexion Discord. Contrat de l'API : `docs/api-spring.md`.

## Design

- Design system : `docs/design-system.md` (source dans Claude Design), produit : `PRODUCT.md`, vitrine `/design-system`. Pas de Tailwind.
- Toute maquette part du design system ; **demander les goûts de l'utilisateur** avant de proposer une direction visuelle.
- **Interdit** : sprites, assets et police (Renogare) de Celeste (© Extremely OK Games). Seule exception (2026-10-25) : captures recadrées sur l'interface du mod.

## Production

- `new-celeste.matthisripoche.com`, sur un VPS partagé avec d'autres applications. Détail et modèle de déploiement : `deploy/README.md`.
- **Traefik possède les ports 80 et 443 : ne jamais publier 80/443 ni lancer un second reverse proxy.**
- Tout le déploiement est dans `deploy/` ; seul le workflow reste dans `.github/workflows/ci-cd.yml`.

## Pièges d'environnement

- Docker Desktop ne démarre pas depuis le bac à sable de l'agent : demander à l'utilisateur de le lancer.
- Ports locaux déjà pris : 8080, 8081, 8090 (site Angular actuel), 5000 (API Spring locale).
- `npm audit` signale des vulnérabilités dans les dépendances générées par `create-analog` (à examiner, ne pas lancer `npm audit fix --force`).
