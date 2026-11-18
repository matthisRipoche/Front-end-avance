# API Spring consommée par le front

Production : `https://celeste.matthisripoche.com`. En local, l'API tourne sur le port 5000.

Le serveur Node ne l'écrit nulle part en dur : il lit la variable `NITRO_API_URL` au démarrage (`http://localhost:5000` par défaut ; en production `http://celeste-web-1`, voir « Connexion Discord ») et construit les adresses avec `springUrl()` (`src/server/utils/spring.ts`).
Code source : `~/projects/CelesteDeathTracker/api/`. Ce projet **ne modifie pas** l'API.

## Authentification du navigateur

- Session HTTP : cookie `JSESSIONID` (HttpOnly).
- CSRF : cookie `XSRF-TOKEN`, posé dès un GET, à renvoyer dans l'en-tête `X-XSRF-TOKEN` à chaque POST, PUT ou DELETE.
- Toutes les lectures sont filtrées par le compte connecté. Sans session : **401**.
- Le serveur Node d'Analog relaie `/api/**` vers Spring : le navigateur ne voit qu'une origine, donc pas de CORS.

### Authentification du navigateur (via le relais)

> Relevé le 2026-11-16 à travers le relais, sur le serveur construit, contre l'API de production et l'API locale.

Cookies posés par Spring :

| Cookie | Production | Local (Spring en http) |
|---|---|---|
| `XSRF-TOKEN` | `<uuid>; Path=/; Secure` | `<uuid>; Path=/` |
| `JSESSIONID` | `<id>; Path=/; Secure; HttpOnly; SameSite=Lax` | non relevé |

- Aucun `Domain` : les cookies se rattachent à l'origine du front. Le relais les recopie sans les réécrire.
- `XSRF-TOKEN` n'est pas HttpOnly : le navigateur peut le lire pour remplir l'en-tête.

Parcours CSRF d'une écriture :

1. Un premier `GET /api/…` fait poser `XSRF-TOKEN`.
2. Le navigateur envoie l'écriture avec le cookie et l'en-tête `X-XSRF-TOKEN` à la même valeur.
3. Le relais transmet cookie, en-tête et corps à Spring.

Vérifié sur `POST /api/auth/login` : avec le cookie mais sans l'en-tête, **403** ; avec l'en-tête et de faux identifiants, **401**. Le 401 prouve que le CSRF est passé.

Ce que le relais ajoute :

- `/api/_analog/**` (interne à Analog) et `/api/ingest/**` (réservé au mod, Bearer) : **404**, sans appeler Spring.
- Une adresse qui sortirait de `/api/` une fois `..` ou `%2e%2e` résolus, ou dont l'encodage est invalide : **404**, sans appeler Spring. Le filtre juge l'adresse que Spring recevrait, décodée.
- `POST /api/auth/login` au-delà de **10 essais par minute** pour une même adresse IP : **429** `{ message: "Trop de tentatives de connexion. Réessaie dans N s." }` et en-tête `Retry-After`, sans appeler Spring (`src/server/middleware/limite-connexion.ts`). Limite du front seulement : Spring reste joignable directement à son adresse publique.
- Erreur 5xx de Spring : **502** `{ message: "Erreur de l'API" }`, sans en-têtes ni cookies de Spring. Spring injoignable : **503** `{ message: "API indisponible" }`. Les 4xx passent tels quels.
- Les autres en-têtes de Spring (`strict-transport-security`, `x-frame-options: DENY`, `server: nginx`) sont transmis tels quels.

## Routes

