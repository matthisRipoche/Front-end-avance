// @vitest-environment node
import { createApp, createRouter, toWebHandler } from 'h3';
import { vi } from 'vitest';

import type { FaceSummary } from '../../../app/modeles/face';
import maps from './maps.get';

vi.stubEnv('NITRO_API_URL', 'http://spring.test:5000');

const fetchMock = vi.fn();

const call = (url: string, init?: RequestInit) => {
  const app = createApp().use(createRouter().get('/api/maps', maps));
  return toWebHandler(app)(new Request(`http://localhost${url}`, init));
};

const connecte = (cookie = 'JSESSIONID=secret') => ({ headers: { cookie } });

const FACES: FaceSummary[] = [
  { sid: 'Celeste/1-ForsakenCity', side: 'A', mapName: 'Forsaken City', attempts: 12, clears: 2, lastPlayedAt: 100 },
  { sid: 'StrawberryJam2021/1-Beginner/maya', side: 'B', mapName: null, attempts: 4, clears: 0, lastPlayedAt: 200 },
];

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GET /api/maps', () => {
  it('renvoie les faces jouées et les mods, jamais mis en cache', async () => {
    fetchMock.mockResolvedValue(Response.json(FACES));

    const res = await call('/api/maps', connecte());

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('vary')).toBe('Cookie');
    expect(await res.json()).toEqual({
      fuseau: 'Europe/Paris',
      faces: [
        {
          sid: 'StrawberryJam2021/1-Beginner/maya',
          side: 'B',
          nom: 'maya',
          mod: 'StrawberryJam2021',
          tentatives: 4,
          deathless: 0,
          dernierePartie: 200,
        },
        {
          sid: 'Celeste/1-ForsakenCity',
          side: 'A',
          nom: 'Forsaken City',
          mod: 'Celeste',
          tentatives: 12,
          deathless: 2,
          dernierePartie: 100,
        },
      ],
      mods: [
        { nom: 'Celeste', faces: 1 },
        { nom: 'StrawberryJam2021', faces: 1 },
      ],
    });
  });

  it('appelle /api/faces une fois, avec le cookie de la requête', async () => {
    fetchMock.mockResolvedValue(Response.json(FACES));

    await call('/api/maps', connecte('JSESSIONID=secret; tz=UTC'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://spring.test:5000/api/faces');
    expect(new Headers(init.headers).get('cookie')).toContain('JSESSIONID=secret');
  });

  it.each([
    ['tz=america%2Fnew_york', 'America/New_York'],
    ['tz=Pas/Un_Fuseau', 'Europe/Paris'],
    ['tz=%2B01%3A00', 'Europe/Paris'],
  ])('retient le fuseau du cookie %s : %s', async (tz, attendu) => {
    fetchMock.mockResolvedValue(Response.json([]));

    const res = await call('/api/maps', connecte(`JSESSIONID=secret; ${tz}`));

    expect(res.status).toBe(200);
    expect((await res.json()).fuseau).toBe(attendu);
  });

  it('ignore un paramètre ?tz= : le fuseau vient du cookie seulement', async () => {
    fetchMock.mockResolvedValue(Response.json([]));

    const res = await call('/api/maps?tz=Pas/Un_Fuseau', connecte('JSESSIONID=secret; tz=UTC'));

    expect(res.status).toBe(200);
    expect((await res.json()).fuseau).toBe('UTC');
  });

  it('renvoie 401 sans cookie de session, sans appeler Spring', async () => {
    const res = await call('/api/maps', { headers: { cookie: 'tz=UTC' } });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: 'Connexion requise' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renvoie 401 quand Spring ne reconnaît pas la session', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    const res = await call('/api/maps', connecte());

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: 'Connexion requise' });
  });

  it('traduit une erreur 500 de Spring en 502, en un seul appel et sans détail interne', async () => {
    fetchMock.mockResolvedValue(new Response('java.lang.NullPointerException at spring.test', { status: 500 }));

    const res = await call('/api/maps', connecte());

    expect(res.status).toBe(502);
    const texte = await res.text();
    expect(JSON.parse(texte)).toEqual({ message: "Erreur de l'API" });
    expect(texte).not.toContain('spring.test');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.headers.get('cache-control')).not.toBe('private, no-store');
  });

  it('renvoie 503 quand Spring est injoignable, sans cookie au journal', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const res = await call('/api/maps', connecte());

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ message: 'API indisponible' });
    expect(String(vi.mocked(console.error).mock.calls)).not.toContain('secret');
  });
});
