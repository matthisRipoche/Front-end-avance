// Essai du serveur construit (`npm run test:serveur`, étape « Serveur construit » de la CI).
//
// Pourquoi : Vitest appelle les routes une à une, hors de Nitro. Il ne voit donc pas ce qui tient
// à l'assemblage : l'ordre des middlewares, une route dédiée qui passe avant le relais, les
// fichiers `.spec.ts` qui ne doivent pas devenir des routes (`nitro.ignore`), le 302 posé avant le
// rendu. Ce script lance `dist/analog/server/index.mjs` contre un faux Spring et vérifie ces points.
//
// Prérequis : `npm run build` déjà lancé. Aucun port fixe : les deux serveurs écoutent sur un port libre.
// Le premier cas qui échoue arrête le script (code 1) ; le serveur et le faux Spring sont toujours
// arrêtés, par le PID du processus lancé ici.

import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { createServer } from 'node:http';

const SERVEUR = 'dist/analog/server/index.mjs';
const DELAI_DEMARRAGE_MS = 20_000;

await access(SERVEUR).catch(() => {
  console.error(`✗ ${SERVEUR} introuvable : lancer « npm run build » d'abord.`);
  process.exit(1);
});

// --- Faux Spring ------------------------------------------------------------------------------

/** Requêtes reçues par le faux Spring : { method, path, cookie }. */
const recues = [];

