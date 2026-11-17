// @vitest-environment node
import { createApp, createRouter, toWebHandler } from 'h3';
import { vi } from 'vitest';

import type { LiveSnapshot } from '../../../app/modeles/live';
import type { Summary } from '../../../app/modeles/summary';
import tableauDeBord from './tableau-de-bord.get';

vi.stubEnv('NITRO_API_URL', 'http://spring.test:5000');

const fetchMock = vi.fn();

const call = (url: string, init?: RequestInit) => {
  const app = createApp().use(createRouter().get('/api/tableau-de-bord', tableauDeBord));
  return toWebHandler(app)(new Request(`http://localhost${url}`, init));
};

const CONNECTE = { headers: { cookie: 'JSESSIONID=secret' } };

const SUMMARY: Summary = {
  resume: {
    sid: 'Celeste/1-ForsakenCity',
    side: 'A',
    mapName: 'Forsaken City',
    lastPlayedAt: 1_700_000_000_000,
    attempts: 12,
    clears: 2,
    bestRooms: 6,
    knownRooms: 12,
  },
  today: { attempts: 5, clears: 1, bestAttemptMs: 83_000, mostPlayed: null },
  recent: [],
  activity: [{ day: '2026-11-17', attempts: 5, clears: 1 }],
};

const LIVE: LiveSnapshot = {
  active: true,
  session: null,
  current: {
    id: 42,
    sid: 'Celeste/1-ForsakenCity',
    side: 'A',
    mapName: 'Forsaken City',
    room: 'a-03',
    startedAt: 1_700_000_100_000,
    lastEventAt: 1_700_000_200_000,
    deaths: 3,
    roomsVisited: 4,
  },
  serverTime: 1_700_000_300_000,
};

/** Spring simulé : une réponse par chemin, `/api/summary` et `/api/live`. */
const spring = (reponses: { summary: () => Promise<Response>; live: () => Promise<Response> }) => {
  fetchMock.mockImplementation((url: string) =>
    new URL(url).pathname === '/api/live' ? reponses.live() : reponses.summary(),
  );
};
const ok = (corps: unknown) => () => Promise.resolve(Response.json(corps));

/** Adresses appelées chez Spring. */
const adressesAppelees = () => fetchMock.mock.calls.map(([url]) => url as string);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GET /api/tableau-de-bord', () => {
  it('renvoie le tableau de bord, jamais mis en cache', async () => {
    spring({ summary: ok(SUMMARY), live: ok(LIVE) });

    const res = await call('/api/tableau-de-bord', CONNECTE);

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('vary')).toBe('Cookie');
    const corps = await res.json();
    expect(corps).toMatchObject({
      fuseau: 'Europe/Paris',
      reprendre: { nom: 'Forsaken City', progression: 0.5 },
      aujourdhui: { tentatives: 5, deathless: 1, plusLongueMs: 83_000, plusTravaillee: null },
      recentes: [],
      activite: { jours: [{ jour: '2026-11-17', tentatives: 5, deathless: 1 }], max: 5 },
      enJeu: { sid: 'Celeste/1-ForsakenCity', side: 'A', nom: 'Forsaken City', room: 'a-03', debut: 1_700_000_100_000 },
      vide: false,
    });
  });

  it('appelle Spring avec le cookie de la requête et le fuseau encodé', async () => {
    spring({ summary: ok(SUMMARY), live: ok(LIVE) });

    await call('/api/tableau-de-bord?tz=america%2Fnew_york', CONNECTE);

    expect(adressesAppelees().sort()).toEqual([
      'http://spring.test:5000/api/live',
      'http://spring.test:5000/api/summary?tz=America%2FNew_York',
    ]);
    for (const [, init] of fetchMock.mock.calls as [string, RequestInit][]) {
      expect(new Headers(init.headers).get('cookie')).toBe('JSESSIONID=secret');
    }
  });

  it('refuse un fuseau invalide en 400, sans appeler Spring', async () => {
    const res = await call('/api/tableau-de-bord?tz=Pas/Un_Fuseau', CONNECTE);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      message: 'Le fuseau horaire doit être un nom IANA, par exemple Europe/Paris.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renvoie 401 sans cookie de session, sans appeler Spring', async () => {
    const res = await call('/api/tableau-de-bord', { headers: { cookie: 'tz=UTC' } });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: 'Connexion requise' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renvoie 401 quand Spring ne reconnaît pas la session', async () => {
    spring({
      summary: () => Promise.resolve(new Response(null, { status: 401 })),
      live: () => Promise.resolve(new Response(null, { status: 401 })),
    });

    const res = await call('/api/tableau-de-bord', CONNECTE);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: 'Connexion requise' });
  });

  it('traduit une erreur 500 de Spring en 502, sans détail interne', async () => {
    spring({
      summary: () => Promise.resolve(new Response('java.lang.NullPointerException at spring.test', { status: 500 })),
      live: ok(LIVE),
    });

    const res = await call('/api/tableau-de-bord', CONNECTE);

    expect(res.status).toBe(502);
    const texte = await res.text();
    expect(JSON.parse(texte)).toEqual({ message: "Erreur de l'API" });
    expect(texte).not.toContain('spring.test');
    expect(res.headers.get('cache-control')).not.toBe('private, no-store');
  });

  it('renvoie 503 quand Spring est injoignable, sans cookie au journal', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const res = await call('/api/tableau-de-bord', CONNECTE);

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ message: 'API indisponible' });
    expect(String(vi.mocked(console.error).mock.calls)).not.toContain('secret');
  });

  it('répond sans partie en cours quand le direct échoue', async () => {
    spring({ summary: ok(SUMMARY), live: () => Promise.reject(new TypeError('fetch failed')) });

    const res = await call('/api/tableau-de-bord', CONNECTE);

    expect(res.status).toBe(200);
    const corps = await res.json();
    expect(corps.enJeu).toBeNull();
    expect(corps.reprendre.nom).toBe('Forsaken City');
    expect(String(vi.mocked(console.error).mock.calls)).not.toContain('secret');
  });

  it('n’attend pas plus de 2 s un direct qui ne répond pas', async () => {
    // Le direct ne répond jamais : seule l'annulation par le délai le termine.
    fetchMock.mockImplementation((url: string, init: RequestInit) =>
      new URL(url).pathname === '/api/live'
        ? new Promise((_, rejeter) => init.signal?.addEventListener('abort', () => rejeter(init.signal?.reason)))
        : Promise.resolve(Response.json(SUMMARY)),
    );

    const debut = Date.now();
    const res = await call('/api/tableau-de-bord', CONNECTE);
    const duree = Date.now() - debut;

    expect(res.status).toBe(200);
    expect((await res.json()).enJeu).toBeNull();
    expect(duree).toBeGreaterThanOrEqual(1900);
    expect(duree).toBeLessThan(4000); // bien en dessous des 5 s du résumé
  }, 10_000);
});
