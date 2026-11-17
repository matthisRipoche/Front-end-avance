// @vitest-environment node
import { createApp, createRouter, defineEventHandler, toWebHandler, type H3Error, type H3Event } from 'h3';
import { vi } from 'vitest';

import { API_URL_PAR_DEFAUT, callSpring, repondreErreur, springError, springUrl, type OptionsSpring } from './spring';

afterEach(() => vi.unstubAllEnvs());

describe('springUrl', () => {
  it('vise l’API locale sans variable d’environnement', () => {
    vi.stubEnv('NITRO_API_URL', '');
    expect(springUrl('/api/auth/me')).toBe(`${API_URL_PAR_DEFAUT}/api/auth/me`);
  });

  it('suit NITRO_API_URL en production', () => {
    vi.stubEnv('NITRO_API_URL', 'https://celeste.example.com');
    expect(springUrl('/api/summary')).toBe('https://celeste.example.com/api/summary');
  });

  it('ne double ni n’oublie la barre oblique', () => {
    vi.stubEnv('NITRO_API_URL', 'https://celeste.example.com/');
    expect(springUrl('/api/faces')).toBe('https://celeste.example.com/api/faces');
    expect(springUrl('api/faces')).toBe('https://celeste.example.com/api/faces');
  });
});

describe('springError', () => {
  it.each([
    [401, 401, 'Connexion requise'],
    [403, 403, 'Accès refusé'],
    [404, 404, 'Introuvable'],
    [400, 400, 'Requête invalide'],
    [500, 502, "Erreur de l'API"],
    [503, 502, "Erreur de l'API"],
    [418, 502, "Erreur de l'API"],
  ])('traduit un %i de Spring en %i « %s »', (spring, attendu, message) => {
    const erreur = springError(spring);
    expect(erreur.statusCode).toBe(attendu);
    expect(erreur.message).toBe(message);
  });
});

describe('callSpring', () => {
  const fetchMock = vi.fn();
  const journal = () => (console.error as unknown as ReturnType<typeof vi.fn>).mock.calls.flat().join('\n');

  /** Route d'essai : appelle Spring, et répond comme le fera une route dédiée. */
  const call = (url: string, init?: RequestInit, path = '/api/summary', options?: OptionsSpring) => {
    const route = defineEventHandler(async (event: H3Event) => {
      try {
        return await callSpring(event, path, options);
      } catch (e) {
        return repondreErreur(event, e);
      }
    });
    const app = createApp().use(createRouter().get('/essai', route));
    return toWebHandler(app)(new Request(`http://localhost${url}`, init));
  };

  const appelSpring = () => {
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    return { url, init, headers: new Headers(init.headers) };
  };

  beforeEach(() => {
    vi.stubEnv('NITRO_API_URL', 'http://spring.test:5000');
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renvoie le JSON de Spring', async () => {
    fetchMock.mockResolvedValue(Response.json({ resume: { morts: 3 } }));

    const res = await call('/essai');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ resume: { morts: 3 } });
    expect(appelSpring().url).toBe('http://spring.test:5000/api/summary');
    expect(appelSpring().headers.get('accept')).toBe('application/json');
  });

  it('transmet le cookie de session et le jeton CSRF de la requête', async () => {
    fetchMock.mockResolvedValue(Response.json({}));

    await call('/essai', { headers: { cookie: 'JSESSIONID=abc; XSRF-TOKEN=t', 'x-xsrf-token': 't' } });

    expect(appelSpring().headers.get('cookie')).toBe('JSESSIONID=abc; XSRF-TOKEN=t');
    expect(appelSpring().headers.get('x-xsrf-token')).toBe('t');
  });

  it('n’invente aucun cookie ni jeton s’ils sont absents', async () => {
    fetchMock.mockResolvedValue(Response.json({}));

    await call('/essai');

    expect(appelSpring().headers.has('cookie')).toBe(false);
    expect(appelSpring().headers.has('x-xsrf-token')).toBe(false);
  });

  it('ajoute la query réencodée, SID compris, et envoie le corps en JSON', async () => {
    fetchMock.mockResolvedValue(Response.json({}));

    await call('/essai', undefined, '/api/faces/detail', {
      method: 'post',
      query: { sid: 'Celeste/1-ForsakenCity', side: 'A', vide: undefined },
      body: { nom: 'x' },
    });

    const { url, init, headers } = appelSpring();
    expect(url).toBe('http://spring.test:5000/api/faces/detail?sid=Celeste%2F1-ForsakenCity&side=A');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"nom":"x"}');
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('ne recopie jamais un Set-Cookie de Spring', async () => {
    fetchMock.mockResolvedValue(Response.json({}, { headers: { 'set-cookie': 'JSESSIONID=autre; Path=/' } }));

    const res = await call('/essai');

    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it.each([
    [401, 401, 'Connexion requise'],
    [403, 403, 'Accès refusé'],
    [404, 404, 'Introuvable'],
    [400, 400, 'Requête invalide'],
    [500, 502, "Erreur de l'API"],
  ])('répond %i de Spring par %i { message }', async (spring, attendu, message) => {
    fetchMock.mockResolvedValue(
      Response.json({ message: 'détail interne http://spring.test:5000' }, { status: spring }),
    );

    const res = await call('/essai');

    expect(res.status).toBe(attendu);
    expect(await res.json()).toEqual({ message });
  });

  it('répond 503 quand Spring est injoignable, sans son adresse', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed: connect ECONNREFUSED spring.test:5000'));

    const res = await call('/essai');

    expect(res.status).toBe(503);
    const corps = await res.text();
    expect(JSON.parse(corps)).toEqual({ message: 'API indisponible' });
    expect(corps).not.toContain('spring.test');
  });

  it('répond 503 quand Spring dépasse le délai', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );

    const res = await call('/essai', undefined, '/api/summary', { timeoutMs: 20 });

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ message: 'API indisponible' });
  });

  it('répond 502 quand le JSON de Spring est illisible', async () => {
    fetchMock.mockResolvedValue(new Response('<html>pas du JSON', { status: 200 }));

    const res = await call('/essai');

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ message: "Erreur de l'API" });
  });

  it('journalise méthode, chemin et statut, sans cookie ni query', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await call('/essai', { headers: { cookie: 'JSESSIONID=secret' } }, '/api/summary?tz=Europe/Paris', {
      query: { sid: 'secret-sid' },
    });

    const texte = journal();
    expect(texte).toContain('GET /api/summary → Spring 500');
    expect(texte).not.toContain('secret');
    expect(texte).not.toContain('tz=');
  });
});

describe('repondreErreur', () => {
  const call = (erreur: unknown) => {
    const route = defineEventHandler((event) => repondreErreur(event, erreur));
    const app = createApp().use(createRouter().get('/essai', route));
    return toWebHandler(app)(new Request('http://localhost/essai?token=secret'));
  };

  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it('reprend le statut et le message d’une erreur traduite', async () => {
    const res = await call(springError(404) as H3Error);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ message: 'Introuvable' });
  });

  it('répond 500 « Erreur interne » à une erreur imprévue, sans la détailler', async () => {
    const res = await call(new Error('connexion à http://spring.test:5000 perdue'));

    expect(res.status).toBe(500);
    const corps = await res.text();
    expect(JSON.parse(corps)).toEqual({ message: 'Erreur interne' });
    expect(corps).not.toContain('spring.test');
    const journal = (console.error as unknown as ReturnType<typeof vi.fn>).mock.calls.flat().join('\n');
    expect(journal).toContain('GET /essai');
    expect(journal).not.toContain('token');
  });
});