const SUMMARY = {
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
const LIVE = { active: false, session: null, current: null, serverTime: 1_700_000_300_000 };

function repondre(res, statut, corps) {
  res.writeHead(statut, { 'content-type': 'application/json' });
  res.end(corps === undefined ? '' : JSON.stringify(corps));
}

/** Interrupteur du faux Spring pour /api/auth/providers : le script et le faux Spring partagent le processus. */
let providersEnPanne = false;

const springFactice = createServer((req, res) => {
  const chemin = new URL(req.url, 'http://spring').pathname;
  const cookie = req.headers.cookie ?? '';
  recues.push({ method: req.method, path: chemin, cookie });

  if (chemin === '/api/auth/me') {
    if (cookie.includes('JSESSIONID=panne')) return repondre(res, 500, { error: 'panne' });
    if (cookie.includes('JSESSIONID=ok')) {
      return repondre(res, 200, { id: 1, username: 'test', displayName: 'Test' });
    }
    return repondre(res, 401, { error: 'non connecté' });
  }
  if (chemin === '/api/auth/providers') {
    if (providersEnPanne) return repondre(res, 500, { error: 'panne' });
    return repondre(res, 200, { discord: true, extra: 'x' });
  }
  if (chemin === '/api/summary') return repondre(res, 200, SUMMARY);
  if (chemin === '/api/live') return repondre(res, 200, LIVE);
  if (chemin === '/api/panne') return repondre(res, 500, { error: 'panne' });
  if (chemin === '/api/auth/login') return repondre(res, 200, { id: 1 });
  return repondre(res, 404, { error: 'inconnu' });
});

/** Port libre : on écoute sur 0, on lit le port attribué, on ferme. */
async function portLibre() {
  const temporaire = createServer();
  await new Promise((ok) => temporaire.listen(0, '127.0.0.1', ok));
  const { port } = temporaire.address();
  await new Promise((ok) => temporaire.close(ok));
  return port;
}

// --- Assertions -------------------------------------------------------------------------------

let serveur = null;
let sortie = '';

function echec(libelle, detail) {
  console.error(`✗ ${libelle}`);
  console.error(`  ${detail}`);
  throw new Error('cas en échec');
}

function verifier(libelle, condition, detail) {
  if (!condition) echec(libelle, detail);
  console.log(`✓ ${libelle}`);
}

/** Requêtes reçues par Spring depuis `depuis` (indice dans `recues`). */
const recuesApres = (depuis) => recues.slice(depuis);

async function lancerEssais(base) {
  const get = (chemin, entetes = {}, options = {}) =>
    fetch(base + chemin, { redirect: 'manual', headers: entetes, ...options });

  // /health
  let res = await get('/health');
  let corps = await res.json().catch(() => null);
  verifier(
    'GET /health → 200 { status: "ok" }',
    res.status === 200 && corps?.status === 'ok',
    `reçu ${res.status} ${JSON.stringify(corps)}`,
  );

  let avant;

  // Route publique et mise en cache : /api/connexion/fournisseurs. Le cache vit dans le processus
  // serveur : la panne sans cache chaud passe donc avant le premier succès.
  const appelsProviders = (r) => recuesApres(r).filter((x) => x.path === '/api/auth/providers');
  avant = recues.length;
  providersEnPanne = true;
  res = await get('/api/connexion/fournisseurs');
  corps = await res.json().catch(() => null);
  verifier(
    'GET /api/connexion/fournisseurs, Spring en panne sans cache chaud → 502, no-store, pas de cache',
    res.status === 502 &&
      corps?.message === "Erreur de l'API" &&
      res.headers.get('cache-control') === 'no-store' &&
      appelsProviders(avant).length === 1,
    `reçu ${res.status} ${JSON.stringify(corps)}, cache-control: ${res.headers.get('cache-control')}`,
  );
  providersEnPanne = false;

  avant = recues.length;
  res = await get('/api/connexion/fournisseurs');
  corps = await res.json().catch(() => null);
  verifier(
    'GET /api/connexion/fournisseurs, Spring revenu → 200 { discord: true } sans champ en trop, MISS',
    res.status === 200 &&
      JSON.stringify(corps) === '{"discord":true}' &&
      res.headers.get('cache-control') === 'public, max-age=60' &&
      res.headers.get('x-cache') === 'MISS' &&
      res.headers.get('set-cookie') === null &&
      appelsProviders(avant).length === 1,
    `reçu ${res.status} ${JSON.stringify(corps)}, cache-control: ${res.headers.get('cache-control')}, x-cache: ${res.headers.get('x-cache')}`,
  );

  // Spring retombe en panne : la valeur gardée doit suffire, sans le rappeler.
  providersEnPanne = true;
  avant = recues.length;
  res = await get('/api/connexion/fournisseurs', { cookie: 'JSESSIONID=x; XSRF-TOKEN=y' });
  providersEnPanne = false;
  corps = await res.json().catch(() => null);
  verifier(
    'GET /api/connexion/fournisseurs avec cookies, Spring en panne → même réponse, HIT, aucun Set-Cookie, Spring non rappelé',
    res.status === 200 &&
      JSON.stringify(corps) === '{"discord":true}' &&
      res.headers.get('cache-control') === 'public, max-age=60' &&
      res.headers.get('x-cache') === 'HIT' &&
      res.headers.get('set-cookie') === null &&
      appelsProviders(avant).length === 0,
    `reçu ${res.status} ${JSON.stringify(corps)}, x-cache: ${res.headers.get('x-cache')}, set-cookie: ${res.headers.get('set-cookie')}, appels : ${JSON.stringify(appelsProviders(avant))}`,
  );

  // Le cookie n'a jamais atteint Spring sur ce chemin : la valeur ne dépend d'aucun joueur.
  verifier(
    'Spring n\'a reçu aucun cookie sur /api/auth/providers',
    recues.filter((r) => r.path === '/api/auth/providers').every((r) => r.cookie === ''),
    `appels : ${JSON.stringify(recues.filter((r) => r.path === '/api/auth/providers'))}`,
  );

  // Le relais, lui, reste ouvert sur ce chemin : seule la route du front est filtrée et mise en cache.
  avant = recues.length;
  res = await get('/api/auth/providers');
  corps = await res.json().catch(() => null);
  verifier(
    'GET /api/auth/providers → relayé à Spring (réponse brute)',
    res.status === 200 && corps?.extra === 'x' && appelsProviders(avant).length === 1,
    `reçu ${res.status} ${JSON.stringify(corps)}, ${appelsProviders(avant).length} appel(s) chez Spring`,
  );

  // Chemins réservés : 404 sans appeler Spring.
  for (const chemin of ['/api/_analog/x', '/api/ingest/x']) {
    const avant = recues.length;
    res = await get(chemin);
    verifier(
      `GET ${chemin} → 404, Spring n'est pas appelé`,
      res.status === 404 && recuesApres(avant).length === 0,
      `reçu ${res.status}, ${recuesApres(avant).length} appel(s) chez Spring`,
    );
  }

  // 5xx de Spring traduit en 502.
  res = await get('/api/panne');
  corps = await res.json().catch(() => null);
  verifier(
    'GET /api/panne (Spring 500) → 502 { message: "Erreur de l\'API" }',
    res.status === 502 && corps?.message === "Erreur de l'API",
    `reçu ${res.status} ${JSON.stringify(corps)}`,
  );

  // Route dédiée /api/face : passe avant le relais, valide avant d'appeler Spring.
  avant = recues.length;
  res = await get('/api/face');
  verifier(
    'GET /api/face sans sid → 400, Spring n\'est pas appelé',
    res.status === 400 && recuesApres(avant).length === 0,
    `reçu ${res.status}, ${recuesApres(avant).length} appel(s) chez Spring`,
  );
  avant = recues.length;
  res = await get('/api/face?sid=a/b&side=A');
  verifier(
    'GET /api/face?sid=a/b&side=A sans cookie → 401 (route dédiée, pas le relais)',
    res.status === 401 && recuesApres(avant).length === 0,
    `reçu ${res.status}, ${recuesApres(avant).length} appel(s) chez Spring`,
  );

  // Route privée : jamais en cache, cookie transmis.
  avant = recues.length;
  res = await get('/api/tableau-de-bord', { cookie: 'JSESSIONID=ok' });
  verifier(
    'GET /api/tableau-de-bord connecté → 200, cache-control private, no-store',
    res.status === 200 && res.headers.get('cache-control') === 'private, no-store',
    `reçu ${res.status}, cache-control: ${res.headers.get('cache-control')}`,
  );
  verifier(
    'GET /api/tableau-de-bord : le cookie arrive à Spring',
    recuesApres(avant).some((r) => r.path === '/api/summary' && r.cookie.includes('JSESSIONID=ok')),
    `appels reçus : ${JSON.stringify(recuesApres(avant))}`,
  );

  // Page connectée : redirection avant tout rendu.
  res = await get('/tableau-de-bord');
  verifier(
    'GET /tableau-de-bord sans cookie → 302 vers /login?redirect=%2Ftableau-de-bord',
    res.status === 302 && res.headers.get('location') === '/login?redirect=%2Ftableau-de-bord',
    `reçu ${res.status}, location: ${res.headers.get('location')}`,
  );
  res = await get('/tableau-de-bord', { cookie: 'JSESSIONID=panne' });
  verifier(
    'GET /tableau-de-bord, Spring en panne → 503',
    res.status === 503,
    `reçu ${res.status}`,
  );

  // Un .spec.ts ne devient pas une route : le chemin tombe dans le relais, donc chez Spring.
  avant = recues.length;
  await get('/api/relais.spec');
  verifier(
    'GET /api/relais.spec → relayé à Spring (nitro.ignore écarte les .spec.ts)',
    recuesApres(avant).some((r) => r.path === '/api/relais.spec'),
    `appels reçus : ${JSON.stringify(recuesApres(avant))}`,
  );

  // En dernier : épuise le quota du login pour cette adresse.
  const statuts = [];
  for (let i = 0; i < 11; i++) {
    const r = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.7', 'content-type': 'application/json' },
      body: '{}',
    });
    statuts.push(r.status);
  }
  verifier(
    'POST /api/auth/login ×11 (même adresse) → le 11e répond 429',
    statuts[10] === 429 && statuts.slice(0, 10).every((s) => s !== 429),
    `statuts : ${statuts.join(', ')}`,
  );
}

