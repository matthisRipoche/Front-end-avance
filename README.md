# Celeste Death Tracker, nouveau front

Un compagnon de deathless pour les joueurs de Celeste. Un mod Everest enregistre chaque tentative ; le site montre, face par face, jusqu'où elles vont, où elles s'arrêtent, et si le joueur progresse.

Ce dépôt est le nouveau front du projet [CelesteDeathTracker](https://github.com/matthisRipoche/CelesteDeathTracker), écrit avec **Analog.js** (Angular 22, Vite, serveur Nitro sous Node 24). Il consomme l'API Spring existante sans la modifier. C'est aussi un projet de cours, construit avec un agent IA : l'organisation de ce travail fait partie du rendu.

**En ligne : https://new-celeste.matthisripoche.com**

Projet de fan, non officiel. Celeste est une marque d'Extremely OK Games ; le site n'en reprend ni les sprites, ni la musique, ni la police. Les seules images du jeu sont des captures de l'interface du mod.

## Lancer le projet

Node 24 est requis.

| Action | Commande |
|---|---|
| Installer | `npm install` |
| Serveur de développement (port 5173) | `npm run dev` |
| Tests | `npx vitest run` |
| Build : client, rendu serveur, prérendu, serveur Nitro (`dist/analog/`) | `npm run build` |
| Lancer le build | `npm run preview` |

## Organisation du dépôt

| Dossier ou fichier | Contenu |
|---|---|
| `src/app/pages/` | Une route par fichier `*.page.ts` (routage par fichiers d'Analog) |
| `src/app/layout/` | Navigation et pied de page communs |
| `src/app/ui/` | Composants Angular du design system |
| `src/styles/` | Jetons et composants du design system en CSS |
| `src/server/routes/` | Routes du serveur Node (Nitro), par exemple `/health` |
| `deploy/` | Image Docker, service de production derrière Traefik, procédure de déploiement |
| `.github/workflows/` | CI/CD : tests, build et image sur chaque PR ; déploiement à chaque fusion sur `main` |
| `docs/` | API Spring consommée, design system, journal du travail avec l'IA |
| `PRODUCT.md` | Le produit : public, rôle, contraintes, principes |

## Travail avec l'agent IA

- `CLAUDE.md` : règles de travail de l'agent (mode mixte, Git, architecture, production).
- `AGENTS.md` : renvoie aux conventions d'Analog livrées avec la version installée.
- `.claude/` : skills du projet (commit, enseignement, Angular, design) et configuration.
- `skills-lock.json` : versions des skills installés. Il reste à la racine, où l'outil `skills` le cherche ; c'est aussi le cas de `PRODUCT.md` pour le skill `impeccable`.
- `learning/` : leçons et fiches produites pendant le projet.
- `docs/journal-ia.md` : chaque étape, avec les propositions de l'agent, les corrections de l'utilisateur et les erreurs rattrapées.

Les tâches sont suivies dans les [issues GitHub](https://github.com/matthisRipoche/Front-end-avance/issues), par étape.
