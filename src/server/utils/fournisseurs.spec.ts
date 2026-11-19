// @vitest-environment node
import { createApp, createRouter, defineEventHandler, toWebHandler, type H3Event } from 'h3';
import { vi } from 'vitest';

import { chargerFournisseursSansCache, versFournisseurs } from './fournisseurs';

// Hors Nitro, nitropack/runtime ne se charge pas : le cache est simulé par une fonction transparente.
// Son comportement réel se vérifie sur le serveur construit.
vi.mock('nitropack/runtime', () => ({ defineCachedFunction: (f: unknown) => f }));

describe('versFournisseurs', () => {
  it('active Discord quand Spring répond discord: true', () => {
    expect(versFournisseurs({ discord: true })).toEqual({ discord: true });
  });

  it.each([
    ['la chaîne "true"', { discord: 'true' }],
    ['false', { discord: false }],
    ['1', { discord: 1 }],
    ['un champ absent', {}],
    ['null', null],
    ['undefined', undefined],
    ['une chaîne', 'discord'],
  ])('renvoie discord: false pour %s', (_nom, brut) => {
    expect(versFournisseurs(brut)).toEqual({ discord: false });
  });

  it('ne laisse passer aucun champ en trop', () => {
    expect(versFournisseurs({ discord: true, github: true, secret: 'x' })).toEqual({ discord: true });
  });
});

describe('chargerFournisseursSansCache', () => {
  const fetchMock = vi.fn();

  const appeler = (headers?: Record<string, string>) => {
    let resultat: Promise<unknown> = Promise.resolve();
    const route = defineEventHandler((event: H3Event) => {
      resultat = chargerFournisseursSansCache(event);
      return resultat.then(
        (v) => v,
        () => 'erreur',
      );
    });
    const app = createApp().use(createRouter().get('/essai', route));
    return toWebHandler(app)(new Request('http://localhost/essai', { headers })).then(() => resultat);
  };

  beforeEach(() => {
    vi.stubEnv('NITRO_API_URL', 'http://spring.test:5000');
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lit les fournisseurs de Spring sans transmettre le cookie du joueur', async () => {
    fetchMock.mockResolvedValue(Response.json({ discord: true, autre: 1 }));

    const resultat = await appeler({ cookie: 'JSESSIONID=abc', 'x-xsrf-token': 't' });

    expect(resultat).toEqual({ discord: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(url).toBe('http://spring.test:5000/api/auth/providers');
    expect(headers.has('cookie')).toBe(false);
    expect(headers.has('x-xsrf-token')).toBe(false);
  });

  it('relance une erreur 5xx de Spring en 502, sans repli', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(appeler()).rejects.toMatchObject({ statusCode: 502 });
  });

  it('relance 503 quand Spring est injoignable, sans repli', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(appeler()).rejects.toMatchObject({ statusCode: 503 });
  });

  it('relance 502 quand le JSON est illisible, sans repli', async () => {
    fetchMock.mockResolvedValue(new Response('<html>pas du JSON', { status: 200 }));

    await expect(appeler()).rejects.toMatchObject({ statusCode: 502 });
  });
});
