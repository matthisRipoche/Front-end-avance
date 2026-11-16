// @vitest-environment node
import { once } from 'node:events';
import { createServer, get } from 'node:http';
import type { AddressInfo } from 'node:net';

import { createApp, createRouter, toNodeListener, toWebHandler } from 'h3';
import { vi } from 'vitest';

import relais from './[...path]';

vi.stubEnv('NITRO_API_URL', 'http://spring.test:5000');

const fetchMock = vi.fn();

const call = (url: string, init?: RequestInit) => {
  const app = createApp().use(createRouter().use('/api/**', relais));
  return toWebHandler(app)(new Request(`http://localhost${url}`, init));
};

/** Requête reçue par Spring simulé : adresse et options passées à fetch. */
const appelSpring = () => {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url, init, headers: new Headers(init.headers) };
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

describe('Relais /api vers Spring', () => {
  it('renvoie 401 sans session, comme Spring', async () => {
    fetchMock.mockResolvedValue(Response.json({ message: 'non connecté' }, { status: 401 }));

    const res = await call('/api/auth/me');

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: 'non connecté' });
  });

  it('renvoie la réponse de Spring quand tout va bien', async () => {
    fetchMock.mockResolvedValue(Response.json({ email: 'a@b.fr' }));

    const res = await call('/api/auth/me');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: 'a@b.fr' });
  });

  it('transmet le cookie de session et le jeton CSRF à Spring', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await call('/api/faces', {
      method: 'DELETE',
      headers: { cookie: 'JSESSIONID=abc; XSRF-TOKEN=jeton', 'x-xsrf-token': 'jeton' },
    });

    const { headers } = appelSpring();
    expect(headers.get('cookie')).toBe('JSESSIONID=abc; XSRF-TOKEN=jeton');
    expect(headers.get('x-xsrf-token')).toBe('jeton');
  });

  it('appelle Spring sur la même adresse, encodage du SID conservé', async () => {
    fetchMock.mockResolvedValue(Response.json({}));

    await call('/api/faces/detail?sid=Celeste%2F1-ForsakenCity&side=A');

    expect(appelSpring().url).toBe(
      'http://spring.test:5000/api/faces/detail?sid=Celeste%2F1-ForsakenCity&side=A',
    );
  });

  it('transmet le corps JSON d’un login', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const corps = JSON.stringify({ email: 'a@b.fr', password: 'secret' });

    await call('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: corps,
    });

    const { init } = appelSpring();
    expect(init.method).toBe('POST');
    expect(Buffer.from(init.body as Uint8Array).toString()).toBe(corps);
  });

  it('renvoie au navigateur chaque cookie posé par Spring', async () => {
    const headers = new Headers();
    headers.append('set-cookie', 'JSESSIONID=abc; Path=/; HttpOnly');
    headers.append('set-cookie', 'XSRF-TOKEN=jeton; Path=/');
    fetchMock.mockResolvedValue(new Response(null, { status: 200, headers }));

    const res = await call('/api/auth/login', { method: 'POST', body: '{}' });

    expect(res.headers.getSetCookie()).toEqual([
      'JSESSIONID=abc; Path=/; HttpOnly',
      'XSRF-TOKEN=jeton; Path=/',
    ]);
  });

  it('renvoie 503 quand Spring est injoignable, sans son adresse', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    const res = await call('/api/auth/me', { headers: { cookie: 'JSESSIONID=secret' } });

    expect(res.status).toBe(503);
    const texte = await res.text();
    expect(JSON.parse(texte)).toEqual({ message: 'API indisponible' });
    expect(texte).not.toContain('spring.test');
    expect(String(vi.mocked(console.error).mock.calls)).not.toContain('secret');
  });

  it('traduit une erreur 500 de Spring en 502, sans ses en-têtes ni ses cookies', async () => {
    fetchMock.mockResolvedValue(
      new Response('java.lang.NullPointerException at spring.test', {
        status: 500,
        headers: { 'set-cookie': 'JSESSIONID=autre; Path=/', 'x-spring': 'oui' },
      }),
    );

    const res = await call('/api/summary', { headers: { cookie: 'JSESSIONID=secret' } });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ message: "Erreur de l'API" });
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(res.headers.get('x-spring')).toBeNull();
    expect(String(vi.mocked(console.error).mock.calls)).not.toContain('secret');
  });

  it('journalise le chemin sans la query', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500 }));

    await call('/api/auth/oauth2/callback/discord?code=code-oauth&state=etat');

    expect(console.error).toHaveBeenCalledWith(
      '[api] GET /api/auth/oauth2/callback/discord → Spring 500',
    );
  });

  it('note une coupure de Spring pendant le corps sans la prendre pour une panne', async () => {
    // Un premier morceau part, puis la connexion casse (error() dans start viderait la file).
    let morceaux = 0;
    const corps = new ReadableStream({
      pull(controller) {
        if (morceaux++ === 0) controller.enqueue(new TextEncoder().encode('{"debut":'));
        else controller.error(new Error('connexion coupée'));
      },
    });
    fetchMock.mockResolvedValue(new Response(corps, { status: 200 }));

    // Vrai serveur HTTP : il faut un vrai socket pour que les en-têtes partent avant le corps
    // (toWebHandler garde tout en mémoire jusqu'à la fin).
    const app = createApp().use(createRouter().use('/api/**', relais));
    const serveur = createServer(toNodeListener(app)).listen(0);
    await once(serveur, 'listening');
    const { port } = serveur.address() as AddressInfo;
    // Le navigateur doit voir une connexion coupée (pas un 503, pas une attente sans fin).
    const issue = await new Promise<string>((resolve) => {
      get(`http://127.0.0.1:${port}/api/summary`, (res) => {
        res.on('error', () => resolve('coupée')).resume();
        res.on('end', () => resolve(`terminée ${res.statusCode}`));
      }).on('error', () => resolve('coupée'));
    });
    serveur.close();

    expect(issue).toBe('coupée');
    expect(String(vi.mocked(console.error).mock.calls)).toContain('réponse interrompue');
    expect(String(vi.mocked(console.error).mock.calls)).not.toContain('injoignable');
  });

  it.each(['/api/_analog/x', '/api/_analog', '/api/ingest/x', '/api/ingest', '/api/ingest?x=1'])(
    'refuse %s sans appeler Spring',
    async (url) => {
      const res = await call(url, { method: 'POST', body: '{}' });

      expect(res.status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('relaie /api/ingestion, qui n’est pas le préfixe réservé au mod', async () => {
    fetchMock.mockResolvedValue(Response.json({}));

    const res = await call('/api/ingestion');

    expect(res.status).toBe(200);
    expect(appelSpring().url).toBe('http://spring.test:5000/api/ingestion');
  });
});
