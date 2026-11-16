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

> **État** : seuls `/health` et `springUrl()` existent. Le relais `/api` (#15) et la connexion côté serveur sont à construire : les recettes ci-dessous fixent la façon de faire. Ce qui n'a pas encore été éprouvé dans le projet est marqué **à vérifier** : vérifie-le au premier usage, puis mets ce skill à jour.

## Choisir le bon outil

| Besoin | Outil | Fichier |
|---|---|---|
| Passer un appel tel quel à Spring | relais générique (`proxyRequest`) | `src/server/routes/api/[...path].ts` |
| Transformer, valider, combiner pour une page | route dédiée | `src/server/routes/api/<nom>.<méthode>.ts` (une route précise passe avant le relais générique) |
| Données d'une page rendue en SSR | `load` dans un `.server.ts` voisin de la page | `pages/…/<page>.server.ts`, lu par `injectLoad` |
| Code partagé par les routes et les `load` | utilitaire | `src/server/utils/` |
| Transversal (journaux, limitation de débit) | middleware Nitro | `src/server/middleware/` |

Une route dédiée n'existe que si elle apporte quelque chose (validation, combinaison, forme adaptée à la page, traduction d'erreurs). Sinon, le relais suffit.

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
- Quand Spring pose ou efface un cookie (login, logout), le `Set-Cookie` doit revenir au navigateur. `proxyRequest` le fait. Dans une route dédiée qui fait un login : recopier chaque `Set-Cookie` de la réponse (`res.headers.getSetCookie()`) avec `appendResponseHeader(event, 'set-cookie', …)`. **À vérifier** : attributs `Path` et `Domain` posés par Spring, qui doivent rester valables sur le domaine du front.

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

- Le `load` d'une page connectée reçoit `{ event, params }` (`PageServerLoad` de `@analogjs/router`). Il appelle **directement** `callSpring(event, …)`, sans repasser par HTTP vers sa propre route `/api` : le cookie est déjà sur l'`event`.
- Sans session (401 de Spring) : redirection **côté serveur** vers le login, avant d'envoyer le moindre HTML (`sendRedirect(event, '/connexion?retour=…', 302)`). **À vérifier** : comportement exact d'une redirection posée dans un `load` d'Analog 2.9, ou s'il faut passer par une garde dans `routeMeta`.
- Une page connectée n'est **jamais** dans `prerender.routes`.
- Les appels `HttpClient` faits dans le navigateur vers `/api/…` passent par le relais : même origine, le cookie suit seul.

## Hors périmètre pour l'instant

Cache serveur des données publiques (piste C) et relais du flux SSE `/api/live/stream` (piste D) : décisions à prendre avec l'utilisateur avant de les écrire.
