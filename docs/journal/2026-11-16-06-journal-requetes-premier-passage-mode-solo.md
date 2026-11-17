## 2026-11-16 — Journal des requêtes (#16), premier passage en mode solo

**Demande** : « on passe à la suite et fait les PR solo avec un rapport à chaque fois ». Nouvelle façon de travailler : l'agent enchaîne les issues de l'étape 3, tranche seul les décisions selon sa recommandation, pousse et ouvre la PR ; l'utilisateur relit chaque PR et la fusionne. Les points d'arrêt du workflow `/issue` deviennent un rapport par PR.

**Proposition** : issue petite, donc sans `planner` (le skill `/issue` le permet). Une ligne par requête, `[req] GET /faq 200 12ms`, écrite quand Node a fini d'envoyer la réponse (statut et durée définitifs). Ni query (code OAuth), ni cookie, ni corps (mot de passe). `/health` seulement en cas d'échec : Docker l'appelle toutes les 30 s.

**Ce que la vérification a attrapé** : la première version était un **middleware Nitro** (`src/server/middleware/`), comme l'indiquait le skill `bff-spring`. Le `reviewer` (en lisant le code de Nitro) et le `verifier` (en interrogeant le serveur construit) ont trouvé indépendamment le même défaut bloquant : en production, Nitro place son gestionnaire de fichiers statiques **avant** les middlewares. Les pages prérendues (`/`, `/faq`…) et les JS/CSS partaient sans ligne de journal, alors que les tests, montés sur une petite application h3, passaient. Le `verifier` a aussi vu une ligne « interrompue » en double pour chaque page pendant le prérendu.

**Correction** : un **plugin Nitro** (`src/server/plugins/journal.ts`) branché sur le hook `request`, appelé avant tout gestionnaire. Le test reproduit désormais l'ordre réel (suivi dans `onRequest`, gestionnaire « statique » avant le routeur). « Interrompue » se décide sur `res.writableEnded`, plus sur un drapeau posé par `finish`. Le skill `bff-spring` est corrigé, pour que la prochaine fois parte du bon endroit.

**Pour l'oral** : des tests verts ne suffisaient pas, parce qu'ils ne reproduisaient pas l'ordre des gestionnaires du vrai serveur. C'est la requête sur le serveur construit qui a montré le trou, et la règle fausse venait d'un skill écrit par l'agent lui-même.
