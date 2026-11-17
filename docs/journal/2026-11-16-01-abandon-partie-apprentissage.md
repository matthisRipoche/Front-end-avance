## 2026-11-16 — Abandon de la partie apprentissage

**Demande** : en préparant un workflow d'agents (planner, verifier, reviewer), l'utilisateur a demandé pourquoi il n'y avait pas de sous-agent de développement. L'agent a répondu que le code restait dans la session principale pour que l'utilisateur suive et comprenne les concepts. L'utilisateur a alors décidé : « enlève dans le projet la partie apprentissage ».

**Questions de l'agent avant d'agir** : supprimer les fichiers ou seulement changer les règles ? Toucher aux labels GitHub ? **Validé** : tout supprimer dans le dépôt (l'historique Git garde les leçons), laisser les labels sur GitHub.

**Fait** :
- `learning/` (mission, notes, 2 leçons, 1 fiche) et le skill `teach` sont supprimés.
- `CLAUDE.md` : le « mode mixte » laisse place à une règle simple. L'agent implémente tout et l'utilisateur valide les décisions structurantes et relit les PR. Les labels `mode : …` n'ont plus d'effet.
- Références retirées du README, du skill `commit` et de `deploy/Dockerfile.dockerignore`.

**Pourquoi c'est notable pour l'oral** : l'organisation a encore changé, pour la troisième fois après le 2026-10-23. Le cadre pédagogique servait le début du projet. Il ralentit maintenant la livraison, et la délégation à des sous-agents de développement devient possible.
