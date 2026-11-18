// @vitest-environment node
import { createApp, createRouter, defineEventHandler, toWebHandler } from 'h3';
import { vi } from 'vitest';

import discord from './discord.get';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const call = (url: string, init?: RequestInit) => {
  const app = createApp().use(createRouter().get('/api/connexion/discord', discord));
  return toWebHandler(app)(new Request(`http://localhost${url}`, init));
};

describe('GET /api/connexion/discord', () => {
  it('retient la page demandée et part vers le flux OAuth2 de Spring', async () => {
    const res = await call('/api/connexion/discord?redirect=%2Ftableau-de-bord');

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/api/auth/oauth2/discord');
    expect(res.headers.get('cache-control')).toBe('no-store');
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('retour-connexion=%2Ftableau-de-bord');
    expect(cookie).toContain('Max-Age=600');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('Secure');
    // Spring n'est appelé que par le relais, après la redirection.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pose Secure quand le site est servi en https', async () => {
    const res = await call('/api/connexion/discord?redirect=%2Fmaps', { headers: { 'x-forwarded-proto': 'https' } });
    expect(res.headers.get('set-cookie')).toContain('Secure');
  });

  it.each(['', '?redirect=', '?redirect=%2F'])('sans page à retenir (%s), aucun cookie', async (query) => {
    const res = await call(`/api/connexion/discord${query}`);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/api/auth/oauth2/discord');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('efface la page retenue par une connexion précédente quand il n’y en a pas de nouvelle', async () => {
    const res = await call('/api/connexion/discord', { headers: { cookie: 'retour-connexion=%2Fmaps' } });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/api/auth/oauth2/discord');
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/^retour-connexion=;/);
    expect(cookie).toContain('Max-Age=0');
  });

  it.each(['%2F%2Fevil.fr', 'https%3A%2F%2Fevil.fr', '%2F%5Cevil.fr'])(
    'ne retient jamais une adresse externe (%s)',
    async (externe) => {
      const res = await call(`/api/connexion/discord?redirect=${externe}`);
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('/api/auth/oauth2/discord');
      expect(res.headers.get('set-cookie')).toBeNull();
    },
  );

  it('ignore un redirect répété', async () => {
    const res = await call('/api/connexion/discord?redirect=%2Fa&redirect=%2Fb');
    expect(res.status).toBe(302);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('passe avant le relais générique /api/**', async () => {
    // Même ordre de priorité que Nitro : la route précise gagne sur le joker.
    const relais = vi.fn(() => 'relais');
    const app = createApp().use(
      createRouter().get('/api/connexion/discord', discord).use('/api/**', defineEventHandler(relais)),
    );
    const res = await toWebHandler(app)(new Request('http://localhost/api/connexion/discord?redirect=%2Fmaps'));
    expect(res.status).toBe(302);
    expect(relais).not.toHaveBeenCalled();
  });
});
