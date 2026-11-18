// @vitest-environment node
import { createApp, defineEventHandler, toWebHandler } from 'h3';

import {
  COOKIE_RETOUR,
  effacerRetourConnexion,
  lireRetourConnexion,
  poserRetourConnexion,
} from './retour-connexion';

/** Application d'une route, qui exécute `action` sur la requête reçue. */
const call = (action: Parameters<typeof defineEventHandler>[0], init?: RequestInit, url = 'http://localhost/') =>
  toWebHandler(createApp().use(defineEventHandler(action)))(new Request(url, init));

describe('Cookie de retour après la connexion par Discord', () => {
  it('pose le chemin avec tous ses attributs, sans Secure en http', async () => {
    const res = await call((event) => {
      poserRetourConnexion(event, '/maps?face=Celeste%2F1-ForsakenCity');
      return 'ok';
    });
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`${COOKIE_RETOUR}=${encodeURIComponent('/maps?face=Celeste%2F1-ForsakenCity')}`);
    expect(cookie).toContain('Max-Age=600');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('Secure');
  });

  it('ajoute Secure derrière un proxy en https', async () => {
    const res = await call(
      (event) => {
        poserRetourConnexion(event, '/maps');
        return 'ok';
      },
      { headers: { 'x-forwarded-proto': 'https' } },
    );
    expect(res.headers.get('set-cookie')).toContain('Secure');
  });

  it.each([undefined, null, '', '/', '//evil.fr', 'https://evil.fr', '/login?redirect=/x'])(
    'ne pose rien pour %s',
    async (redirect) => {
      const res = await call((event) => {
        poserRetourConnexion(event, redirect);
        return 'ok';
      });
      expect(res.headers.get('set-cookie')).toBeNull();
    },
  );

  it.each([undefined, '/', '//evil.fr'])(
    'efface un cookie laissé par une connexion précédente quand il n’y a rien à retenir (%s)',
    async (redirect) => {
      const res = await call(
        (event) => {
          poserRetourConnexion(event, redirect);
          return 'ok';
        },
        { headers: { cookie: `${COOKIE_RETOUR}=${encodeURIComponent('/maps')}` } },
      );
      const cookie = res.headers.get('set-cookie') ?? '';
      expect(cookie).toMatch(new RegExp(`^${COOKIE_RETOUR}=;`));
      expect(cookie).toContain('Max-Age=0');
      expect(cookie).toContain('Path=/');
    },
  );

  it('relit le chemin retenu', async () => {
    const res = await call((event) => ({ chemin: lireRetourConnexion(event) }), {
      headers: { cookie: `${COOKIE_RETOUR}=${encodeURIComponent('/maps?x=1')}` },
    });
    expect(await res.json()).toEqual({ chemin: '/maps?x=1' });
  });

  it('sans cookie, ne renvoie aucun chemin', async () => {
    const res = await call((event) => ({ chemin: lireRetourConnexion(event) }));
    expect(await res.json()).toEqual({ chemin: null });
  });

  it.each(['//evil.fr', 'https://evil.fr'])('revalide un cookie écrit par le navigateur (%s)', async (externe) => {
    const res = await call((event) => ({ chemin: lireRetourConnexion(event) }), {
      headers: { cookie: `${COOKIE_RETOUR}=${encodeURIComponent(externe)}` },
    });
    expect(await res.json()).toEqual({ chemin: '/' });
  });

  it('efface le cookie sur le même chemin', async () => {
    const res = await call((event) => {
      effacerRetourConnexion(event);
      return 'ok';
    });
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(new RegExp(`^${COOKIE_RETOUR}=;`));
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('Path=/');
  });
});
