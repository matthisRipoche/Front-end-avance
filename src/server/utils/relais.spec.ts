// @vitest-environment node
import { vi } from 'vitest';

import { cibleSpring } from './relais';

const config = { apiUrl: 'http://spring.test:5000' };
vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: () => config }));

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
