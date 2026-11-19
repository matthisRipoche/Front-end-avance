// @vitest-environment node
import { once } from 'node:events';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import { createApp, createRouter, defineEventHandler, toNodeListener } from 'h3';

import { relayerFluxDirect } from '../../utils/flux-direct';
import direct from './direct.get';

const COOKIE = 'JSESSIONID=secret-session';

const snapshot = (current: unknown) => `event:snapshot\ndata:${JSON.stringify({ active: true, session: null, current, serverTime: 1 })}\n\n`;
const PARTIE = { id: 1, sid: 'Celeste/1-ForsakenCity', side: 'A', mapName: null, room: 'a-03', startedAt: 10, lastEventAt: 20, deaths: 2, roomsVisited: 1 };
const EN_JEU = { sid: 'Celeste/1-ForsakenCity', side: 'A', nom: '1-ForsakenCity', room: 'a-03', debut: 10 };

interface Serveur {
  port: number;
  fermer: () => Promise<void>;
}

async function ecouter(gestionnaire: Parameters<typeof createServer>[1]): Promise<Serveur & { serveur: Server }> {
  const serveur = createServer(gestionnaire).listen(0);
  await once(serveur, 'listening');
  return {
    serveur,
    port: (serveur.address() as AddressInfo).port,
    fermer: () => {
      serveur.closeAllConnections();
      return new Promise<void>((r) => serveur.close(() => r()));
    },
  };
}

let spring: Serveur;
let front: Serveur;
/** Comportement du faux Spring, changé par chaque test. */
let reponseSpring: (req: IncomingMessage, res: ServerResponse) => void;
let appels: IncomingMessage[];
let erreurs: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  appels = [];
  erreurs = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  spring = await ecouter((req, res) => {
    appels.push(req);
    reponseSpring(req, res);
  });
  vi.stubEnv('NITRO_API_URL', `http://127.0.0.1:${spring.port}`);
  front = await ecouter(toNodeListener(createApp().use(createRouter().get('/api/direct', direct))));
});

afterEach(async () => {
  await front.fermer();
  await spring.fermer();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const SSE = { 'content-type': 'text/event-stream' };

/** Ouvre le flux et renvoie la réponse sans attendre la fin du corps. */
function ouvrir(cookie: string | null = COOKIE) {
  return fetch(`http://127.0.0.1:${front.port}/api/direct`, { headers: cookie ? { cookie } : {} });
}

/** Lit le corps jusqu'à ce que `motif` apparaisse. */
async function lireJusqua(res: Response, motif: string): Promise<string> {
  const lecteur = res.body!.getReader();
  const decodeur = new TextDecoder();
  let texte = '';
  while (!texte.includes(motif)) {
    const { done, value } = await lecteur.read();
    if (done) break;
    texte += decodeur.decode(value, { stream: true });
  }
  lecteur.releaseLock();
  return texte;
}

describe('GET /api/direct : refus', () => {
  it('répond 401 sans cookie de session, sans appeler Spring', async () => {
    reponseSpring = (_req, res) => res.end();
    const res = await ouvrir(null);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: 'Connexion requise' });
    expect(appels).toHaveLength(0);
  });

  it.each([
    [401, 401, 'Connexion requise'],
    [403, 403, 'Accès refusé'],
    [500, 502, "Erreur de l'API"],
  ])('traduit le %i de Spring en %i', async (statut, attendu, message) => {
    reponseSpring = (_req, res) => {
      res.writeHead(statut, { 'content-type': 'application/json' }).end('{"trace":"interne"}');
    };
    const res = await ouvrir();
    expect(res.status).toBe(attendu);
    expect(await res.json()).toEqual({ message });
  });

  it('traduit une réponse qui n’est pas un flux en 502', async () => {
    reponseSpring = (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' }).end('<html>');
    };
    expect((await ouvrir()).status).toBe(502);
  });

  it('répond 503 quand Spring est injoignable', async () => {
    await spring.fermer();
    reponseSpring = () => undefined;
    const res = await ouvrir();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ message: 'API indisponible' });
    spring = await ecouter(() => undefined); // pour afterEach
  });

  it('répond 503 quand Spring tarde à envoyer ses en-têtes', async () => {
    await front.fermer();
    const router = createRouter().get(
      '/api/direct',
      defineEventHandler((event) => relayerFluxDirect(event, { delaiEnTetesMs: 100 })),
    );
    front = await ecouter(toNodeListener(createApp().use(router)));
    reponseSpring = () => undefined; // n'écrit rien
    const res = await ouvrir();
    expect(res.status).toBe(503);
  });
});

