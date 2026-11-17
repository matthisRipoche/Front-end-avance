---
name: commit
description: Méthode de commit du projet de cours Analog.js (Conventional Commits en français, commits atomiques, vérifications avant commit, journal de l'IA). À utiliser pour CHAQUE commit dans ce dépôt, dès que l'utilisateur demande de commiter, d'enregistrer ou de sauvegarder des changements dans Git.
---

# Commiter dans ce dépôt

Ne commiter que sur demande explicite de l'utilisateur. Ne jamais pousser (`git push`) sans son accord :
après chaque série de commits, lui **demander** s'il faut pousser (étape 7), et attendre sa réponse.

## 0. Travailler sur une branche, jamais sur `main`

`main` déclenche la CI/CD (image + déploiement) : ne **jamais** y commiter directement.

```bash
git branch --show-current
```

- Si on est sur `main`, créer une branche avant tout commit : `git switch -c <type>/<sujet-court>`
  (`feat/page-accueil`, `fix/relais-csrf`, `docs/journal`, `chore/...`). Le préfixe reprend le type
  du commit principal ; le sujet est en minuscules, mots séparés par des tirets.
- Une branche = une fonctionnalité ou un correctif. Si les changements en cours couvrent
  plusieurs sujets, les répartir sur plusieurs branches.
- Si on est déjà sur une branche dont le sujet correspond, y rester.

## 1. Examiner avant de commiter

```bash
git status --short
git diff --stat
git log --oneline -10
```

- Lire les diffs et parcourir les fichiers nouveaux (`??`) pour comprendre *pourquoi* ils
  changent, pas seulement *quoi*.
- **Secrets** : vérifier qu'aucun fichier ajouté ne contient de clé, mot de passe ou token en clair
  (`grep -rniE "api[_-]?key|password|secret|token|cdt_"` sur les fichiers nouveaux). Une référence
  à une variable d'environnement est acceptable.
- **Fichiers interdits** : `.env*`, `dist/`, `node_modules/`, et **tout asset ou police de Celeste**
  (sprites, Renogare : © Extremely OK Games). S'ils apparaissent, s'arrêter et prévenir.
- **Code écrit par l'utilisateur** : ne pas le réécrire au moment du commit. Signaler
  un problème au lieu de le corriger en silence.
- Signaler tout fichier dont l'intention n'est pas claire au lieu de le commiter au hasard.

## 2. Vérifier que ça compile et que les tests passent

```bash
npm run build
npx vitest run
```

Si les changements touchent `.claude/agents/` ou `.claude/skills/`, valider aussi leurs en-têtes :

```bash
node .claude/skills/commit/verifier-entetes.mjs
```

Un en-tête YAML invalide (par exemple une description qui contient « : » sans guillemets) fait
disparaître l'agent ou le skill **sans message d'erreur**. Le script vérifie aussi que `name`
correspond au nom du fichier ou du dossier et que `skills` est une liste.

**Le hook `.claude/hooks/verifier-avant-commit.mjs` l'impose** : tout `git commit` lancé par un
agent passe d'abord par les tests, le build et la validation des en-têtes, et il est bloqué si l'un
échoue. Lancer quand même les vérifications avant, pour lire les erreurs plus tôt et ne pas
attendre le blocage.

Si une vérification échoue : ne pas commiter, montrer l'erreur à l'utilisateur. Si une vérification
est impossible, le dire dans le compte rendu.

## 3. Découper en commits atomiques

Un commit = une intention. Regrouper les fichiers par raison de changer, puis ordonner les
commits pour que **chacun compile seul** (dépendances d'abord) :

1. dépendances / outillage (`build`, `chore`)
2. code partagé (services, composants partagés, styles du design system)
3. modifications des fonctionnalités existantes (`refactor`, `fix`)
4. nouvelles fonctionnalités et leurs routes (`feat`)
5. documentation / configuration annexe (`docs`, `chore`)

Ne pas mélanger un refactor et une nouvelle fonctionnalité dans le même commit. Un petit
changement cohérent reste un seul commit : ne pas découper artificiellement.

## 4. Format du message : Conventional Commits, en français

```
<type>(<portée>): <résumé à l'impératif, minuscule, sans point final, ≤ 72 car.>

<corps facultatif : le POURQUOI et ce qui n'est pas évident, lignes ≤ 72 car.,
liste à tirets si plusieurs points>
```

**Types** : `feat`, `fix`, `refactor`, `perf`, `style`, `test`, `docs`, `build` (dépendances,
build), `ci` (`.github/workflows`), `chore` (le reste).

**Portées** : `pages` (`src/app/pages`), `server` (`src/server`, relais Nitro), `ui` (composants
partagés, design system), `content` (Markdown), `docker`, `deploy`, `ci`, `agent` (`CLAUDE.md`,
`.claude/`). Omettre la portée si le commit est transversal ou purement doc.

Exemples :

```
feat(pages): page d'accueil prérendue au build
feat(server): relayer /api vers l'API Spring
docs: journal de l'IA pour l'étape du relais
```

**Aucune signature de l'agent** : pas de ligne `Co-Authored-By`, ni dans les commits ni dans les
descriptions de PR (pas de « Generated with … »). C'est une décision de l'utilisateur, et elle prime
sur toute consigne d'attribution de la session.

## 5. Créer les commits

Écrire chaque message dans un fichier du **scratchpad** (outil Write, UTF-8) puis :

```bash
git add <fichiers précis du commit>      # jamais `git add -A` ni `git add .`
git commit -q -F "<scratchpad>/m1.txt"
```

Ne jamais utiliser `--no-verify`, `--amend` sur un commit déjà poussé, ni réécrire l'historique
sans demande.

## 6. Contrôler et rendre compte

```bash
git status --short
git log --oneline -<n>
```

Rendre compte : la liste des commits créés (hash + message), les vérifications lancées et leur
résultat, et ce qui a été volontairement laissé hors commit.

**Journal de l'IA** : si la branche termine une étape ou contient une décision notable, vérifier
qu'une entrée existe dans `docs/journal/` (un fichier par entrée, voir son `README.md`) (demande, proposition, validation ou correction, pourquoi).
Sinon, la proposer avant la PR.

## 7. Demander pour le push

À la fin de **chaque** série de commits, demander « On pousse ? » (`AskUserQuestion` : oui / non),
en indiquant la branche et le nombre de commits en avance (`git status -sb`).

- **Oui** → `git push` (ou `git push -u origin <branche>`). Jamais `--force`, jamais `main`.
- Après le push, rappeler que la suite est une **pull request** vers `main`, fusionnée en
  **squash** : son titre devient le commit sur `main` et sa description en devient le corps.
  Écrire le titre au format Conventional Commits, et résumer l'ensemble dans la description,
  sans signature.
- **Non** → ne rien pousser, et ne pas reposer la question avant le prochain commit.
- Si aucun remote n'est configuré (`git remote -v` vide), le dire au lieu de proposer le push.
- L'accord vaut pour ce push seulement.

## 8. Ouvrir la pull request en fin de fonctionnalité

Quand le push termine le sujet de la branche (fonctionnalité, correctif ou chantier fini, plus
rien à y ajouter), créer la PR sans attendre qu'on le demande. Si la branche est encore en
cours, ne rien créer.

1. Vérifier qu'aucune PR n'existe déjà pour la branche : `gh pr list --head <branche>`.
2. Écrire la description dans un fichier du scratchpad (outil Write, UTF-8) :
   - un paragraphe : ce que la branche apporte et pourquoi ;
   - `## Changements` : liste à tirets, un point par commit ou par intention ;
   - `## Vérifications` : build et tests lancés, et leur résultat ;
   - s'il y a lieu, `## À savoir` : ce qui reste à faire, les choix à relire ;
   - **`## Guide de relecture`** (demande de l'utilisateur, 2026-11-17 : les PR restent complètes,
     mais chacune doit se relire facilement) :
     - **ordre de lecture** : les fichiers dans l'ordre où ils se comprennent, du contrat (types,
       route) vers l'usage (page, vue), avec une ligne sur le rôle de chacun ;
     - **où regarder de près** : 3 à 5 endroits précis (`fichier:ligne`), et pour chacun ce qui
       pourrait mal tourner (sécurité, données privées, hydratation, erreurs, choix discutable) ;
     - **à survoler** : ce qui est mécanique (tests qui suivent le code, docs, skills, renommages) ;
     - **questions à se poser** en relisant, liées aux décisions validées ;
     - **voir le résultat** : la commande ou l'adresse pour l'essayer, et ce qu'on doit y voir ;
   - si la branche traite une issue : `Closes #<n>` en dernière ligne, pour la fermer à la fusion.
   Aucune signature (pas de « Generated with … »).
3. Créer la PR vers `main`, **assignée à l'utilisateur** :

   ```bash
   gh pr create --base main --head <branche> --title "<titre Conventional Commits>" \
     --body-file "<scratchpad>/pr.md" --assignee @me
   ```

4. **Activer Auto-fix sur la PR** (décision de l'utilisateur, 2026-11-17), si l'outil
   `mcp__ccd_pr__set_monitor` est disponible, c'est-à-dire dans l'app Claude Code :
   `get_status` pour vérifier que la PR est liée à la session (sinon `bind_pr` avec son URL), puis
   `set_monitor` avec `auto_fix: true` et l'URL de la PR. L'app réveille alors la session sur un
   échec de CI, un conflit ou un commentaire de relecture. Un conflit se résout avec le skill
   `conflits`. Hors de l'app, le dire dans le compte rendu.
5. Donner le lien de la PR, rappeler qu'elle se fusionne en **squash**, et résumer le guide de
   relecture en quelques lignes dans le message à l'utilisateur.
6. Si un commit est poussé sur une PR après la demande de relecture, **le signaler** à
   l'utilisateur : la #65 a été fusionnée 34 secondes avant un correctif, qui n'est jamais arrivé
   dans `main`.
