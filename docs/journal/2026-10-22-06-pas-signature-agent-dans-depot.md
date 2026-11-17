## 2026-10-22 — Pas de signature de l'agent dans le dépôt

**Demande de l'utilisateur.** « J'ai pas envie que tu sois visible dans le repo. »

**Proposition de l'agent.** Avant de toucher à quoi que ce soit, lister tous les endroits où il apparaissait :
- la ligne `Co-Authored-By` dans ses commits ;
- la mention « Generated with Claude Code » dans la description de la PR. Elle serait entrée dans l'historique de `main`, puisque la fusion en squash reprend la description de la PR ;
- le skill `commit`, qui imposait cette ligne ;
- les fichiers d'organisation.

Il a ensuite proposé trois niveaux : retirer les signatures seulement ; les signatures et le nom du modèle ; tout ce qui concerne l'IA. Il a signalé que le troisième niveau retirerait du dépôt la matière de l'oral.

**Validé.** Retirer **les signatures seulement**. Les deux commits de la PR #1 sont réécrits sans la ligne (la branche n'était pas encore fusionnée), et le skill `commit` interdit désormais toute signature. `CLAUDE.md`, les skills, `learning/` et ce journal restent : ils montrent l'organisation, sans signer le code.

**Pourquoi c'est notable.** Une consigne de l'utilisateur passe avant les réglages par défaut de l'outil. L'agent l'a aussi enregistrée dans sa mémoire, pour qu'elle tienne dans les prochaines sessions.
