---
name: issue
description: Workflow agentique du projet pour traiter une issue GitHub ou une demande de fonctionnalité de bout en bout (planner → validation → dev → verifier + reviewer → commit → PR). À utiliser quand l'utilisateur tape /issue <n>, demande de « traiter », « faire » ou « prendre » une issue, ou lance une fonctionnalité non triviale.
---

# Traiter une issue avec les agents du projet

La session principale **coordonne** : elle lance les agents, présente leurs résultats, s'arrête aux points de validation et garde la main sur Git. Les agents (`.claude/agents/`) produisent et vérifient, mais ne parlent pas à l'utilisateur : **tout ce qui demande une décision passe par la session principale**.

Argument : un numéro d'issue (`/issue 12`) ou une demande en texte libre.

## 1. Planifier : agent `planner`

- Lance `planner` avec le numéro d'issue ou la demande telle que l'utilisateur l'a formulée.
- Relis son plan : les lots touchent-ils bien des fichiers disjoints ? Les dépendances sont-elles claires ?
- Petite demande évidente (un fichier, aucune décision) : tu peux sauter le planner et le dire.

## 2. Valider : point d'arrêt, utilisateur

- Présente le plan en bref : objectif, lots, vérification prévue.
- S'il y a des **décisions à trancher**, pose-les avec `AskUserQuestion` (recommandation en premier) et **attends** les réponses.
- Sans décision à trancher, demande simplement le feu vert sur le plan.
- **Conserve le plan validé** : c'est la référence de la relecture et la trace de l'oral. Écris-le dans un fichier du scratchpad (outil Write), puis :
  - **issue** : `gh issue comment <n> --body-file <fichier>`, avec un titre `## Plan validé` ;
  - **demande sans issue** : garde le fichier, et colle son contenu dans la PR sous `## Plan validé` (étape 6).

  Le commentaire contient l'objectif, les lots, la vérification prévue, et **chaque décision avec l'option retenue** (et ce que l'utilisateur a corrigé, s'il y a lieu). Si une décision change en cours de route, ajoute un commentaire `## Plan modifié` plutôt que de réécrire le premier.
- Puis crée la branche proposée depuis `main` à jour (`git switch main && git pull && git switch -c <branche>`), jamais de travail sur `main`.

## 3. Développer : agent(s) `dev`

- Un agent `dev` **par lot**. Les lots indépendants partent **dans un seul message** (appels `Agent` en parallèle), les lots dépendants après ceux dont ils dépendent.
- Chaque `dev` part de zéro : son brief contient le lot complet (fichiers, consignes, modèle, tests), les décisions validées qui le concernent, et le rappel de ne toucher qu'à ses fichiers. Si d'autres `dev` tournent en même temps, le brief le dit : ils ne lancent alors pas le build.
- Si un `dev` remonte une décision ou un fichier hors périmètre : retour au point d'arrêt (question à l'utilisateur), puis relance.
- Ne crois pas un `dev` sur parole : regarde `git status` et le diff de ses fichiers.

## 4. Vérifier : `verifier` et `reviewer` en parallèle

- Lance les deux **dans un seul message**. Seul le `verifier` construit et teste : le `reviewer` lit. Pendant ce temps, la session principale ne lance ni build ni tests non plus.
  - `verifier` : avec la section « Vérification » du plan.
  - `reviewer` : avec le **numéro d'issue** : il lit le plan validé dans les commentaires de l'issue. Sans issue, avec le fichier du plan.
- Points **bloquants** ou **à corriger** : relance un `dev` sur les fichiers concernés (ou corrige toi-même si c'est une ligne), puis relance le seul agent concerné.
- Deux tours au maximum. Au-delà, présente les points restants à l'utilisateur au lieu de boucler.
- Les points **mineurs** sont listés à l'utilisateur, pas corrigés d'office.

## 5. Consigner et commiter

- Ajoute une entrée dans `docs/journal/`, un nouveau fichier `AAAA-MM-JJ-NN-sujet.md` (voir `docs/journal/README.md`) : la demande, le plan, les décisions validées, ce que les agents ont produit, les erreurs rattrapées (y compris celles des agents).
- Commite avec le skill `commit` (commits atomiques, build et tests avant).

## 6. Pousser et ouvrir la PR : point d'arrêt, utilisateur

- Le skill `commit` demande l'accord pour le push, puis ouvre la PR (`Closes #n`), fusionnée en squash après relecture de l'utilisateur.
- Demande sans issue : la description de la PR reprend le plan validé sous `## Plan validé`.

## Compte rendu final

Court : ce qui est fait, les agents lancés et ce qu'ils ont trouvé, les vérifications et leur résultat, ce qui reste ouvert.
