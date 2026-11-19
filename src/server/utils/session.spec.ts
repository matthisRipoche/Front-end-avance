// @vitest-environment node
import { createApp, defineEventHandler, toWebHandler } from 'h3';
import { vi } from 'vitest';

import { CLE_SESSION } from '../../app/auth/session-contrat';
import { gererSession } from './session';
import { springUrl } from './spring';

vi.stubEnv('NITRO_API_URL', 'http://spring.test:5000');

const UTILISATEUR = {
  id: 7,
  email: 'madeline@example.com',
  createdAt: '2026-10-01T10:00:00Z',
  discordUsername: null,
  discordAvatarUrl: null,
};

const fetchMock = vi.fn();
const journal = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  journal.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(journal);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Middleware de session, suivi d'un gestionnaire qui renvoie l'état lu sur la requête Node. */
const call = (url: string, init?: RequestInit) => {
  const app = createApp()
    .use(defineEventHandler(gererSession))
    .use(
      defineEventHandler((event) => ({
        etat: (event.node.req as unknown as Record<symbol, unknown>)[CLE_SESSION] ?? null,
      })),
    );
  return toWebHandler(app)(new Request(`http://localhost${url}`, init));
};

const avecSession = { headers: { cookie: 'JSESSIONID=secret123; XSRF-TOKEN=x' } };

describe('Session vérifiée auprès de Spring avant le rendu', () => {
  it('sans cookie de session, conclut anonyme sans appeler Spring', async () => {
    const res = await call('/');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ etat: { statut: 'anonyme' } });
  });

  it('avec une session valide, rend l’utilisateur et transmet le cookie à Spring', async () => {
    fetchMock.mockResolvedValue(Response.json(UTILISATEUR, { status: 200 }));
    const res = await call('/', avecSession);
    expect(await res.json()).toEqual({ etat: { statut: 'connecte', utilisateur: UTILISATEUR } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [adresse, init] = fetchMock.mock.calls[0];
    expect(adresse).toBe(springUrl('/api/auth/me'));
    expect(init.headers.cookie).toContain('JSESSIONID=secret123');
  });

  it('ne recopie pas les Set-Cookie de Spring', async () => {
    fetchMock.mockResolvedValue(
      Response.json(UTILISATEUR, { status: 200, headers: { 'set-cookie': 'JSESSIONID=autre; Path=/' } }),
    );
    const res = await call('/', avecSession);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('conclut anonyme quand Spring répond 401', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    expect(await (await call('/', avecSession)).json()).toEqual({ etat: { statut: 'anonyme' } });
  });

  it('conclut inconnu quand Spring répond 500', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
    expect(await (await call('/', avecSession)).json()).toEqual({ etat: { statut: 'inconnu' } });
    expect(journal).toHaveBeenCalledWith('[session] Spring 500');
  });

  it('conclut inconnu quand Spring est injoignable, sans journaliser le cookie', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect(await (await call('/?code=abc', avecSession)).json()).toEqual({ etat: { statut: 'inconnu' } });
    expect(journal).toHaveBeenCalledWith('[session] Spring injoignable');
    const ecrit = journal.mock.calls.flat().join(' ');
    expect(ecrit).not.toContain('secret123');
    expect(ecrit).not.toContain('code=abc');
  });

  it.each([
    ['un corps qui n’est pas du JSON', () => new Response('<html>oups</html>', { status: 200 })],
    ['un JSON sans id numérique', () => Response.json({ id: '7' }, { status: 200 })],
    ['un JSON null', () => Response.json(null, { status: 200 })],
  ])('conclut inconnu quand Spring répond 200 avec %s, sans journaliser le cookie', async (_cas, reponse) => {
    fetchMock.mockResolvedValue(reponse());
    expect(await (await call('/', avecSession)).json()).toEqual({ etat: { statut: 'inconnu' } });
    const ecrit = journal.mock.calls.flat().join(' ');
    expect(ecrit).toContain('réponse illisible');
    expect(ecrit).not.toContain('secret123');
  });

  it('pendant le prérendu, conclut inconnu sans appeler Spring', async () => {
    const res = await call('/', { headers: { ...avecSession.headers, 'x-nitro-prerender': '/' } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ etat: { statut: 'inconnu' } });
  });

  it.each([
    ['/api/x', 'GET'],
    ['/health', 'GET'],
    ['/_analog/pages/x', 'GET'],
    ['/assets/a.js', 'GET'],
    ['/tableau-de-bord', 'POST'],
  ])('ignore %s en %s : aucun appel, aucun état posé', async (url, method) => {
    const res = await call(url, { method, headers: avecSession.headers });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ etat: null });
  });
});