| Méthode et route | Rôle |
|---|---|
| `POST /api/auth/register` | Créer un compte |
| `POST /api/auth/login` | Connexion, corps `{email, password}` |
| `POST /api/auth/logout` | Déconnexion : 204 ; exige une session (401 sinon) et le CSRF |
| `GET /api/auth/me` | Compte connecté (401 sinon) |
| `GET /api/auth/providers` | Fournisseurs disponibles : `{discord: bool}` |
| `GET /api/auth/oauth2/discord` · `GET /api/auth/oauth2/callback/discord` | Départ et retour de la connexion Discord (voir « Connexion Discord ») |
| `GET /api/summary?tz=Europe/Paris` | Tableau de bord : `{resume, today, recent, activity}` (voir plus bas) |
| `GET /api/faces` | Une ligne par face jouée |
| `GET /api/faces/detail?sid=&side=` | Rooms dans l'ordre avec les arrêts, évolution, dernières tentatives |
| `GET /api/faces/room?sid=&side=&room=` | Détail d'une room |
| `GET /api/attempts?sid=&side=&result=&period=7d\|30d\|all&page=&size=` | Tentatives paginées |
| `GET /api/attempts/{id}` | Une tentative |
| `GET /api/live` · `GET /api/live/stream` | Partie en cours ; flux SSE (événements `snapshot`, `ping` toutes les 15 s) |
| `GET/POST/DELETE /api/tokens` | Appareils (tokens du mod) |

### `GET /api/summary`