// --- Lancement --------------------------------------------------------------------------------

async function attendreHealth(base) {
  const limite = Date.now() + DELAI_DEMARRAGE_MS;
  while (Date.now() < limite) {
    if (serveur.exitCode !== null) throw new Error(`le serveur s'est arrêté (code ${serveur.exitCode})`);
    try {
      if ((await fetch(`${base}/health`)).status === 200) return;
    } catch {
      // pas encore prêt
    }
    await new Promise((ok) => setTimeout(ok, 200));
  }
  throw new Error(`/health ne répond pas après ${DELAI_DEMARRAGE_MS / 1000} s`);
}

let code = 0;
try {
  await new Promise((ok) => springFactice.listen(0, '127.0.0.1', ok));
  const portSpring = springFactice.address().port;
  const port = await portLibre();
  const base = `http://127.0.0.1:${port}`;

  serveur = spawn('node', [SERVEUR], {
    env: {
      ...process.env,
      NITRO_API_URL: `http://127.0.0.1:${portSpring}`,
      // Nitro lit NITRO_PORT puis PORT : on pose les deux.
      PORT: String(port),
      NITRO_PORT: String(port),
      NITRO_HOST: '127.0.0.1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serveur.stdout.on('data', (d) => (sortie += d));
  serveur.stderr.on('data', (d) => (sortie += d));

  await attendreHealth(base);
  await lancerEssais(base);
  console.log('✓ Serveur construit : tous les cas passent.');
} catch (e) {
  code = 1;
  if (e.message !== 'cas en échec') console.error(`✗ Serveur construit : ${e.message}`);
  if (serveur && sortie) console.error(`--- sortie du serveur ---\n${sortie.trim()}`);
} finally {
  serveur?.kill();
  springFactice.closeAllConnections();
  await new Promise((ok) => springFactice.close(ok));
}
process.exit(code);
