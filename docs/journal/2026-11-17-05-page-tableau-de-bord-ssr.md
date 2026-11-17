## 2026-11-17 — Page du tableau de bord (#25) : maquette, données en SSR et un `retry` caché

**Demande** : « Oui, #25 », la page du tableau de bord, maquette d'abord.

**Maquette** : un canvas Claude Design construit avec le design system du projet. Il compte trois écrans : bureau en sombre, état vide, mobile en clair. Chaque bloc correspond à un champ du contrat de la route de #24. **Validée**, avec deux ajustements techniques venus du plan : des dates précises au lieu de « il y a 2 h », qui casseraient l'hydratation, et aucun lien vers des pages qui n'existent pas encore.

**Plan (`planner`)** : il a lu le code d'Analog 2.9.1 pour trancher D1, reportée depuis #24. Pendant le SSR, `requestContextInterceptor` appelle `$fetch.raw` avec les en-têtes de la requête Angular, mais personne n'y met le cookie du joueur. En cas d'erreur, le rejet est une `FetchError` d'ofetch, et non une `HttpErrorResponse`. **Validé**, sur ses recommandations :
- **D1** : un intercepteur qui recopie le cookie vers `/api/` relatif, et un résolveur qui appelle la route sans paramètre, pour garder la même clé de TransferState ;
- **D2** : vrai statut HTTP en cas d'erreur ;
- **D3** : cookie `tz` posé à la connexion et par la page ;
- **D4** : `/mod` pour l'état vide, du texte au lieu des liens vers les pages absentes.

**Déroulé** :
- **PR #69 pas encore fusionnée** : l'agent a lancé d'abord les lots qui n'en dépendaient pas (intercepteur, fuseau, graphique), puis il a demandé la fusion. Il a aussi repoussé le lot de documentation, qui aurait créé un conflit sur `bff-spring`.
- Six lots au total, dont deux vagues de trois `dev` en parallèle sans build. Un seul agent a construit.

**Vérification** : le `verifier` monte un faux Spring local pour simuler une vraie session. Il prouve que :
- la page arrive remplie ;
- le cookie atteint Spring pendant le SSR ;
- les données sont dans `ng-state` ;
- l'état vide et le 502 fonctionnent ;
- le fuseau de New York est respecté ;
- le mode dev marche aussi, donc le repli prévu est inutile.

Il relève aussi un écart : **Spring était appelé deux fois quand il répondait 500**.

**Cause trouvée par la session principale** : ofetch relance par défaut une fois un GET en 500, 502, 503 ou 504, et Analog ne passe pas d'option `retry`. Si Spring était seulement lent, le rendu attendait deux fois le délai de 5 s. Correction : un plugin Nitro (`fetch-sans-relance.ts`) remplace `globalThis.$fetch` par la même instance, réglée avec `retry: 0`. Nitro pose `$fetch` avant de lancer les plugins, ce que l'agent a vérifié dans son code. Preuve : un test (deux appels sans le plugin, un avec), puis le faux Spring en 500 sur le serveur construit, qui ne reçoit plus qu'un appel.

**Relecture** : fusionnable. Quatre mineurs, corrigés à la demande de l'utilisateur :
- les mots collés par la suppression des blancs d'Angular (`&ngsp;`) ;
- une légende pour le repère des deathless ;
- « Plus longue » remise au format chrono `03:17` de la maquette, un écart que personne n'avait annoncé ;
- une ligne fausse dans `bff-spring`.

**Erreurs de l'agent** :
- Une session a été interrompue pendant une correction. Au retour, l'agent a fait le point sur ce qui était déjà fait avant de reprendre.
- Pour arrêter ses serveurs de test, l'agent a de nouveau écrit `kill $(pgrep -f …)`, et son propre shell s'est tué (code 144). Un faux Spring est resté actif ; il a été arrêté par son PID, et le piège est noté dans la mémoire de l'agent.

**Pour l'oral** :
- L'écart « deux appels en 500 » ne se voyait ni dans les tests unitaires ni à la relecture. Seule une vérification sur le serveur construit, avec un faux Spring qui compte les appels, l'a fait apparaître. La cause, une option par défaut d'une dépendance de la dépendance, ne se lisait que dans `node_modules`.
- Un agent qui vérifie et un agent qui relit voient des choses différentes. Le `reviewer` a trouvé les mots collés et l'écart de format ; le `verifier`, le double appel.