describe('Pages connectées protégées côté serveur', () => {
  it('redirige vers /login en gardant le chemin complet', async () => {
    const res = await call('/tableau-de-bord?x=1');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/login?redirect=%2Ftableau-de-bord%3Fx%3D1');
  });

  it.each(['/tableau-de-bord/', '/tableau-de-bord;a=b'])('redirige aussi la variante %s', async (url) => {
    const res = await call(url);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toMatch(/^\/login\?redirect=/);
  });

  it('répond 503 quand Spring est en erreur, sans rendre la page', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    const res = await call('/tableau-de-bord', avecSession);
    expect(res.status).toBe(503);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await res.text()).toBe('Service momentanément indisponible. Réessaie dans un moment.');
  });

  it('répond 503 et non 302 quand Spring répond 200 avec une réponse illisible', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: '7' }, { status: 200 }));
    const res = await call('/tableau-de-bord', avecSession);
    expect(res.status).toBe(503);
    expect(res.headers.get('location')).toBeNull();
  });

  it('laisse passer un joueur connecté, sans cache partagé', async () => {
    fetchMock.mockResolvedValue(Response.json(UTILISATEUR, { status: 200 }));
    const res = await call('/tableau-de-bord', avecSession);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect((await res.json()).etat.statut).toBe('connecte');
  });

  it('laisse passer une page publique pour un anonyme', async () => {
    const res = await call('/faq');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBeNull();
  });

  it('traite HEAD comme GET', async () => {
    const res = await call('/tableau-de-bord', { method: 'HEAD' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/login?redirect=%2Ftableau-de-bord');
  });
});

describe('Corrections après relecture', () => {
  it('conclut anonyme quand Spring répond 403', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    const res = await call('/', avecSession);
    expect(await res.json()).toEqual({ etat: { statut: 'anonyme' } });
  });

  it('ne recopie que les champs connus du compte (ils finissent dans le HTML)', async () => {
    fetchMock.mockResolvedValue(Response.json({ ...UTILISATEUR, roleInterne: 'admin' }, { status: 200 }));
    const res = await call('/', avecSession);
    expect(await res.json()).toEqual({ etat: { statut: 'connecte', utilisateur: UTILISATEUR } });
  });

  it('interdit le cache de toute page rendue pour un joueur connecté, pas seulement les pages connectées', async () => {
    fetchMock.mockResolvedValue(Response.json(UTILISATEUR, { status: 200 }));
    // Une page publique : /login, elle, renvoie désormais le joueur connecté ailleurs (#35).
    const res = await call('/faq', avecSession);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('vary')).toContain('Cookie');
  });

  it('vérifie une page connectée même si son adresse contient un point', async () => {
    const res = await call('/tableau-de-bord;v=1.0');
    expect(res.status).toBe(302);
  });

  it('lit l’adresse d’origine quand Vite a réécrit req.url (npm run dev)', async () => {
    // En dev, Vite remplace req.url par /index.html et garde la vraie adresse dans originalUrl.
    const app = createApp()
      .use(
        defineEventHandler((event) => {
          (event.node.req as { originalUrl?: string }).originalUrl = '/tableau-de-bord?x=1';
          event._path = '/index.html';
        }),
      )
      .use(defineEventHandler(gererSession))
      .use(defineEventHandler(() => 'rendu'));
    const res = await toWebHandler(app)(new Request('http://localhost/index.html'));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/login?redirect=%2Ftableau-de-bord%3Fx%3D1');
  });

  it('renvoie une valeur après le 302 et le 503, pour que le dev d’Analog s’arrête là', async () => {
    const evenement = (cookie?: string) => {
      const res = { statusCode: 200, headers: {} as Record<string, unknown>, headersSent: false, writableEnded: false };
      return {
        method: 'GET',
        path: '/tableau-de-bord',
        node: {
          req: { headers: cookie ? { cookie } : {}, url: '/tableau-de-bord' },
          res: Object.assign(res, {
            setHeader: (n: string, v: unknown) => (res.headers[n.toLowerCase()] = v),
            getHeader: (n: string) => res.headers[n.toLowerCase()],
            removeHeader: () => undefined,
            end: () => { res.writableEnded = true; },
          }),
        },
        context: {},
        handled: false,
      };
    };
    expect(await gererSession(evenement() as never)).toBe(true);
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    expect(await gererSession(evenement('JSESSIONID=x') as never)).toBe(true);
  });
});

