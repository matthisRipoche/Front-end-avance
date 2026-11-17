---
name: conflits
description: "Résoudre les conflits de fusion d'une PR de ce projet (Celeste Tracker) avec main, sans perdre le travail d'aucun côté. Cas des PR empilées après une fusion en squash, fichiers de doc et skills modifiés des deux côtés, vérifications avant de pousser. À utiliser quand Auto-fix signale un conflit, quand GitHub affiche « This branch has conflicts », ou quand l'utilisateur demande de corriger les conflits d'une PR."
---

# Résoudre les conflits d'une PR avec `main`

Principe : **ne rien perdre**. Un conflit mal résolu ne casse souvent ni les tests ni le build : il efface en silence le travail d'un côté. C'est arrivé : l'entrée de journal de la #61 a disparu dans un « Merge branch 'main' » résolu en gardant le côté de `main`.

## 1. Préparer

```bash
git status --short                      # rien en cours, sinon s'arrêter et le dire
git fetch origin --prune
gh pr view <n> --json headRefName,baseRefName,mergeable
git switch <branche> && git reset --hard origin/<branche>   # partir de la PR telle que poussée
git merge --no-edit origin/main
git diff --name-only --diff-filter=U    # fichiers en conflit
```

**Fusionner `main` dans la branche**, ne pas rebaser : on ne réécrit pas une branche déjà poussée.

## 2. Comprendre d'où vient chaque conflit

```bash
git log --oneline origin/main..HEAD^2   # ce que main apporte (HEAD^2 = main pendant la fusion)
git log --oneline HEAD^2..HEAD          # ce que la branche apporte
```

### Cas 1 : PR empilée, et la PR parente a été fusionnée en squash

Signe : conflits « ajout/ajout » sur des fichiers créés par la PR parente. La fusion en squash a réécrit les commits de la parente, et Git ne les reconnaît plus dans la branche.

Méthode, fichier par fichier : comparer la version de `main` à celle du **dernier commit de la parente contenu dans la branche** (`<parent>`).

```bash
diff <(git show "<parent>:<fichier>") <(git show "origin/main:<fichier>")
```

- **Identiques** : `main` n'a rien de plus que la parente, et la branche contient la parente plus son propre travail. On garde la branche : `git checkout --ours -- "<fichier>"`.
- **Différents** : `main` a reçu autre chose depuis (une autre PR, ou une correction de la parente pendant sa relecture). On fusionne à la main, cas 2.

### Cas 2 : le même passage modifié des deux côtés

Lire les deux versions et **combiner**. Ne prendre un côté entier que si l'autre est vraiment remplacé : par exemple, la branche réécrit une section de skill que `main` avait seulement retouchée. Dans ce cas, vérifier que la retouche de `main` est reprise ou devenue sans objet, et le dire dans le message de commit.

### Cas 3 : texte ajouté des deux côtés au même endroit

Listes, tableaux, sections ajoutées en fin de fichier (`docs/api-spring.md`, un skill) : **garder les deux ajouts**, dans un ordre logique.

Le journal ne devrait plus jamais entrer en conflit : une entrée = un fichier (`docs/journal/README.md`). Si une branche ancienne modifie encore `docs/journal-ia.md`, déplacer son entrée dans un nouveau fichier de `docs/journal/`.

## 3. Vérifier qu'aucun travail n'est perdu

```bash
grep -rn '^<<<<<<<\|^=======$\|^>>>>>>>' $(git diff --name-only HEAD) # plus aucun marqueur
git diff origin/main --stat             # la PR ne montre plus que ses propres fichiers
git diff HEAD^1 --stat                  # ce que la fusion change par rapport à la branche
```

Pour chaque fichier résolu « à la main », relire `git diff HEAD^1 -- <fichier>` et `git diff HEAD^2 -- <fichier>` : ce qui disparaît d'un côté doit être voulu.

## 4. Vérifier que ça marche

Lancer les commandes **l'une après l'autre**, jamais en parallèle :

```bash
npx vitest run
npm run build                           # doit afficher « ✓ Prérendu : … pages avec contenu »
node .claude/skills/commit/verifier-entetes.mjs   # si .claude/ est touché
```

Si la PR touche le serveur (middleware, routes, session), lancer le serveur construit et vérifier par `curl` les adresses qu'elle concerne (codes HTTP, redirections), puis l'arrêter.

## 5. Commiter et pousser

Commit de fusion, message en français, qui dit **comment** chaque groupe de fichiers a été résolu :

```
chore: fusionner main dans <branche>

Résout les conflits nés de <cause> :
- <fichiers> : version de la branche, qui contient déjà <…>
- <fichier> : les ajouts des deux côtés sont gardés
```

- **Conflit signalé par Auto-fix** : l'activation d'Auto-fix vaut accord pour pousser sur la branche de la PR. Pousser sans demander.
- **Sinon** : demander avant le push, comme pour tout commit (skill `commit`).

Rendre compte : les fichiers en conflit, comment chacun a été résolu, les vérifications et leur résultat.

## Ce qu'il ne faut pas faire

- `git checkout --theirs` ou `--ours` sur tout le dépôt d'un coup.
- Résoudre en ne gardant que `main` pour « repartir propre » : c'est comme ça qu'on perd du travail.
- Rebaser ou forcer le push (`--force`) une branche déjà poussée.
- Toucher au code au-delà de la résolution : une correction trouvée en route va dans un commit à part.
