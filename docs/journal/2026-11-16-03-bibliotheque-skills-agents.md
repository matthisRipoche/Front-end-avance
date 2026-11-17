## 2026-11-16 — Bibliothèque de skills pour les agents

**Demande** : « une bibliothèque de skills que les agents pourraient utiliser pour être plus efficaces », dont un skill de conventions Angular/Analog et un skill pour mieux relire.

**Proposition de l'agent** : quatre skills écrits pour ce projet, plutôt qu'installés depuis l'extérieur (les packs publics sont génériques, et l'un d'eux s'était révélé obsolète). Ce sont les deux demandés, plus `tests-analog` et `bff-spring`. Ils sont branchés aux agents par le champ `skills:`, qui les précharge au démarrage. **Validé** : les quatre.

**Mis en place** :
- `conventions-analog` : où va chaque fichier (avec un fichier modèle par type), composants, SSR ou SSG, `routeMeta`, pièges du Markdown, design system. Renvoie à `angular-developer` et au guide d'Analog de `node_modules` au lieu de les recopier.
- `review-analog` : méthode (« où s'exécute ce code ? », suivre les données de Spring au HTML), grille par priorité (données privées prérendues, cookie partagé entre utilisateurs, hydratation…), gravité définie, scénario d'échec obligatoire, liste de ce qu'il ne faut pas signaler.
- `tests-analog` : une recette par type de fichier, avec Spring simulé par `vi.stubGlobal('fetch')`.
- `bff-spring` : la recette de la couche serveur (`callSpring(event, …)`, cookies et CSRF de la requête en cours, tableau de traduction des erreurs, `load` SSR qui appelle Spring directement).
- `dev.md` et `reviewer.md` sont allégés : les règles vivent dans les skills, partagées par l'agent qui écrit et celui qui relit.

**Vérifier avant d'écrire** : avant de les mettre dans `tests-analog`, l'agent a essayé deux méthodes de test dans des fichiers jetables, aussitôt supprimés : une route h3 appelée par `toWebHandler` (paramètres, cookie, 400), et une page dont `injectLoad` est simulé. Elles fonctionnent toutes les deux. Ce que le projet n'a pas encore éprouvé (attributs des cookies de Spring derrière le relais, redirection depuis un `load`) est marqué **à vérifier** dans `bff-spring`, au lieu d'être présenté comme acquis.

**Pour l'oral** : séparer les **rôles** (agents) et le **savoir** (skills). Une règle ne s'écrit qu'une fois, et l'agent qui code et celui qui relit appliquent la même.

**Erreur de l'agent rattrapée au commit** : l'agent `verifier` a disparu de la session juste après l'ajout de `skills:`. Cause : depuis la PR #55, les descriptions du `verifier` et du `reviewer` contenaient « : », ce qui rend le YAML de l'en-tête invalide. Claude Code les acceptait tant que l'en-tête restait simple, mais plus avec une liste. Le `reviewer` du projet, lui, était masqué depuis le début par le `reviewer` global du même nom, sans que personne ne s'en aperçoive. Correction dans un commit `fix` à part. À retenir : valider le YAML des en-têtes avant chaque commit d'agent ou de skill. Sur demande de l'utilisateur, le skill `commit` le fait désormais avec `verifier-entetes.mjs`, essayé sur un en-tête cassé exprès.
