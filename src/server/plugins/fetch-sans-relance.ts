import { defineNitroPlugin } from 'nitropack/runtime';

/**
 * Appels internes sans relance automatique.
 *
 * Pendant le rendu serveur, Analog appelle nos routes `/api/…` avec `globalThis.$fetch.raw`
 * (`requestContextInterceptor`), sans option `retry`. Or ofetch relance par défaut une fois un
 * GET qui répond 408, 409, 425, 429, 500, 502, 503 ou 504. Quand Spring tombait en erreur, la route
 * du tableau de bord était donc appelée deux fois, et Spring aussi ; si Spring était seulement lent,
 * le rendu attendait deux fois le délai de 5 s. Constaté avec un faux Spring en 500 (issue #25).
 *
 * Une erreur de nos routes est déjà traduite (502, 503) : la relancer n'apporte rien. Nitro pose
 * `globalThis.$fetch` avant d'exécuter les plugins ; on le remplace par la même instance, réglée
 * sans relance (`create` garde la base et la fonction `fetch` interne de Nitro).
 */
export default defineNitroPlugin(() => {
  globalThis.$fetch = globalThis.$fetch.create({ retry: 0 });
});