describe('GET /api/direct : flux', () => {
  it('envoie les en-têtes SSE, sans rien recopier de Spring, et le premier en-jeu pendant que Spring garde le flux ouvert', async () => {
    reponseSpring = (_req, res) => {
      res.writeHead(200, { ...SSE, 'set-cookie': 'JSESSIONID=autre; Path=/', 'x-secret': 'oui' });
      res.write(snapshot(PARTIE)); // le flux reste ouvert
    };
    const res = await ouvrir();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    expect(res.headers.get('cache-control')).toBe('private, no-store, no-transform');
    expect(res.headers.get('x-accel-buffering')).toBe('no');
    expect(res.headers.get('vary')).toBe('Cookie');
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(res.headers.get('x-secret')).toBeNull();

    const texte = await lireJusqua(res, '}\n\n');
    expect(texte).toContain('retry: 5000\n\n');
    expect(texte).toContain(`event: en-jeu\ndata: ${JSON.stringify(EN_JEU)}`);
    await res.body!.cancel();
  });

  it('transmet à Spring tout le cookie (JSESSIONID et XSRF-TOKEN) et l’en-tête accept', async () => {
    reponseSpring = (_req, res) => {
      res.writeHead(200, SSE);
      res.write(snapshot(null));
    };
    const res = await ouvrir(`${COOKIE}; XSRF-TOKEN=x`);
    await lireJusqua(res, 'en-jeu');
    expect(appels[0].url).toBe('/api/live/stream');
    expect(appels[0].headers.cookie).toBe(`${COOKIE}; XSRF-TOKEN=x`);
    expect(appels[0].headers.accept).toBe('text/event-stream');
    await res.body!.cancel();
  });

  it('ne réémet pas un état identique, mais envoie le changement et le retour à null', async () => {
    reponseSpring = (_req, res) => {
      res.writeHead(200, SSE);
      res.write(snapshot(PARTIE));
      res.write(snapshot({ ...PARTIE, deaths: 9, lastEventAt: 99 })); // même EnJeu
      res.write(snapshot({ ...PARTIE, room: 'a-04' }));
      res.write(snapshot(null));
      res.end();
    };
    const res = await ouvrir();
    const texte = await res.text();
    const donnees = [...texte.matchAll(/event: en-jeu\ndata: (.*)\n/g)].map((m) => JSON.parse(m[1]));
    expect(donnees).toEqual([EN_JEU, { ...EN_JEU, room: 'a-04' }, null]);
  });

  it('relaie les commentaires en ping et ignore un événement illisible', async () => {
    reponseSpring = (_req, res) => {
      res.writeHead(200, SSE);
      res.write(':ping\n\n');
      res.write('event:snapshot\ndata:{pas du json\n\n');
      res.write(snapshot(PARTIE));
      res.end();
    };
    const texte = await (await ouvrir()).text();
    expect(texte).toContain(': ping\n\n');
    expect(texte).toContain('event: en-jeu');
    expect(erreurs).toHaveBeenCalledWith('[direct] événement illisible ignoré');
  });

  it('termine le flux quand Spring le termine', async () => {
    reponseSpring = (_req, res) => {
      res.writeHead(200, SSE);
      res.end(snapshot(null));
    };
    const texte = await (await ouvrir()).text();
    expect(texte).toContain('event: en-jeu\ndata: null');
  });

  it('coupe le navigateur quand Spring casse en cours de flux', async () => {
    reponseSpring = (_req, res) => {
      res.writeHead(200, SSE);
      res.write(snapshot(PARTIE));
      setTimeout(() => res.destroy(), 50);
    };
    const res = await ouvrir();
    await expect(res.text()).rejects.toThrow();
    expect(erreurs).toHaveBeenCalledWith(expect.stringContaining('réponse interrompue'));
  });

  it('abandonne la requête Spring en moins d’une seconde quand le client part, sans erreur journalisée', async () => {
    let fermeture!: () => void;
    const fermee = new Promise<void>((r) => (fermeture = r));
    reponseSpring = (_req, res) => {
      res.on('close', fermeture);
      res.writeHead(200, SSE);
      res.write(snapshot(PARTIE));
    };
    const res = await ouvrir();
    await lireJusqua(res, 'en-jeu');
    await res.body!.cancel();
    await Promise.race([
      fermee,
      new Promise((_, rejet) => setTimeout(() => rejet(new Error('Spring n’a pas vu la fermeture')), 1000)),
    ]);
    await new Promise(setImmediate); // laisse le relais finir son nettoyage avant de vérifier le journal
    expect(erreurs).not.toHaveBeenCalled();
  });

  it('coupe le navigateur après un silence prolongé de Spring', async () => {
    await front.fermer();
    const router = createRouter().get(
      '/api/direct',
      defineEventHandler((event) => relayerFluxDirect(event, { silenceMaxMs: 150 })),
    );
    front = await ecouter(toNodeListener(createApp().use(router)));
    reponseSpring = (_req, res) => {
      res.writeHead(200, SSE);
      res.write(snapshot(null)); // puis plus rien
    };
    const res = await ouvrir();
    await expect(res.text()).rejects.toThrow();
  });

  it('coupe le navigateur et journalise, sans contenu, quand Spring n’envoie jamais de ligne vide', async () => {
    await front.fermer();
    const router = createRouter().get(
      '/api/direct',
      defineEventHandler((event) => relayerFluxDirect(event, { tamponMaxCaracteres: 1000 })),
    );
    front = await ecouter(toNodeListener(createApp().use(router)));
    let fermeture!: () => void;
    const fermee = new Promise<void>((r) => (fermeture = r));
    reponseSpring = (_req, res) => {
      res.on('close', fermeture);
      res.writeHead(200, SSE);
      res.write(`data:${'x'.repeat(2000)}`); // jamais de \n\n
    };
    const res = await ouvrir();
    await expect(res.text()).rejects.toThrow();
    await Promise.race([
      fermee,
      new Promise((_, rejet) => setTimeout(() => rejet(new Error('Spring n’a pas vu la fermeture')), 1000)),
    ]);
    expect(erreurs).toHaveBeenCalledWith('[direct] GET /api/direct → événement trop volumineux');
    expect(String(erreurs.mock.calls)).not.toContain('xxxx');
  });
});
