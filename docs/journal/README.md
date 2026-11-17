# Journal de l'IA

Pour chaque étape : la demande, la proposition de l'agent, ce qui a été validé ou corrigé, et pourquoi. C'est la matière de l'oral sur l'organisation de travail avec l'IA agentique.

Agent : Claude Code (modèle Claude Opus 5.5).

## Lire

Une entrée par fichier. Les fichiers se lisent dans l'ordre de leur nom : `AAAA-MM-JJ-NN-sujet.md`, où `NN` numérote les entrées d'une même journée.

## Ajouter une entrée

1. Créer un **nouveau fichier** : `AAAA-MM-JJ-NN-sujet-court.md`. Pour `NN`, prendre le numéro qui suit le dernier fichier de la journée (`01` si c'est le premier).
2. Le commencer par `## AAAA-MM-JJ — Titre`, puis la demande, la proposition, ce qui a été validé ou corrigé, et pourquoi.
3. Pour compléter une entrée de la même branche, modifier son fichier. Ne jamais modifier l'entrée d'une autre branche.

**Pourquoi un fichier par entrée** : jusqu'au 2026-11-17, le journal tenait dans un seul fichier, `docs/journal-ia.md`. Chaque PR y ajoutait son entrée à la fin, donc deux PR ouvertes en même temps entraient toujours en conflit. Une entrée a même été perdue en résolvant l'un de ces conflits (#61). Avec un fichier par entrée, deux branches n'écrivent jamais le même fichier. Si deux branches prennent le même `NN`, les noms restent différents grâce au sujet : seul l'ordre de lecture de la journée est approximatif.