describe('Joueur connecté qui arrive sur la page de connexion', () => {
  const connecte = () => fetchMock.mockResolvedValue(Response.json(UTILISATEUR, { status: 200 }));
  const avecRetour = (chemin: string) => ({
    headers: { cookie: `JSESSIONID=secret123; retour-connexion=${encodeURIComponent(chemin)}` },
  });

  it('au retour de Discord, renvoie vers la page retenue par le cookie et l’efface', async () => {
    connecte();
    const res = await call('/login?discord=ok', avecRetour('/maps?face=Celeste%2F1-ForsakenCity'));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/maps?face=Celeste%2F1-ForsakenCity');
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/^retour-connexion=;/);
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('Path=/');
  });

  it('sans cookie, renvoie vers l’accueil', async () => {
    connecte();
    const res = await call('/login?discord=ok', avecSession);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/');
  });

  it('sans cookie, suit ?redirect= de la page de connexion', async () => {
    connecte();
    const res = await call('/login?redirect=%2Fx', avecSession);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/x');
  });

  it('préfère le cookie à ?redirect=', async () => {
    connecte();
    const res = await call('/login?redirect=%2Fx', avecRetour('/tableau-de-bord'));
    expect(res.headers.get('location')).toBe('/tableau-de-bord');
  });

  it.each(['//evil.fr', 'https://evil.fr', '/\\evil.fr'])(
    'n’envoie jamais vers une adresse externe (cookie %s)',
    async (externe) => {
      connecte();
      const res = await call('/login?discord=ok', avecRetour(externe));
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('/');
    },
  );

  it('n’envoie pas vers une adresse externe donnée par ?redirect=', async () => {
    connecte();
    const res = await call('/login?redirect=%2F%2Fevil.fr', avecSession);
    expect(res.headers.get('location')).toBe('/');
  });

  it('la redirection ne se met pas en cache', async () => {
    connecte();
    const res = await call('/login', avecSession);
    expect(res.status).toBe(302);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('vary')).toContain('Cookie');
  });

  it('laisse un anonyme sur la page de connexion', async () => {
    const res = await call('/login?discord=ok', { headers: { cookie: 'retour-connexion=%2Fx' } });
    expect(res.status).toBe(200);
    expect((await res.json()).etat).toEqual({ statut: 'anonyme' });
  });

  it('laisse la page de connexion s’afficher quand Spring est en panne', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const res = await call('/login?discord=ok', avecRetour('/x'));
    expect(res.status).toBe(200);
    expect((await res.json()).etat).toEqual({ statut: 'inconnu' });
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('renvoie une valeur après le 302, pour que le dev d’Analog s’arrête là', async () => {
    connecte();
    const res = { statusCode: 200, headers: {} as Record<string, unknown>, headersSent: false, writableEnded: false };
    const evenement = {
      method: 'GET',
      path: '/login?discord=ok',
      node: {
        req: { headers: { cookie: 'JSESSIONID=x' }, url: '/login?discord=ok' },
        res: Object.assign(res, {
          setHeader: (n: string, v: unknown) => (res.headers[n.toLowerCase()] = v),
          getHeader: (n: string) => res.headers[n.toLowerCase()],
          removeHeader: () => undefined,
          end: () => { res.writableEnded = true; },
        }),
      },
      context: {},
      handled: false,
    };
    expect(await gererSession(evenement as never)).toBe(true);
    expect(res.headers['location']).toBe('/');
  });
});
