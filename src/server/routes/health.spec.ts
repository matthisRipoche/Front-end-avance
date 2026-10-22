import type { H3Event } from 'h3';

import health from './health';

type Health = { status: string; uptime: number };

describe('GET /health', () => {
  // La route n'utilise pas la requête : un événement vide suffit pour l'appeler directement.
  // `as unknown as Health` : le test compile même tant que la route ne renvoie rien.
  const response = () => health({} as H3Event) as unknown as Health;

  it('répond status ok', () => {
    expect(response()).toMatchObject({ status: 'ok' });
  });

  it('donne le temps écoulé depuis le démarrage, en secondes', () => {
    const { uptime } = response();
    expect(typeof uptime).toBe('number');
    expect(uptime).toBeGreaterThanOrEqual(0);
  });
});
