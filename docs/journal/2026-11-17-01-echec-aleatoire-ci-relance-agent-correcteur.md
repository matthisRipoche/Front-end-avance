## 2026-11-17 — Échec aléatoire en CI : relance plutôt qu'agent correcteur

**Constat** : la CI de la PR #61 (limitation des tentatives de connexion) échoue au build. Le garde-fou de la #57 signale 4 pages prérendues vides : c'est la course du plugin Angular d'Analog, pas le code de la PR. Une simulation des cinq PR ouvertes fusionnées ensemble construit sans erreur.

**Demande** : « un agent qui se réveille si la pipeline ne passe pas, pour corriger le code ».

**Réponse de l'agent** : sur cet échec-là, un agent correcteur se tromperait de cible. Le code est sain, et l'agent risquerait de le « corriger » pour faire passer la CI. Il propose de séparer deux besoins :
- **échec aléatoire du prérendu** : le régler dans la pipeline, sans agent ;
- **vrais échecs** (test cassé, erreur de type) : un agent a du sens. Deux options : l'**Auto-fix de l'app** (la session est réveillée sur un échec de CI, un conflit ou un commentaire de relecture, rien à installer) ou un **agent dans GitHub Actions** (`claude-code-action` : marche sans session ouverte, mais clé d'API en secret, coût par échec, poussées sans relecture, et sur-outillage).

**Validé** : relance automatique du build, et Auto-fix de l'app.

**Fait** : dans `ci-cd.yml` et `deploy/Dockerfile`, un build en échec est relancé une fois, avec un avertissement visible dans la CI. Une vraie erreur échoue deux fois, et la CI reste rouge. La logique (`a || { avertir; a; }`) a été essayée sur un faux build : code 0 si le second essai passe, code 1 s'il échoue aussi.

**Pour l'oral** : ne pas mettre un agent là où une règle suffit. L'agent correcteur aurait été spectaculaire, mais il aurait traité le symptôme, et sur du code sain.

**Suite, le même jour : la relance ne suffisait pas.** Activé sur la PR #65, l'Auto-fix réveille l'agent : la construction de l'image Docker échoue, et la relance a échoué **deux fois de suite** dans le conteneur. `main` était rouge aussi depuis la fusion de la #60. La recommandation de l'agent (« c'est rare, une relance suffit ») était fausse : sous Docker, la course arrive presque à chaque fois.

**Correction à la source** : le code d'Analog (`vite-plugin-nitro`, `buildApp`) lance les builds client et SSR avec `Promise.all` et des plugins partagés. Un petit plugin du projet, `buildsSequentiels()` dans `vite.config.ts`, les enchaîne. Preuve : avec le SSR ralenti exprès, 2 builds sur 2 passent avec le plugin, et le même build échoue sans lui. C'était l'option « builds séquentiels » écartée la veille parce qu'elle touchait au fonctionnement interne d'Analog. La relance reste en filet de sécurité.

**Pour l'oral** : l'Auto-fix a servi dès le premier échec. Mais c'est le constat « deux échecs de suite », pas l'agent seul, qui a montré que le diagnostic de départ était trop optimiste.

**Correctif resté en route** : la #65 a été fusionnée 34 secondes avant que l'agent pousse `buildsSequentiels()`. Seule la relance est arrivée dans `main`. L'agent ne l'a remarqué que le lendemain, en préparant la fusion de la #63 : `main` ne contenait pas le plugin. Les deux commits sont repris sur une nouvelle branche. À retenir : un push sur une PR déjà approuvée doit se signaler à l'utilisateur, pas seulement se faire.
