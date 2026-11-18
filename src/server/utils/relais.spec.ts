// @vitest-environment node
import { createApp, eventHandler, toWebHandler } from 'h3';
import { vi } from 'vitest';

import { cibleSpring, enTetesOrigine, locationRelative } from './relais';

vi.stubEnv('NITRO_API_URL', 'http://spring.test:5000');

describe('cibleSpring : adresse Spring d’une requête /api', () => {
  it.each([
    ['/api/x/%2e%2e/ingest/a', 'remontée encodée vers /api/ingest'],
    ['/api/x/%2E%2E/ingest/a', 'remontée encodée en majuscules'],
    ['/api/%2e%2e/actuator/health', 'sortie de /api encodée'],
    ['/api/x/../ingest/a', 'remontée en clair vers /api/ingest'],
    ['/api/../actuator/health', 'sortie de /api en clair'],
    ['/api/%69ngest/a', 'préfixe réservé encodé'],
    ['/api/x%2F..%2Fingest', 'remontée cachée derrière des barres encodées'],
    ['/api/ingest', 'préfixe réservé au mod'],
    ['/api/ingest?x=1', 'préfixe réservé au mod, avec query'],
    ['/api/_analog/x', 'point d’entrée interne d’Analog'],
    ['/api/%zz', 'encodage invalide'],
    ['//evil.test/api/x', 'autre hôte'],
  ])('refuse %s (%s)', (path) => {
    expect(cibleSpring(path)).toBeNull();
  });

  it('autorise /api/ingestion, qui n’est pas le préfixe réservé au mod', () => {
    expect(cibleSpring('/api/ingestion')?.href).toBe('http://spring.test:5000/api/ingestion');
  });

  it('conserve l’encodage du SID dans la query', () => {
    expect(cibleSpring('/api/faces/detail?sid=Celeste%2F1-ForsakenCity&side=A')?.href).toBe(
      'http://spring.test:5000/api/faces/detail?sid=Celeste%2F1-ForsakenCity&side=A',
    );
  });
});

describe('enTetesOrigine : adresse publique du front transmise à Spring', () => {
  /** Requête reçue par Nitro, avec ses en-têtes ; renvoie les en-têtes calculés. */
  const origineDe = async (headers: Record<string, string>) => {
    const app = createApp().use(eventHandler((event) => enTetesOrigine(event)));
    const res = await toWebHandler(app)(new Request('http://localhost/api/x', { headers }));
    return res.json();
  };

  it('reprend les X-Forwarded-* posés par Traefik', async () => {
    expect(
      await origineDe({
        host: 'celeste-next-web-1:3000',
        'x-forwarded-host': 'new-celeste.matthisripoche.com',
        'x-forwarded-proto': 'https',
      }),
    ).toEqual({
      'x-forwarded-host': 'new-celeste.matthisripoche.com',
      'x-forwarded-proto': 'https',
      'x-forwarded-port': '443',
    });
  });

  it('déduit tout de Host sans proxy devant (dev)', async () => {
    expect(await origineDe({ host: 'localhost:5173' })).toEqual({
      'x-forwarded-host': 'localhost:5173',
      'x-forwarded-proto': 'http',
      'x-forwarded-port': '5173',
    });
  });

  it('prend le port par défaut du protocole quand l’hôte n’en a pas', async () => {
    expect(await origineDe({ host: 'exemple.fr' })).toMatchObject({ 'x-forwarded-port': '80' });
  });

  it('lit le port d’une adresse IPv6 entre crochets', async () => {
    expect(await origineDe({ host: '[::1]:5173' })).toMatchObject({ 'x-forwarded-port': '5173' });
    expect(await origineDe({ host: '[::1]' })).toMatchObject({ 'x-forwarded-port': '80' });
  });

  it('garde le premier hôte d’une liste de X-Forwarded-Host', async () => {
    expect(
      await origineDe({ host: 'interne', 'x-forwarded-host': 'new-celeste.matthisripoche.com, autre' }),
    ).toMatchObject({ 'x-forwarded-host': 'new-celeste.matthisripoche.com' });
  });
});

describe('locationRelative : redirection de Spring vue du navigateur', () => {
  const origines = ['http://spring.test:5000/', 'https://new-celeste.matthisripoche.com'];

  it('réécrit une adresse de Spring en chemin relatif, query comprise', () => {
    expect(locationRelative('http://spring.test:5000/login?discord=ok', origines)).toBe(
      '/login?discord=ok',
    );
  });

  it('réécrit une adresse absolue du front, port par défaut compris', () => {
    expect(
      locationRelative('https://new-celeste.matthisripoche.com:443/login?discord=erreur', origines),
    ).toBe('/login?discord=erreur');
  });

  it.each([
    ['http://spring.test:5000//evil.fr/x', 'double barre'],
    ['http://spring.test:5000/\\evil.fr', 'barre puis barre oblique inverse'],
  ])('laisse intacte %s (%s), qui deviendrait une adresse externe', (location) => {
    expect(locationRelative(location, origines)).toBe(location);
  });

  it('laisse intacte une adresse de Discord', () => {
    const discord = 'https://discord.com/oauth2/authorize?client_id=1&state=etat';
    expect(locationRelative(discord, origines)).toBe(discord);
  });

  it('laisse intacte une adresse sur un autre port de Spring', () => {
    expect(locationRelative('http://spring.test:8080/login', origines)).toBe(
      'http://spring.test:8080/login',
    );
  });

  it('laisse intacte une Location déjà relative', () => {
    expect(locationRelative('/login?discord=ok', origines)).toBe('/login?discord=ok');
  });
});
