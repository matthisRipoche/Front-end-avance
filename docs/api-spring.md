# API Spring consommée par le front

Production : `https://celeste.matthisripoche.com`. En local, l'API tourne sur le port 5000.

Le serveur Node ne l'écrit nulle part en dur : il lit `runtimeConfig.apiUrl` (`http://localhost:5000` par défaut, `NITRO_API_URL` en production) et construit les adresses avec `springUrl()` (`src/server/utils/spring.ts`).
Code source : `~/projects/CelesteDeathTracker/api/`. Ce projet **ne modifie pas** l'API.

## Authentification du navigateur

- Session HTTP : cookie `JSESSIONID` (HttpOnly).
- CSRF : cookie `XSRF-TOKEN`, posé dès un GET, à renvoyer dans l'en-tête `X-XSRF-TOKEN` à chaque POST, PUT ou DELETE.
- Toutes les lectures sont filtrées par le compte connecté. Sans session : **401**.
- Le serveur Node d'Analog relaie `/api/**` vers Spring : le navigateur ne voit qu'une origine, donc pas de CORS.

## Routes

| Méthode et route | Rôle |
|---|---|
| `POST /api/auth/register` | Créer un compte |
| `POST /api/auth/login` | Connexion, corps `{email, password}` |
| `POST /api/auth/logout` | Déconnexion |
| `GET /api/auth/me` | Compte connecté (401 sinon) |
| `GET /api/auth/providers` | Fournisseurs disponibles : `{discord: bool}` |
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

## Vocabulaire

- **Face** : une map (SID, par exemple `Celeste/1-ForsakenCity`) + un côté A, B ou C. Le SID contient des `/` : il passe **toujours en paramètre de requête**, jamais dans le chemin.
- **Tentative** : l'unité du site.
- **Deathless réussi** : tentative terminée sans aucune mort.

Modèles TypeScript existants : `web/src/app/core/{face,summary,attempt,live}.model.ts` du dépôt d'origine.

## Connexion Discord (plus tard)

L'adresse de retour OAuth2 est déclarée chez Discord pour le site actuel. Via le relais, il faudra en déclarer une seconde et vérifier comment Spring construit la sienne. On commence par email et mot de passe.