> En production depuis le 2026-10-22 (PR #18 du dépôt d'origine, fusionnée et déployée) : le site Angular actuel l'appelle déjà.

- `resume` : dernière face jouée, ou `null` — `sid, side, mapName, lastPlayedAt, attempts, clears, bestRooms, knownRooms`.
- `today` : `attempts, clears, bestAttemptMs, mostPlayed`.
- `recent` : 3 faces au plus, sans celle de `resume`.
- `activity` : 14 éléments `{day: "AAAA-MM-JJ", attempts, clears}`.

## Routes du front

Routes écrites dans Nitro (`src/server/routes/api/`), sans équivalent chez Spring. Une route précise passe avant le relais générique. Leurs erreurs ont le même corps que celles du relais : `{ message }`, en français.

### `GET /api/tableau-de-bord`

> Issue #24. Route : `src/server/routes/api/tableau-de-bord.get.ts`, logique : `src/server/utils/tableau-de-bord.ts`.

Combine `GET /api/summary` et `GET /api/live`, appelés en parallèle avec le cookie de la requête, et renvoie la forme dont la page a besoin.

Fuseau horaire, dans cet ordre :

1. `?tz=` : doit être un fuseau connu d'`Intl` (64 caractères au plus, une seule fois), sinon **400** `{ message: "Le fuseau horaire doit être un nom IANA, par exemple Europe/Paris." }` (un `?tz=` vide aussi) ;
2. sinon le cookie `tz` : un fuseau invalide est ignoré ;
3. sinon `Europe/Paris`.

Le fuseau retenu, sous sa forme canonique, est transmis à `/api/summary`.

Codes :

| Cas | Réponse |
|---|---|
| Succès | **200** `TableauDeBord` |
| `?tz=` invalide | **400** `{ message: "Le fuseau horaire doit être un nom IANA, par exemple Europe/Paris." }`, sans appeler Spring |
| Pas de cookie de session | **401** `{ message: "Connexion requise" }`, sans appeler Spring |
| Spring répond 401 (session expirée ou fausse) | **401** `{ message: "Connexion requise" }` |
| Spring répond 5xx sur `/api/summary` | **502** `{ message: "Erreur de l'API" }` |
| Spring injoignable ou plus lent que 5 s | **503** `{ message: "API indisponible" }` |

- `/api/live` est accessoire : s'il échoue ou dépasse **2 s**, la route répond quand même avec `enJeu: null`. Si `/api/summary` échoue, la route échoue.
- En succès : `cache-control: private, no-store` et `Vary: Cookie`. La réponse porte le compte du joueur : aucun cache ne doit la garder.

Forme `TableauDeBord` (détail : `src/app/modeles/tableau-de-bord.ts`). Champs en français, en liste blanche : un champ ajouté par Spring n'arrive pas au navigateur.

| Champ | Contenu |
|---|---|
| `fuseau` | Fuseau retenu |
| `reprendre` | Dernière face jouée (`resume` de Spring), ou `null` |
| `aujourdhui` | Bilan du jour (`today`) |
| `recentes` | Faces récentes (`recent`) |
| `activite` | 14 derniers jours (`activity`) |
| `enJeu` | Partie en cours (`/api/live`), ou `null` |
| `vide` | Vrai si `reprendre` est `null` **et** aucune tentative sur les 14 jours d'`activite` (`activite.max` vaut 0) : la page montre l'accueil d'un nouveau joueur |

### `GET /api/maps`

> Issue #26. Route : `src/server/routes/api/maps.get.ts`, logique : `src/server/utils/mes-maps.ts`.

Appelle `GET /api/faces` avec le cookie de la requête et renvoie les faces jouées dans la forme dont la page `/maps` a besoin : nom de repli, mod déduit du SID, liste des mods, ordre stable.

- **Aucun paramètre** de tri, de filtre ni de fuseau : le résolveur de la page appelle toujours la même URL (même clé de TransferState côté serveur et côté navigateur), et la page trie et filtre elle-même. Un `?tz=` est ignoré.
- Fuseau : le cookie `tz` s'il est valide (même règle que le tableau de bord), sinon `Europe/Paris`. Il ne sert qu'à l'affichage des dates : `/api/faces` ne le reçoit pas.

Codes :

| Cas | Réponse |
|---|---|
| Succès | **200** `MesMaps` |
| Pas de cookie de session | **401** `{ message: "Connexion requise" }`, sans appeler Spring |
| Spring répond 401 (session expirée ou fausse) | **401** `{ message: "Connexion requise" }` |
| Spring répond 5xx | **502** `{ message: "Erreur de l'API" }` |
| Spring injoignable ou plus lent que 5 s | **503** `{ message: "API indisponible" }` |

- En succès : `cache-control: private, no-store` et `Vary: Cookie`.

Forme `MesMaps` (détail : `src/app/modeles/mes-maps.ts`). Champs en français, en liste blanche.

| Champ | Contenu |
|---|---|
| `fuseau` | Fuseau retenu pour afficher les dates |
| `faces` | Une `FaceJouee` par face : `sid, side, nom, mod, tentatives` (`attempts`), `deathless` (`clears`), `dernierePartie` (`lastPlayedAt`, ms Unix). Triées par `dernierePartie` décroissante, ex aequo par `sid` puis `side` |
| `mods` | `{ nom, faces }` pour chaque mod joué, par nombre de faces décroissant, puis par nom |

- `nom` : `mapName` de Spring, sinon le dernier segment du SID (`StrawberryJam2021/1-Beginner/maya` → `maya`).
- `mod` : premier segment du SID (`Celeste/1-ForsakenCity` → `Celeste`), sinon le SID entier.
- **Limite** : `/api/faces` ne donne aucune progression (rooms atteintes, rooms vues). La page n'affiche donc pas de meilleure progression ; elle viendra avec le détail d'une face (#27).

### `GET /api/connexion/discord`

> Issue #35. Route : `src/server/routes/api/connexion/discord.get.ts`, cookie : `src/server/utils/retour-connexion.ts`.

Départ de la connexion par Discord. Spring renvoie toujours sur `/login?discord=ok`, sans savoir quelle page le joueur voulait : la route la retient dans un cookie, puis passe la main au flux de Spring. Elle n'appelle pas Spring.

- `?redirect=` : page où revenir, filtrée par `cheminDeRetour` (`src/app/auth/retour.ts`). Une adresse externe (`//evil.fr`, `https://…`, `/\evil.fr`), un `redirect` répété ou absent, ou `/` : **aucun cookie**.
- Cookie `retour-connexion` : le chemin, `HttpOnly`, `SameSite=Lax` (le retour de Discord est une navigation venue d'un autre site), `Path=/`, `Max-Age=600`, `Secure` en https.
- Au retour, le middleware de session relit le cookie, le revalide par `cheminDeRetour`, l'efface et renvoie le joueur connecté vers cette page.

Codes :

| Cas | Réponse |
|---|---|
| Toujours | **302** vers `/api/auth/oauth2/discord`, `cache-control: no-store` ; cookie `retour-connexion` si une page interne est demandée |

## Vocabulaire

- **Face** : une map (SID, par exemple `Celeste/1-ForsakenCity`) + un côté A, B ou C. Le SID contient des `/` : il passe **toujours en paramètre de requête**, jamais dans le chemin.
- **Tentative** : l'unité du site.
- **Deathless réussi** : tentative terminée sans aucune mort.

Modèles TypeScript existants : `web/src/app/core/{face,summary,attempt,live}.model.ts` du dépôt d'origine.

## Connexion Discord

> Issue #35. Flux OAuth2 de Spring réutilisé tel quel, sans le modifier. Relais : `src/server/routes/api/[...path].ts`, utilitaires `enTetesOrigine` et `locationRelative` (`src/server/utils/relais.ts`).

Parcours du navigateur :

1. `/login` affiche « Continuer avec Discord » si `GET /api/auth/providers` répond `{discord: true}`. Le lien mène à `GET /api/connexion/discord?redirect=…` (route du front, voir plus bas).
2. `GET /api/auth/oauth2/discord`, par le relais : Spring pose `JSESSIONID` (il porte l'état OAuth2) et répond par une **302 vers discord.com**, avec la `redirect_uri`.
3. Discord renvoie le navigateur sur `GET /api/auth/oauth2/callback/discord?code=…&state=…`, par le relais.
4. Spring ouvre la session et répond par une 302 vers `/login?discord=ok`, ou `/login?discord=erreur` en cas d'échec.
5. Sur `/login`, le middleware de session renvoie le joueur connecté vers la page retenue (cookie `retour-connexion`), sinon vers `/`. Un `?discord=ok` reçu par un anonyme, ou un `?discord=erreur`, affiche une alerte.

`redirect_uri` : Spring la construit à partir des en-têtes `X-Forwarded-Host`, `-Proto` et `-Port` qu'il reçoit. Elle doit être l'adresse du front, et être déclarée dans le portail Discord (adresses : `deploy/README.md`).

Ce que le relais fait pour ce flux :

- **`redirect: 'manual'`** : il ne suit aucune redirection. La 302 vers discord.com atteint le navigateur avec son `Set-Cookie`.
- **En-têtes d'origine calculés** (`enTetesOrigine`), sur toutes les requêtes relayées : `X-Forwarded-Host` et `-Proto` relus sur la requête reçue (posés par Traefik en production, déduits de `Host` en local), `X-Forwarded-Port` recalculé (port de l'hôte, sinon celui du protocole). Ils remplacent ceux du client.
- **`Location` absolue réécrite en relatif** (`locationRelative`) : une redirection qui pointe sur l'origine de Spring ou sur l'origine publique du front devient un chemin (`/login?discord=ok`), pour que le navigateur reste sur le front. Toute autre adresse (discord.com) passe intacte.
- Les 3xx ne sont pas journalisés comme des erreurs ; aucune query n'est écrite au journal (le retour porte un `code` à usage unique).

Mesures en production avant le développement (2026-11-18), depuis le conteneur `celeste-next-web-1`, avec `X-Forwarded-Host: new-celeste.matthisripoche.com` :

| Spring joint par | `redirect_uri` construite |
|---|---|
| `https://celeste.matthisripoche.com` (Traefik) | `https://celeste.matthisripoche.com/…` : l'**ancien site**, car Traefik réécrit `X-Forwarded-Host` |
| `http://celeste-web-1` (nginx de l'ancien projet, réseau Docker `frontend`) | `https://new-celeste.matthisripoche.com/api/auth/oauth2/callback/discord` : **correcte** |

D'où `API_URL=http://celeste-web-1` en production, valeur par défaut du workflow de déploiement (`deploy/README.md`). `GET /api/auth/providers` répond `{"discord":true}` en production.
