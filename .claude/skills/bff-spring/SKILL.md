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

> **État** : `/health`, `springUrl()` et le relais générique `/api/**` (#15), le journal des requêtes (plugin) et la limitation de débit du login (`src/server/middleware/limite-connexion.ts`, limiteur `src/server/utils/limite-debit.ts`, adresse IP `adresseClient`) et la session vérifiée côté serveur (#19, #20) existent. `callSpring`, `springError` et `repondreErreur` sont dans `src/server/utils/spring.ts`. Première route dédiée : `src/server/routes/api/tableau-de-bord.get.ts` (#24), logique dans `src/server/utils/tableau-de-bord.ts`. Modèles partagés entre Nitro et Angular : `src/app/modeles/`. Les recettes ci-dessous fixent la façon de faire. Ce qui n'a pas encore été éprouvé dans le projet est marqué **à vérifier** : vérifie-le au premier usage, puis mets ce skill à jour.

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
- Passe par **un seul utilitaire**, `callSpring` (`src/server/utils/spring.ts`), qui reçoit l'`event` h3 : le relais des cookies et la traduction des erreurs sont écrits une fois. Délai de 5 s ; Spring injoignable ou trop lent → 503, JSON illisible → 502. Principe (le fichier fait foi) :

```ts
export interface OptionsSpring {
  method?: string;
  body?: unknown;                                                  // envoyé en JSON
  query?: Record<string, string | number | boolean | undefined>;   // encodée par URLSearchParams
  timeoutMs?: number;                                              // 5000 par défaut
}

/** Appelle Spring au nom de l'utilisateur de la requête en cours. */
export async function callSpring<T>(event: H3Event, path: string, init: OptionsSpring = {}): Promise<T>;
// - recopie `cookie` (JSESSIONID + XSRF-TOKEN) et `x-xsrf-token` de l'event, s'ils existent ;
// - injoignable ou délai dépassé → 503, réponse non OK → springError(status), JSON illisible → 502 ;
// - ne recopie jamais un Set-Cookie de Spring.

// Dans une route :
try {
  return await callSpring<Summary>(event, '/api/summary', { query: { tz: fuseau } });
} catch (e) {
  return repondreErreur(event, e);   // corps { message }
}
```

`springError(status)` applique le tableau « Traduire les erreurs » ci-dessous et renvoie un `createError`. `repondreErreur` écrit le corps d'erreur. Le texte français va dans `message` de `createError`, pas dans `statusMessage` : h3 en retire les accents (ligne de statut HTTP).

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

- **Corps d'erreur d'une route du front : `{ message }`**, en français, écrit par `repondreErreur` (`src/server/utils/spring.ts`). C'est la forme du relais : le navigateur lit les erreurs de la même façon, quelle que soit la route.
- Jamais de trace, de message interne ni d'adresse de Spring dans la réponse. Journalise côté serveur (`console.error`) avec la route et le statut, sans cookie ni query.

## Combiner des réponses

Les appels indépendants partent ensemble, et la route renvoie **la forme dont la page a besoin**, pas les réponses brutes :

```ts
const [summary, faces] = await Promise.all([
  callSpring<Summary>(event, '/api/summary', { query: { tz: 'Europe/Paris' } }),
  callSpring<Face[]>(event, '/api/faces'),
]);
return { resume: summary.resume, faces: faces.slice(0, 5) };
```

- Un appel accessoire ne fait pas tomber la route : `/api/tableau-de-bord` donne `enJeu: null` si `/api/live` échoue ou dépasse 2 s, mais échoue si `/api/summary` échoue.
- Garde la logique (validation, appels, mise en forme) dans un utilitaire de `src/server/utils/`, la route ne fait que l'appeler : un `load` pourra la réutiliser. Une fonction pure qui met en forme (`versTableauDeBord`) se teste sans simuler Spring.
- Types : ceux de Spring dans `src/app/modeles/` (copies de `web/src/app/core/*.model.ts` du dépôt d'origine, noms de Spring), et le contrat de la page en français à côté (`tableau-de-bord.ts`), en liste blanche de champs. Aucun import d'Angular ni de h3 dans ce dossier : Nitro et Angular l'importent tous deux.

## Page SSR et connexion côté serveur

Façon de faire retenue (#19, #20), vérifiée dans `node_modules` puis au `curl` :

- **Angular ne voit pas les cookies pendant le SSR.** Il reçoit la requête Node (`injectRequest()`, jeton `REQUEST`), pas l'événement h3 ni `event.context`. `HttpClient` pendant le SSR passe par `requestContextInterceptor`, qui appelle `$fetch` **sans le cookie** ; le `load` d'un `.server.ts` est servi en sous-requête, **sans cookie** non plus, et un `sendRedirect` dans un `load` ne redirige que cette sous-requête.
- **Données d'une page connectée pendant le SSR (décision D1, reportée à #25).** Piste recommandée : un intercepteur Angular côté serveur qui recopie l'en-tête `cookie` de `injectRequest()` sur les requêtes **relatives `/api/…` uniquement** (jamais vers une autre origine), placé avant `requestContextInterceptor`. La logique reste dans un utilitaire (`src/server/utils/tableau-de-bord.ts`) pour qu'un `load` de `.server.ts` puisse l'appeler directement si l'intercepteur ne convient pas. **À vérifier** : `requestContextInterceptor` rejette avec autre chose qu'une `HttpErrorResponse` ; la page devra gérer 401 et 503 pendant le SSR.
- **La session est lue par le middleware `src/server/middleware/session.ts`** (logique dans `src/server/utils/session.ts`) : pour une page (GET/HEAD, hors `/api`, `/_analog`, `/health`, fichiers), s'il y a un `JSESSIONID`, un appel à Spring `/api/auth/me` (délai 3 s). L'état (`EtatSession`, `src/app/auth/session-contrat.ts`) est posé sur `req[CLE_SESSION]`, lu par le service Angular `Session` et transmis au navigateur par TransferState.
- **Une page connectée = deux choses à faire ensemble** : ajouter son préfixe à `PAGES_CONNECTEES` (`session-contrat.ts`) **et** `canActivate: [connexionRequise]` dans son `routeMeta`. Le middleware fait le 302 vers `/login?redirect=…` (anonyme) ou le 503 (Spring indisponible) avant tout HTML ; la garde couvre la navigation dans le navigateur et sert de filet côté serveur. Avec la garde seule, Angular rendrait la page de connexion sous l'adresse demandée avec un 200.
- Toute page rendue pour un joueur connecté, et toute route du front qui renvoie ses données, reçoit `cache-control: private, no-store` et `Vary: Cookie` : elle porte son compte.
- **Une route ou une page privée ne se met jamais en cache**, ni côté serveur ni côté navigateur. Le cache serveur (#33) ne concernera que des données publiques.
- **Pièges du mode dev** (Analog charge `src/server/middleware/**/*.ts` par Vite, hors de Nitro) : pas d'import de `nitropack/runtime` (l'adresse de Spring vient de `NITRO_API_URL`) ; `req.url` vaut `/index.html`, la vraie adresse est dans `req.originalUrl` (`cheminDemande`) ; un middleware qui a répondu doit renvoyer une valeur (`true`), sinon Analog enchaîne sur le rendu ; aucun `.spec.ts` dans `middleware/`.
- Une page connectée n'est **jamais** dans `prerender.routes`.
- Les appels `HttpClient` faits dans le navigateur vers `/api/…` passent par le relais : même origine, le cookie suit seul.

## Hors périmètre pour l'instant

Cache serveur des données publiques (piste C) et relais du flux SSE `/api/live/stream` (piste D) : décisions à prendre avec l'utilisateur avant de les écrire.
