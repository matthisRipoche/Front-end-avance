// @vitest-environment node
import { once } from 'node:events';
import { createServer, request } from 'node:http';
import type { AddressInfo } from 'node:net';

import { createApp, createError, createRouter, defineEventHandler, toNodeListener } from 'h3';
import { vi } from 'vitest';

import { ligneJournal, suivreRequete } from './journal';

vi.mock('nitropack/runtime', () => ({ defineNitroPlugin: (f: unknown) => f }));

/**
 * Le journal s'écrit sur l'événement `finish` de la réponse Node : il faut un vrai serveur HTTP,
 * le gestionnaire web de h3 (toWebHandler) n'émet pas ces événements.
 *
 * L'application reproduit l'ordre de Nitro en production : le suivi part de `onRequest` (là où
 * Nitro appelle le hook `request`), puis un gestionnaire « statique » répond avant le routeur,
 * comme les pages prérendues.
 */
async function demarrer() {
  const router = createRouter()
    .get('/faq', defineEventHandler(() => 'FAQ'))
    .get('/health', defineEventHandler(() => ({ status: 'ok' })))
    .get('/casse', defineEventHandler(() => {
      throw createError({ statusCode: 500 });
    }))
    .post('/api/auth/login', defineEventHandler(() => ({ ok: true })))
    .get('/lent', defineEventHandler(async (event) => {
      event.node.res.write('début');
      await new Promise((r) => setTimeout(r, 50)); // le client coupe pendant ce temps
      event.node.res.end('fin');
    }));
  const statique = defineEventHandler((event) => {
    return event.path === '/assets/app.js' ? 'console.log(1)' : undefined;
  });
  const app = createApp({ onRequest: suivreRequete }).use(statique).use(router);
  const serveur = createServer(toNodeListener(app)).listen(0);
  await once(serveur, 'listening');
  const { port } = serveur.address() as AddressInfo;
  return { port, fermer: () => new Promise((r) => serveur.close(r)) };
}

let serveur: Awaited<ReturnType<typeof demarrer>>;
let log: ReturnType<typeof vi.spyOn>;

/** Lignes écrites par le journal, une fois la réponse terminée côté serveur. */
const lignes = () => log.mock.calls.map((c: unknown[]) => String(c[0]));
const attendreLignes = (n: number) => vi.waitFor(() => expect(lignes()).toHaveLength(n));

function appeler(chemin: string, init?: RequestInit) {
  return fetch(`http://127.0.0.1:${serveur.port}${chemin}`, init).then((r) => r.text());
}

beforeEach(async () => {
  log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  serveur = await demarrer();
});
afterEach(async () => {
  await serveur.fermer();
  vi.restoreAllMocks();
});

describe('Journal des requêtes', () => {
  it('écrit méthode, chemin, statut et durée', async () => {
    await appeler('/faq');
    await attendreLignes(1);
    expect(lignes()[0]).toMatch(/^\[req\] GET \/faq 200 \d+ms$/);
  });

  it('journalise aussi un fichier servi avant les routes (statique, page prérendue)', async () => {
    await appeler('/assets/app.js');
    await attendreLignes(1);
    expect(lignes()[0]).toMatch(/^\[req\] GET \/assets\/app\.js 200 \d+ms$/);
  });

  it('écrit le statut final, même en cas d’erreur', async () => {
    await appeler('/casse');
    await attendreLignes(1);
    expect(lignes()[0]).toMatch(/^\[req\] GET \/casse 500 \d+ms$/);
  });

  it('n’écrit ni la query, ni les cookies, ni le corps', async () => {
    await appeler('/api/auth/login?code=secret-oauth', {
      method: 'POST',
      headers: { cookie: 'JSESSIONID=secret-session', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.fr', password: 'secret-mdp' }),
    });
    await attendreLignes(1);
    expect(lignes()[0]).toMatch(/^\[req\] POST \/api\/auth\/login 200 \d+ms$/);
    expect(lignes()[0]).not.toMatch(/secret|a@b\.fr/);
  });

  it('ne journalise pas /health quand il répond', async () => {
    await appeler('/health');
    await appeler('/faq'); // témoin : seule cette requête doit apparaître
    await attendreLignes(1);
    expect(lignes()[0]).toContain('/faq');
  });

  it('signale une réponse interrompue par le client', async () => {
    const req = request(`http://127.0.0.1:${serveur.port}/lent`);
    req.on('error', () => undefined);
    req.on('response', (res) => {
      res.once('data', () => req.destroy()); // coupe après le premier morceau
    });
    req.end();
    await attendreLignes(1);
    expect(lignes()[0]).toMatch(/^\[req\] GET \/lent interrompue \d+ms$/);
  });
});

describe('ligneJournal', () => {
  it('arrondit la durée à la milliseconde', () => {
    expect(ligneJournal('GET', '/', 200, 12.6)).toBe('[req] GET / 200 13ms');
  });
});
