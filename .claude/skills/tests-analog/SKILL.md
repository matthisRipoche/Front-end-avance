---
name: tests-analog
description: Comment tester chaque type de fichier du projet Celeste Tracker avec Vitest - page ou composant Angular (TestBed), statut HTTP posé en SSR, route serveur Nitro h3 (toWebHandler, cookies, erreurs), utilitaire serveur avec configuration, appel à Spring simulé. À charger pour écrire, compléter ou juger des tests.
---

# Tests du projet

Vitest 5, environnement `jsdom`, `globals: true` (`describe`, `it`, `expect` sans import), configuration dans `vite.config.ts`, mise en place dans `src/test-setup.ts`. Lancer : `npx vitest run` (tout) ou `npx vitest run <chemin>`.

## Règles

- Le test est **à côté** du fichier : `foo.ts` → `foo.spec.ts`. Les specs de `src/server/routes/` sont exclues des routes par `nitro.ignore` (`vite.config.ts`).
- **Exception : `src/server/middleware/`**. En `npm run dev`, Analog charge comme middleware **tout** `.ts` de ce dossier, sans tenir compte de `nitro.ignore` (`register-dev-middleware.js`) : un spec y serait exécuté à chaque requête. Le test d'un middleware va dans `src/server/utils/<nom>.spec.ts` et importe `../middleware/<nom>`.
- `describe` et `it` **en français**, qui décrivent un comportement visible : `'renvoie 401 sans session'`, pas `'test getFaces'`.
- Un test vérifie **ce que voit l'utilisateur ou l'appelant** : texte, lien, statut HTTP, corps JSON. Pas les détails internes (champs privés, appels de méthode).
- Chaque comportement nouveau a un test ; chaque route serveur a au moins **un cas nominal et un cas d'erreur**.
- Un test doit pouvoir échouer : si tu casses le code, il casse. Pas de `toBeTruthy()` sur un objet toujours présent.
- Pas d'appel réseau réel : Spring est toujours simulé.

## Page ou composant Angular

Modèle : `src/app/pages/(public)/index.page.spec.ts`.

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import Home from './index.page';

describe('Page d’accueil', () => {
  const render = () => {
    TestBed.configureTestingModule({ imports: [Home], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('annonce la promesse du site', () => {
    expect(render().querySelector('h1')?.textContent).toContain('Ton deathless');
  });
});
```

- `provideRouter([])` dès que le composant utilise `RouterLink`.
- Composant à entrées (`input()`) : `fixture.componentRef.setInput('kind', 'deathless')` puis `fixture.detectChanges()`.
- Cherche par rôle ou par sens (`h1`, `[role="status"]`, `a[href="/"]`) plutôt que par classe de mise en forme, sauf pour une règle de design vérifiée exprès (le seul élément doré : `.cdt-result--deathless`).

### Statut HTTP posé pendant le SSR

Modèle : `src/app/pages/(public)/[...not-found].page.spec.ts`. On fournit une fausse réponse par le jeton `RESPONSE`, et on teste aussi l'absence de réponse (le navigateur) :

```ts
import { RESPONSE } from '@analogjs/router/tokens';
// providers: [provideRouter([]), { provide: RESPONSE, useValue: response }]
const response = { statusCode: 200 };
render(response);
expect(response.statusCode).toBe(404);
```

### Page avec données de `load`

Fournis le résultat attendu en simulant `injectLoad` plutôt que d'exécuter le `load` :

```ts
import { of } from 'rxjs';
vi.mock('@analogjs/router', async (original) => ({
  ...(await original<typeof import('@analogjs/router')>()),
  injectLoad: () => of({ faces: [] }),
}));
```

Le `load` lui-même (`.server.ts`) se teste comme un utilitaire serveur : on l'appelle avec un faux `{ event, params }`.

## Route serveur Nitro (h3)

Route **sans** lecture de la requête (modèle : `src/server/routes/health.spec.ts`) : appelle le gestionnaire directement avec `{} as H3Event`.

Route qui lit la requête (paramètres, cookies, corps) : monte-la dans une petite application h3 et envoie une vraie `Request` :

```ts
import { createApp, createRouter, toWebHandler } from 'h3';

import faces from './faces.get';

const call = (url: string, init?: RequestInit) => {
  const app = createApp().use(createRouter().get('/api/faces', faces));
  return toWebHandler(app)(new Request(`http://localhost${url}`, init));
};

it('refuse une face sans sid', async () => {
  const res = await call('/api/faces/detail?side=A');
  expect(res.status).toBe(400);
});

it('transmet le cookie de session à Spring', async () => {
  await call('/api/faces', { headers: { cookie: 'JSESSIONID=abc' } });
  expect(fetchMock.mock.calls[0][1].headers.cookie).toContain('JSESSIONID=abc');
});
```

`toWebHandler` renvoie une `Response` standard : `res.status`, `await res.json()`, `res.headers.get('set-cookie')`.

## Simuler Spring

La couche serveur appelle Spring avec le `fetch` natif (skill `bff-spring`). On le remplace dans le test :

```ts
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

fetchMock.mockResolvedValue(Response.json({ id: 1 }, { status: 200 }));
fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
fetchMock.mockRejectedValue(new TypeError('fetch failed')); // Spring injoignable
```

À couvrir pour chaque route qui appelle Spring : la réponse nominale, **401** (session absente ou expirée), **404** si la ressource peut manquer, **5xx** et Spring injoignable (→ 502 ou 503 traduit, sans détail interne).

## Configuration du serveur

`useRuntimeConfig()` n'existe pas hors de Nitro : on simule le module (modèle : `src/server/utils/spring.spec.ts`) :

```ts
const config = { apiUrl: 'http://localhost:5000' };
vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: () => config }));
```

## Ce que Vitest ne couvre pas

Le prérendu, le vrai rendu SSR de bout en bout et les redirections réelles se vérifient sur le **serveur construit** (agent `verifier` : `npm run build`, puis `curl`). Dans le compte rendu, dis lesquels de ces points restent à vérifier.

### Piège : build SSR non compilé (Analog 2.9.1)

Le plugin Angular partage une compilation entre les builds client et SSR, lancés en parallèle. Si le client finit le premier, le SSR embarque des composants non compilés : le prérendu affiche `Component '…' is not resolved`, les pages sortent vides, et `vite build` réussit quand même. Ça arrive sous charge (CI, tests lancés en même temps). Cause prouvée le 2026-11-16 (SSR ralenti exprès : échec à chaque fois) ; le nom des fichiers n'y est pour rien.

- `npm run build` lance ensuite `scripts/verifier-prerendu.mjs` (postbuild), qui **échoue** si une page prérendue n'a pas de `<h1>`. Un build n'est réussi que si ce contrôle affiche `✓ Prérendu`.
- S'il échoue, relance le build **seul**, sans tests ni autre build en parallèle, avant de soupçonner le code. Si l'échec persiste, c'est le code.
