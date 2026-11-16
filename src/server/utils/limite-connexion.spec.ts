// @vitest-environment node
import { createApp, createRouter, defineEventHandler, toWebHandler } from 'h3';
import { vi } from 'vitest';

vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: () => ({ apiUrl: 'http://spring.test:5000' }) }));

/** Le relais, simulé : compte les appels qui seraient partis vers Spring. */
const spring = vi.fn(() => ({ ok: true }));

/** Module rechargé à chaque test : le compteur du limiteur repart de zéro. */
async function application() {
  vi.resetModules();
  const { default: limite, MAX_ESSAIS } = await import('../middleware/limite-connexion');
  const app = createApp()
    .use(limite)
    .use(createRouter().use('/api/**', defineEventHandler(spring)));
  const handler = toWebHandler(app);
  const appeler = (chemin: string, ip = '203.0.113.7', methode = 'POST') =>
    handler(
      new Request(`http://localhost${chemin}`, {
        method: methode,
        headers: { 'x-forwarded-for': ip },
      }),
    );
  return { appeler, MAX_ESSAIS };
}

beforeEach(() => spring.mockClear());

describe('Limitation de débit du login', () => {
  it('laisse passer les essais autorisés, puis répond 429 sans appeler Spring', async () => {
    const { appeler, MAX_ESSAIS } = await application();
    for (let i = 0; i < MAX_ESSAIS; i++) {
      expect((await appeler('/api/auth/login')).status).toBe(200);
    }
    const res = await appeler('/api/auth/login');

    expect(res.status).toBe(429);
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await res.json()).message).toMatch(/^Trop de tentatives de connexion\. Réessaie dans \d+ s\.$/);
    expect(spring).toHaveBeenCalledTimes(MAX_ESSAIS);
  });

  it('compte chaque adresse IP séparément', async () => {
    const { appeler, MAX_ESSAIS } = await application();
    for (let i = 0; i <= MAX_ESSAIS; i++) await appeler('/api/auth/login', '203.0.113.7');
    expect((await appeler('/api/auth/login', '198.51.100.2')).status).toBe(200);
  });

  it('lit la dernière adresse de X-Forwarded-For, pas une première inventée par le client', async () => {
    const { appeler, MAX_ESSAIS } = await application();
    for (let i = 0; i <= MAX_ESSAIS; i++) {
      await appeler('/api/auth/login', `10.0.0.${i}, 203.0.113.7`);
    }
    expect((await appeler('/api/auth/login', '10.9.9.9, 203.0.113.7')).status).toBe(429);
  });

  it('compte aussi les variantes du chemin que Spring recevrait comme le login', async () => {
    const { appeler, MAX_ESSAIS } = await application();
    const variantes = [
      '/api/auth/login',
      '/api/x/../auth/login',
      '/api/auth/%6Cogin',
      '/api/auth/login?x=1',
      '/api/auth/login/',
      '/api//auth/login',
      '/api/AUTH/Login',
    ];
    for (let i = 0; i < MAX_ESSAIS; i++) await appeler(variantes[i % variantes.length]);
    expect((await appeler('/api/x/%2e%2e/auth/login')).status).toBe(429);
  });

  it('ne limite ni les autres routes ni un GET', async () => {
    const { appeler, MAX_ESSAIS } = await application();
    for (let i = 0; i <= MAX_ESSAIS; i++) {
      expect((await appeler('/api/auth/me')).status).toBe(200);
      expect((await appeler('/api/auth/login', undefined, 'GET')).status).toBe(200);
    }
  });
});
