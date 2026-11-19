// @vitest-environment node
import { createApp, createRouter, toWebHandler } from 'h3';
import { vi } from 'vitest';

import type { FaceDetail } from '../../../app/modeles/face';
import face from './face.get';

vi.stubEnv('NITRO_API_URL', 'http://spring.test:5000');

const fetchMock = vi.fn();

const call = (url: string, init?: RequestInit) => {
  const app = createApp().use(createRouter().get('/api/face', face));
  return toWebHandler(app)(new Request(`http://localhost${url}`, init));
};

const connecte = (cookie = 'JSESSIONID=secret') => ({ headers: { cookie } });

const DETAIL: FaceDetail = {
  sid: 'Celeste/1-ForsakenCity',
  side: 'A',
  mapName: 'Forsaken City',
  attempts: 10,
  clears: 2,
  clearRate: 0.2,
  bestClearMs: 90000,
  longestMs: 80000,
  longestEndRoom: 'b-05',
  rooms: [{ room: 'a-01', entries: 9, endings: 3, deaths: 5 }],
  evolution: [{ attemptId: 1, startedAt: 1000, durationMs: 5000, result: 'death' }],
  recent: [{ id: 1, startedAt: 1000, result: 'death', durationMs: 5000, endRoom: 'a-01', roomsCleared: 1, deaths: 3 }],
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const URL_VALIDE = '/api/face?sid=Celeste%2F1-ForsakenCity&side=A';

describe('GET /api/face', () => {
  it('renvoie le détail de la face, jamais mis en cache', async () => {
    fetchMock.mockResolvedValue(Response.json(DETAIL));

    const res = await call(URL_VALIDE, connecte());

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('vary')).toBe('Cookie');
    const corps = await res.json();
    expect(corps).toMatchObject({
      fuseau: 'Europe/Paris',
      sid: 'Celeste/1-ForsakenCity',
      side: 'A',
      nom: 'Forsaken City',
      mod: 'Celeste',
      tentatives: 10,
      rooms: [{ room: 'a-01', arrets: 3, morts: 5 }],
      evolution: [{ id: 1, debut: 1000, dureeMs: 5000, issue: 'chute' }],
    });
    expect(corps.aujourdhui).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const [adresse, init] = fetchMock.mock.calls[0];
    expect(adresse).toBe('http://spring.test:5000/api/faces/detail?sid=Celeste%2F1-ForsakenCity&side=A');
    expect(init.headers.get('cookie')).toBe('JSESSIONID=secret');
  });

  it('utilise le fuseau du cookie tz', async () => {
    fetchMock.mockResolvedValue(Response.json(DETAIL));
    const res = await call(URL_VALIDE, connecte('JSESSIONID=s; tz=Asia/Tokyo'));
    expect((await res.json()).fuseau).toBe('Asia/Tokyo');
  });

  it('ignore un fuseau invalide et un ?tz=', async () => {
    fetchMock.mockResolvedValue(Response.json(DETAIL));
    const res = await call(`${URL_VALIDE}&tz=Asia/Tokyo`, connecte('JSESSIONID=s; tz=nimporte'));
    expect((await res.json()).fuseau).toBe('Europe/Paris');
  });

  it.each([
    ['sid absent', '/api/face?side=A', 'Le paramètre sid est obligatoire.'],
    ['sid vide', '/api/face?sid=&side=A', 'Le paramètre sid est obligatoire.'],
    ['sid répété', '/api/face?sid=a&sid=b&side=A', 'Le paramètre sid doit être un identifiant de map de 1 à 255 caractères.'],
    ['sid trop long', `/api/face?sid=${'a'.repeat(256)}&side=A`, 'Le paramètre sid doit être un identifiant de map de 1 à 255 caractères.'],
    ['sid avec NUL', '/api/face?sid=a%00b&side=A', 'Le paramètre sid doit être un identifiant de map de 1 à 255 caractères.'],
    ['sid avec espace en bord', '/api/face?sid=%20a&side=A', 'Le paramètre sid doit être un identifiant de map de 1 à 255 caractères.'],
    ['side absent', '/api/face?sid=Celeste', 'Le paramètre side doit valoir A, B ou C.'],
    ['side D', '/api/face?sid=Celeste&side=D', 'Le paramètre side doit valoir A, B ou C.'],
    ['side minuscule', '/api/face?sid=Celeste&side=b', 'Le paramètre side doit valoir A, B ou C.'],
  ])('refuse en 400 sans appeler Spring : %s', async (_nom, url, message) => {
    const res = await call(url, connecte());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuse en 400 avant de regarder la session', async () => {
    const res = await call('/api/face?side=D');
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renvoie 401 sans cookie de session, sans appeler Spring', async () => {
    const res = await call(URL_VALIDE);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: 'Connexion requise' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['des /', 'Celeste/1-ForsakenCity', 'Celeste%2F1-ForsakenCity'],
    ['une espace', 'Mon Mod/Ma Map', 'Mon+Mod%2FMa+Map'],
    ['un +', 'a+b', 'a%2Bb'],
    ['un &', 'a&b', 'a%26b'],
    ['des accents', 'Été/Café', '%C3%89t%C3%A9%2FCaf%C3%A9'],
  ])('transmet à Spring un sid avec %s, encodé', async (_nom, sid, attendu) => {
    fetchMock.mockResolvedValue(Response.json({ ...DETAIL, sid }));

    const res = await call(`/api/face?sid=${encodeURIComponent(sid)}&side=B`, connecte());

    expect(res.status).toBe(200);
    expect((await res.json()).sid).toBe(sid);
    expect(fetchMock.mock.calls[0][0]).toBe(`http://spring.test:5000/api/faces/detail?sid=${attendu}&side=B`);
  });

  it('traduit le 404 de Spring', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    const res = await call(URL_VALIDE, connecte());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ message: 'Aucune tentative sur cette face' });
  });

  it('renvoie 401 quand Spring refuse la session', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    const res = await call(URL_VALIDE, connecte());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: 'Connexion requise' });
  });

  it('renvoie 502 quand Spring répond 5xx', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    const res = await call(URL_VALIDE, connecte());
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ message: "Erreur de l'API" });
  });

  it('renvoie 503 quand Spring est injoignable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const res = await call(URL_VALIDE, connecte());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ message: 'API indisponible' });
  });

  it('ne laisse passer aucun champ inconnu de Spring', async () => {
    fetchMock.mockResolvedValue(Response.json({ ...DETAIL, secretInterne: 'x' }));
    const res = await call(URL_VALIDE, connecte());
    expect(JSON.stringify(await res.json())).not.toContain('secretInterne');
  });
});
