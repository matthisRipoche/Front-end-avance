## 2026-10-23 — Le backlog passe dans les issues GitHub

**Demande.** Rédiger les tâches dans GitHub, sous forme d'issues. L'emplacement du backlog, resté ouvert le matin, est tranché.

**Proposition de l'agent.** Trois organisations possibles : jalons et labels ; labels seuls ; jalons, labels et tableau Projects. Il a recommandé la première, pour éviter la cérémonie du Kanban sur un projet mené seul. **Validé**, avec toutes les issues assignées à l'utilisateur.

**Mis en place.**
- 5 jalons : une étape par jalon, plus Bonus.
- 7 labels : type (`front`, `serveur`, `outillage`, `design`, `doc`) et mode mixte (`mode : à moi`, `mode : agent`). Le mode mixte est ainsi visible dans l'outil de suivi, pas seulement dans `CLAUDE.md`.
- 32 issues (#6 à #37). Chacune contient :
  - le contexte ;
  - une liste « À faire » ;
  - un critère « Fini quand » ;
  - pour les tâches `mode : à moi`, la leçon à donner d'abord.
- Les décisions encore ouvertes sont écrites dans les issues concernées, comme le choix du mécanisme de relais ou la source du contenu de la page du mod.
- Le skill `commit` ferme l'issue depuis la PR (`Closes #n`).
