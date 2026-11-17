## 2026-11-17 — Conflits : journal découpé, skill `conflits` et Auto-fix sur chaque PR

**Demande** : après la série #60 à #64, où l'agent a dû résoudre à la main les conflits de la #63 puis de la #64 : « un agent qui prend le relais quand il y a des conflits, et il faudrait automatiser ça ».

**Analyse de l'agent** : deux causes. **Le journal**, un seul fichier où chaque PR ajoutait son entrée à la fin, donc un conflit à chaque fusion. **Les PR empilées** (#62 → #63 → #64) fusionnées en squash : la fusion réécrit les commits de la parente, et la suivante entre en conflit sur des fichiers pourtant identiques. La première cause se supprime à la source ; la seconde se résout toujours avec la même méthode, qu'on peut écrire une fois.

**Options présentées** : pour le journal, un fichier par entrée ou garder un seul fichier. Pour la résolution : un skill et Auto-fix sur chaque PR, un sous-agent dédié en plus, ou un agent dans GitHub Actions (`claude-code-action` : sans app ouverte, mais clé d'API, coût, poussées sans relecture). **Validé** : un fichier par entrée, skill et Auto-fix partout (les recommandations).

**Découverte en découpant** : l'entrée de journal de la #61 (limitation de débit du login) n'était plus dans `main`. Elle avait été perdue dans un « Merge branch 'main' » résolu en ne gardant que le côté de `main`. Récupérée depuis le commit `1c7e141` de la PR. C'est exactement le risque que le skill `conflits` décrit : un conflit mal résolu ne casse ni les tests ni le build, il efface du travail en silence.

**Fait** :
- `docs/journal-ia.md` devient `docs/journal/`, avec un fichier par entrée (`AAAA-MM-JJ-NN-sujet.md`) et un `README.md`. 28 entrées. Un contrôle confirme qu'aucune ligne n'est perdue. Les entrées du 2026-11-16 sont remises dans l'ordre réel des PR, mélangé par les fusions.
- Skill `conflits` : préparer, comprendre d'où vient chaque conflit (PR empilée après un squash : comparer `main` au dernier commit de la parente dans la branche), vérifier que rien n'est perdu, lancer tests, build et `curl`, puis pousser. C'est la méthode appliquée sur la #63 et la #64.
- Skill `commit` : chaque PR créée active Auto-fix, et un push fait après la demande de relecture se signale à l'utilisateur (leçon de la #65).
- `CLAUDE.md`, `README.md` et la skill `issue` pointent vers `docs/journal/`.

**Pour l'oral** : on ne met pas l'agent là où un changement d'organisation suffit. Le découpage du journal supprime la plupart des conflits ; l'agent ne garde que ceux qu'on ne peut pas éviter, avec une méthode écrite.
