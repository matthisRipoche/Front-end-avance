## 2026-11-16 — Session vérifiée côté serveur, redirection, déconnexion (#19, #20, fin de #21)

**Demande** : suite de l'étape 3. C'est le cœur de la piste B (la partie Node notée), donc l'agent a d'abord lancé le `planner`, puis présenté les décisions structurantes au lieu de trancher seul.

**Ce que le planner a établi en lisant `node_modules`** : Angular ne reçoit pas les cookies pendant le SSR d'Analog 2.9 (ni par `HttpClient`, ni dans un `load`), et un `sendRedirect` dans un `load` ne redirige pas la page. Le skill `bff-spring` affirmait le contraire sur ces deux points.

**Décisions validées par l'utilisateur** (les quatre recommandations) : garder le SSG des pages publiques (la navigation y bascule après chargement pour un joueur connecté) ; un middleware Nitro qui interroge Spring `/api/auth/me` avec le cookie et fait le 302 avant tout HTML ; navigation connectée = email, « Tableau de bord », « Se déconnecter » ; une page provisoire `/tableau-de-bord`.

**Production** : cinq lots, quatre agents `dev` (deux fois deux en parallèle, fichiers disjoints). Le lot 4 a cassé deux specs hors de son périmètre (une requête `/api/auth/me` imprévue) : l'agent l'a signalé au lieu d'y toucher, la session principale a corrigé.

**Ce que la vérification a attrapé** :
- Le `verifier`, avec un **faux Spring local** (aucun compte créé en production) : tout le parcours au `curl` (302 sans appel à Spring, 200 connecté, 503 si Spring tombe, pages prérendues intactes). Et une page publique rendue pour un joueur connecté sans `cache-control`.
- Le `reviewer` : **bloquant**, le serveur de dev ne pouvait pas charger le middleware (`nitropack/runtime` introuvable hors de Nitro). L'agent principal l'a reproduit : `npm run dev` **plantait à la première requête**, et la PR 61 (limitation du login) avait le même défaut. En corrigeant, il a trouvé deux autres pièges du mode dev en instrumentant le middleware : Vite réécrit `req.url` en `/index.html` (la vraie adresse est dans `originalUrl`), et un middleware qui a répondu doit renvoyer une valeur, sinon Analog enchaîne sur le rendu.
- Corrections : `springUrl` lit directement `NITRO_API_URL` (une seule source, appliquée aussi à la PR 61) ; `private, no-store` + `Vary: Cookie` sur toute page rendue pour un joueur connecté ; seuls les champs connus du compte vont dans le HTML. Les pièges sont consignés dans `bff-spring` et `tests-analog`.

**Pour l'oral** : tous les tests passaient et le serveur construit marchait ; c'est le mode dev, que personne n'avait lancé depuis des PR, qui était cassé. Les agents testaient le build de production, pas l'outil de travail quotidien. La leçon : ajouter `npm run dev` aux vérifications du `verifier` dès qu'on touche à `src/server/middleware/`.

---
