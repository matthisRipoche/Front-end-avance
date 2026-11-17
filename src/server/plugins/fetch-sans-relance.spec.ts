// @vitest-environment node
import { createFetch } from 'ofetch';
import { vi } from 'vitest';

import fetchSansRelance from './fetch-sans-relance';

vi.mock('nitropack/runtime', () => ({ defineNitroPlugin: (f: unknown) => f }));

/** Un `$fetch` comme celui de Nitro, branché sur une fausse route qui répond toujours 502. */
const fetchDeNitro = () => {
  const appels = { nombre: 0 };
  const instance = createFetch({
    fetch: async () => {
      appels.nombre++;
      return new Response(JSON.stringify({ message: "Erreur de l'API" }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  return { instance, appels };
};

describe('Appels internes sans relance', () => {
  const avant = globalThis.$fetch;
  afterEach(() => {
    globalThis.$fetch = avant;
  });

  it('sans le plugin, ofetch relance une fois un GET en 502', async () => {
    const { instance, appels } = fetchDeNitro();

    await expect(instance('/api/tableau-de-bord')).rejects.toMatchObject({ status: 502 });
    expect(appels.nombre).toBe(2);
  });

  it('avec le plugin, un GET en 502 n’est appelé qu’une fois et l’erreur remonte telle quelle', async () => {
    const { instance, appels } = fetchDeNitro();
    globalThis.$fetch = instance as typeof globalThis.$fetch;

    (fetchSansRelance as unknown as () => void)();

    await expect(globalThis.$fetch.raw('/api/tableau-de-bord')).rejects.toMatchObject({ status: 502 });
    expect(appels.nombre).toBe(1);
  });
});
