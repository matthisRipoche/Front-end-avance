---
name: bff-spring
description: Recettes de la couche serveur du projet Celeste Tracker (Nitro/h3 entre le navigateur et l'API Spring) - où écrire une route, appeler Spring avec springUrl, relayer JSESSIONID et le CSRF, valider les paramètres, traduire les erreurs, combiner des réponses, charger les données d'une page SSR et vérifier la connexion côté serveur. À charger pour écrire, planifier ou relire du code dans src/server/ ou un load .server.ts.
---

# Couche serveur dédiée au front (BFF)

```
navigateur ──▶ Nitro (src/server/) ──▶ API Spring (springUrl)
               une seule origine        adresse donnée par NITRO_API_URL
```

Contrat de l'API et vocabulaire (face, SID, tentative) : `docs/api-spring.md`. Ce projet **ne modifie jamais** l'API Spring.

> **État** : `/health`, `springUrl()` et le relais générique `/api/**` (#15), le journal des requêtes (plugin) et la limitation de débit du login (`src/server/middleware/limite-connexion.ts`, limiteur `src/server/utils/limite-debit.ts`, adresse IP `adresseClient`) existent. `callSpring()`, les routes dédiées et la connexion côté serveur sont à construire : les recettes ci-dessous fixent la façon de faire. Ce qui n'a pas encore été éprouvé dans le projet est marqué **à vérifier** : vérifie-le au premier usage, puis mets ce skill à jour.

## Choisir le bon outil

| Besoin | Outil | Fichier |
|---|---|---|
| Passer un appel tel quel à Spring | relais générique (`proxyRequest`) | `src/server/routes/api/[...path].ts` |
| Transformer, valider, combiner pour une page | route dédiée | `src/server/routes/api/<nom>.<méthode>.ts` (une route précise passe avant le relais générique) |
| Données d'une page rendue en SSR | `load` dans un `.server.ts` voisin de la page | `pages/…/<page>.server.ts`, lu par `injectLoad` |
| Code partagé par les routes et les `load` | utilitaire | `src/server/utils/` |
| Transversal (journaux, limitation de débit) | plugin Nitro (hook `request`, passe avant les fichiers statiques) ou middleware Nitro | `src/server/plugins/`, `src/server/middleware/` |

Une route dédiée n'existe que si elle apporte quelque chose (validation, combinaison, forme adaptée à la page, traduction d'erreurs). Sinon, le relais suffit.

## Le relais générique `/api/**`

`src/server/routes/api/[...path].ts`, toutes méthodes, appuyé sur `proxyRequest` de h3 (utilitaire voisin : `src/server/utils/relais.ts`).

- **`/api/_analog/**` est réservé à Analog.** Dès que `src/server/routes/api/` existe, Analog sert les `load` des pages sous `/api/_analog/pages/…` et son propre relais `/api` (qui retirait le préfixe) disparaît. N'écris jamais de route sous ce préfixe.
- **Refusés en 404, sans appeler Spring** : `/api/_analog/**` et `/api/ingest/**` (réservé au mod, authentifié par Bearer). Le filtre porte sur le chemin **final, décodé et normalisé** : tout chemin qui sortirait de `/api/` (`..`, `%2e%2e`) est refusé aussi. Un nouveau préfixe interdit s'ajoute à cette liste, avec un test.
- **Ce que `proxyRequest` fait seul** : transmet `cookie` et `x-xsrf-token`, remplace `host`, retire les en-têtes hop-by-hop, n'envoie pas `accept` (Spring répond en JSON quand même), recopie chaque `Set-Cookie` séparément. Aucune réécriture de cookie n'est nécessaire (voir « Cookies et CSRF »).
- **Erreurs** : les 4xx de Spring passent tels quels. Spring ≥ 500 → **502** `{ message: "Erreur de l'API" }`, sans les en-têtes ni les `Set-Cookie` de Spring. Spring injoignable → **503** `{ message: "API indisponible" }`. `console.error` avec méthode et chemin **sans la query** (un retour OAuth y porte un code), statut, jamais de cookie.
- **Piège de la réécriture des 5xx** : elle se fait dans l'option `onResponse` de `proxyRequest`, en écrivant la réponse directement (`res.end`). `send()` y est différé et n'empêche pas `sendProxy` de recopier la réponse de Spring.
- **Piège de Spring injoignable** : h3 transforme le `fetch` rejeté en un 502 générique. Le relais l'attrape pour renvoyer le 503 du tableau.
- **Coupure pendant le corps** : si Spring casse après l'envoi des en-têtes, le 503 n'est plus possible. Le relais journalise « réponse interrompue » et détruit la connexion du navigateur (`res.destroy()`), sinon il attend sans fin. Un `end()` ferait passer le corps tronqué pour complet.
- **Redirections** : `proxyRequest` les suit (`redirect: 'follow'`). Quand Discord arrivera, passer en `redirect: 'manual'` pour que la redirection OAuth2 atteigne le navigateur.

## Appeler Spring

- Adresse : **toujours** `springUrl('/api/…')` (`src/server/utils/spring.ts`), jamais d'adresse en dur.
- Client : le `fetch` natif de Node. Aucune dépendance à ajouter, et simple à simuler en test (skill `tests-analog`).
- Passe par **un seul utilitaire** qui reçoit l'`event` h3, pour que le relais des cookies et la traduction des erreurs soient écrits une fois (à créer dans `src/server/utils/spring.ts` au premier besoin) :

```ts
import { createError, getRequestHeader, type H3Event } from 'h3';

/** Appelle Spring au nom de l'utilisateur de la requête en cours. */
export async function callSpring<T>(event: H3Event, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const cookie = getRequestHeader(event, 'cookie');
  if (cookie) headers.set('cookie', cookie);            // JSESSIONID + XSRF-TOKEN
  const xsrf = getRequestHeader(event, 'x-xsrf-token');
  if (xsrf) headers.set('x-xsrf-token', xsrf);           // écritures (POST, PUT, DELETE)

  let res: Response;
  try {
    res = await fetch(springUrl(path), { ...init, headers });
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'API indisponible' });
  }
  if (!res.ok) throw springError(res.status);
  return (await res.json()) as T;
}
```

`springError(status)` applique le tableau « Traduire les erreurs » ci-dessous et renvoie un `createError`.

## Cookies et CSRF

- Le cookie de session (`JSESSIONID`, HttpOnly) et `XSRF-TOKEN` viennent **de la requête en cours** : lus sur l'`event`, jamais gardés dans une variable de module (elle serait partagée entre tous les utilisateurs).
- Écritures : le navigateur envoie `X-XSRF-TOKEN` ; Nitro le transmet tel quel.
- Quand Spring pose ou efface un cookie (login, logout), le `Set-Cookie` doit revenir au navigateur. `proxyRequest` le fait. Dans une route dédiée qui fait un login : recopier chaque `Set-Cookie` de la réponse (`res.headers.getSetCookie()`) avec `appendResponseHeader(event, 'set-cookie', …)`.
- Attributs posés par Spring (relevés le 2026-11-16, détail dans `docs/api-spring.md`) : `Path=/` et **aucun `Domain`**, donc les cookies se rattachent à l'origine du front. On les recopie **sans les réécrire**. `Secure` n'apparaît qu'en production (Spring en https) : en local, `XSRF-TOKEN` arrive sans `Secure`.
- CSRF éprouvé de bout en bout à travers le relais : une écriture sans `X-XSRF-TOKEN` reçoit 403 de Spring. Spring n'a pas de CORS : l'en-tête `Origin` transmis ne gêne pas.

## Valider les paramètres

Avant d'appeler Spring, avec `getQuery(event)` ou `getRouterParam(event, …)` :

- présence et type (`sid` obligatoire, `page` entier ≥ 0) ;
- valeurs permises (`side` ∈ `A`, `B`, `C` ; `period` ∈ `7d`, `30d`, `all`) ;
- le **SID contient des `/`** : il reste en paramètre de requête, et on le réencode en le passant à Spring (`new URLSearchParams({ sid, side })`).

Un paramètre invalide donne **400** avec un message en français, sans appeler Spring.

## Traduire les erreurs

| Spring | Nitro renvoie | Pourquoi |
|---|---|---|
| 401 | **401** | La page ou le navigateur redirige vers le login |
| 403 | 403 | |
| 404 | **404** | Ressource absente (face jamais jouée) |
| 400 | 400, message générique | Le paramètre aurait dû être refusé avant |
| 5xx | **502** `Erreur de l'API` | L'erreur vient de Spring, pas de Nitro |
| injoignable | **503** `API indisponible` | |

Jamais de trace, de message interne ni d'adresse de Spring dans la réponse. Journalise côté serveur (`console.error`) avec la route et le statut, sans cookie.

## Combiner des réponses

Les appels indépendants partent ensemble, et la route renvoie **la forme dont la page a besoin**, pas les réponses brutes :

```ts
const [summary, faces] = await Promise.all([
  callSpring<Summary>(event, '/api/summary?tz=Europe/Paris'),
  callSpring<Face[]>(event, '/api/faces'),
]);
return { resume: summary.resume, faces: faces.slice(0, 5) };
```

Types de réponse : à reprendre de `web/src/app/core/*.model.ts` du dépôt d'origine, dans un fichier de modèles partagé.

## Page SSR et connexion côté serveur

Façon de faire retenue (#19, #20), vérifiée dans `node_modules` puis au `curl` :

- **Angular ne voit pas les cookies pendant le SSR.** Il reçoit la requête Node (`injectRequest()`, jeton `REQUEST`), pas l'événement h3 ni `event.context`. `HttpClient` pendant le SSR passe par `requestContextInterceptor`, qui appelle `$fetch` **sans le cookie** ; le `load` d'un `.server.ts` est servi en sous-requête, **sans cookie** non plus, et un `sendRedirect` dans un `load` ne redirige que cette sous-requête. Les `load` des pages connectées (étape 4) auront donc besoin d'un moyen de recopier le cookie : à décider avant #24/#25.
- **La session est lue par le middleware `src/server/middleware/session.ts`** (logique dans `src/server/utils/session.ts`) : pour une page (GET/HEAD, hors `/api`, `/_analog`, `/health`, fichiers), s'il y a un `JSESSIONID`, un appel à Spring `/api/auth/me` (délai 3 s). L'état (`EtatSession`, `src/app/auth/session-contrat.ts`) est posé sur `req[CLE_SESSION]`, lu par le service Angular `Session` et transmis au navigateur par TransferState.
- **Une page connectée = deux choses à faire ensemble** : ajouter son préfixe à `PAGES_CONNECTEES` (`session-contrat.ts`) **et** `canActivate: [connexionRequise]` dans son `routeMeta`. Le middleware fait le 302 vers `/login?redirect=…` (anonyme) ou le 503 (Spring indisponible) avant tout HTML ; la garde couvre la navigation dans le navigateur et sert de filet côté serveur. Avec la garde seule, Angular rendrait la page de connexion sous l'adresse demandée avec un 200.
- Toute page rendue pour un joueur connecté reçoit `cache-control: private, no-store` et `Vary: Cookie` : elle porte son compte.
- **Pièges du mode dev** (Analog charge `src/server/middleware/**/*.ts` par Vite, hors de Nitro) : pas d'import de `nitropack/runtime` (l'adresse de Spring vient de `NITRO_API_URL`) ; `req.url` vaut `/index.html`, la vraie adresse est dans `req.originalUrl` (`cheminDemande`) ; un middleware qui a répondu doit renvoyer une valeur (`true`), sinon Analog enchaîne sur le rendu ; aucun `.spec.ts` dans `middleware/`.
- Une page connectée n'est **jamais** dans `prerender.routes`.
- Les appels `HttpClient` faits dans le navigateur vers `/api/…` passent par le relais : même origine, le cookie suit seul.

## Hors périmètre pour l'instant

Cache serveur des données publiques (piste C) et relais du flux SSE `/api/live/stream` (piste D) : décisions à prendre avec l'utilisateur avant de les écrire.
