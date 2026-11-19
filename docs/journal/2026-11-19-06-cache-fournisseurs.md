## 2026-11-19 — Cache serveur des données publiques (#33)

**Demande** : `/issue 33`, piste C : mettre en cache côté Nitro les données publiques de Spring (l'issue citait la page du mod).

**Proposition de l'agent** : le `planner` a d'abord contredit deux prémisses de l'issue. Aucun cache n'existait (`/api/tableau-de-bord` appelle Spring à chaque requête, et ses données sont privées : elles ne doivent jamais être cachées), et la page `/mod` est prérendue sans rien lire de Spring. La seule lecture publique du front est `GET /api/auth/providers` (`{ discord: bool }`), appelée par le résolveur de `/login` à chaque rendu. Le chantier est donc réel mais modeste : un booléen.

**Validé par l'utilisateur** (les quatre recommandations)
- D1 : cacher `providers` seulement (écartés : fermer sans code ; cacher le HTML des pages publiques, qui dépend du cookie et de la query, donc risque de fuite entre joueurs) ;
- D2 : `defineCachedFunction` de Nitro, sur la fonction de chargement et non sur le handler. `defineCachedEventHandler` est écarté : il recopie `Set-Cookie` dans le cache ;
- D3 : nouvelle route `GET /api/connexion/fournisseurs` ; `/api/auth/providers` reste joignable par le relais ;
- D4 : valeur fraîche 5 min, servie périmée (swr) si Spring est en erreur, `cache-control: public, max-age=60`, en-tête `x-cache: HIT|MISS|STALE`.

**Réalisation** : lots 1 (chargeur et option `transmettreCookie` de `callSpring`), 3 (résolveur de `/login`) et 4 (doc) en parallèle, puis lot 2 (route et cas du script `tester-serveur.mjs`), puis `verifier` et `reviewer` en parallèle. L'appel à Spring ne transmet ni cookie ni `x-xsrf-token` : la valeur est la même pour tous. La clé de cache est fixe. Le chargeur lève l'erreur au lieu de renvoyer un repli `{ discord: false }`, qui serait resté servi 5 minutes.

**Erreurs et écarts rattrapés**
- Nitro ne dit pas d'où vient la valeur : le `dev` du lot 1 a deviné HIT/MISS/STALE avec deux compteurs d'appels réels au chargeur. Le `reviewer` a confirmé que la valeur est toujours juste et que seule l'étiquette peut se tromper sous requêtes simultanées (une requête qui attend un chargement déjà en cours est étiquetée HIT). C'est dit dans le code et dans la doc.
- Le `dev` du lot 2 n'a pas simulé le lot 1 dans la spec de la route : Vitest marquait les tests d'erreur en échec alors que les assertions passaient. Le `reviewer` pense à un rejet de promesse vu comme non géré avant que le test ne l'attende (non confirmé). La spec simule donc seulement `nitropack/runtime` et `fetch`, le reste de la chaîne est réel.
- Le `reviewer` a relevé que la doc écrivait `x-cache: hit` en minuscules (le code renvoie `HIT`) et un délai de 5 s (le code attend 2 s) : corrigé par la session principale. Il a aussi relevé que le script ne coupait jamais Spring après le succès : le cas « HIT avec Spring en panne » a été ajouté.
- Le `verifier` a écrit que le cas STALE était couvert par les tests unitaires. C'est faux : ces tests utilisent un cache transparent.

**Vérifié** : 635 tests, build, cas de `test:serveur`. Sur le serveur construit avec un faux Spring : un seul appel à Spring pour deux requêtes (MISS puis HIT), aucun cookie transmis, Spring coupé après un succès → toujours 200, serveur neuf sans Spring → 503 `no-store` puis 200 quand il revient, Spring en 500 → 502 non gardé, `/login` anonyme 200 (bouton Discord selon la valeur), connecté 302, `/api/auth/providers` toujours relayé, pages prérendues inchangées. Le mode `npm run dev` répond, sans erreur d'import de `nitropack/runtime`.

**Limites**
- **Le cas STALE** (valeur périmée servie quand Spring tombe après les 300 s) n'est testé nulle part : il faudrait attendre l'expiration ou rendre la durée configurable. Il repose sur le comportement documenté de Nitro (le `reviewer` l'a lu dans `cache.mjs`).
- Le gain est modeste (un booléen) : à assumer à l'oral.
- Cache en mémoire d'un seul conteneur : perdu au redémarrage, non partagé entre instances (même limite que la limitation de débit).
- Un changement de configuration Discord chez Spring met jusqu'à environ 5 min, plus le `max-age` de 60 s du navigateur, à apparaître.
