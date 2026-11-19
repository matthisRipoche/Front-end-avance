// @vitest-environment node
import { createApp, createRouter, toWebHandler } from 'h3';
import { vi } from 'vitest';

import fournisseurs from './fournisseurs.get';

// Hors Nitro, nitropack/runtime ne se charge pas : le cache est simulé par une fonction transparente
// (son comportement réel se vérifie sur le serveur construit, scripts/tester-serveur.mjs). Le reste de
// la chaîne (utils/fournisseurs.ts, callSpring) est réel, seul le `fetch` vers Spring est simulé.
vi.mock('nitropack/runtime', () => ({ defineCachedFunction: (f: unknown) => f }));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('NITRO_API_URL', 'http://spring.test:5000');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const call = (init?: RequestInit) => {
  const app = createApp().use(createRouter().get('/api/connexion/fournisseurs', fournisseurs));
  return toWebHandler(app)(new Request('http://localhost/api/connexion/fournisseurs', init));
};

describe('GET /api/connexion/fournisseurs', () => {
  it('renvoie les fournisseurs en liste blanche, publics pour 60 s, avec l’état du cache', async () => {
    fetchMock.mockResolvedValue(Response.json({ discord: true, extra: 'x' }));

    const res = await call();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ discord: true });
    expect(res.headers.get('cache-control')).toBe('public, max-age=60');
    expect(res.headers.get('x-cache')).toBe('MISS');
  });

  it('traduit Spring injoignable en 503, sans cache', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const res = await call();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ message: 'API indisponible' });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-cache')).toBeNull();
  });

  it('traduit une erreur 5xx de Spring en 502, sans cache', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    const res = await call();

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ message: "Erreur de l'API" });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('répond pareil à une requête portant des cookies, sans en transmettre ni en poser', async () => {
    fetchMock.mockResolvedValue(Response.json({ discord: false }));

    const res = await call({ headers: { cookie: 'JSESSIONID=x; XSRF-TOKEN=y' } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ discord: false });
    expect(res.headers.get('cache-control')).toBe('public, max-age=60');
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(res.headers.get('vary')).toBeNull();
    expect(fetchMock.mock.calls[0][1].headers.get('cookie')).toBeNull();
  });
});
