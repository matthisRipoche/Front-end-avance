import type { H3Event } from 'h3';
import { defineCachedFunction } from 'nitropack/runtime';

import { callSpring } from './spring';

/** Fournisseurs de connexion proposés par Spring (contrat du front, en liste blanche). */
export interface Fournisseurs {
  discord: boolean;
}

/** Valeur lue dans le cache, et d'où elle vient (en-tête `x-cache` de la route). */
export interface FournisseursServis {
  fournisseurs: Fournisseurs;
  /** HIT : servie par le cache ; MISS : Spring a été appelé pour elle ; STALE : périmée, rafraîchie en arrière-plan. */
  etat: 'HIT' | 'MISS' | 'STALE';
}

/**
 * Liste blanche : seul `discord === true` (booléen strict) l'active. Un champ en trop, `"true"`,
 * `null` ou une réponse inattendue ne fuient pas vers le navigateur et ne donnent que `false`.
 */
export function versFournisseurs(brut: unknown): Fournisseurs {
  const champs = brut as { discord?: unknown } | null | undefined;
  return { discord: champs?.discord === true };
}

// Compteurs d'appels réels au chargeur : ils servent à deviner hit/miss/stale (voir servirFournisseurs).
let debuts = 0;
let fins = 0;

/**
 * Interroge Spring, sans cookie : la réponse est la même pour tous les joueurs.
 *
 * Elle lève l'erreur déjà traduite par callSpring et ne renvoie JAMAIS un repli `{ discord: false }` :
 * defineCachedFunction enregistre toute valeur renvoyée, un repli resterait servi 5 minutes et
 * cacherait le bouton Discord après une simple panne de Spring. Une exception, elle, n'est pas
 * enregistrée : le cache garde son ancienne valeur (swr) ou rappelle Spring à la requête suivante.
 */
export async function chargerFournisseursSansCache(event: H3Event): Promise<Fournisseurs> {
  debuts++;
  try {
    const brut = await callSpring<unknown>(event, '/api/auth/providers', {
      transmettreCookie: false,
      timeoutMs: 2000,
    });
    return versFournisseurs(brut);
  } finally {
    fins++;
  }
}

/**
 * Même chargeur, mis en cache 5 minutes avec stale-while-revalidate.
 *
 * Clé fixe : la valeur ne dépend ni du cookie ni de la query. Une clé dérivée de la requête (le
 * défaut de Nitro hache les arguments, donc l'event) créerait une entrée par visiteur.
 */
const chargerEnCache = defineCachedFunction(chargerFournisseursSansCache, {
  name: 'fournisseurs',
  getKey: () => 'fournisseurs',
  maxAge: 300,
  swr: true,
});

/**
 * Renvoie les fournisseurs et l'état du cache. Nitro ne dit pas d'où vient la valeur : on compare
 * les compteurs d'appels réels au chargeur. Aucun appel : HIT. Appel terminé avant le retour : MISS
 * (rien en cache, on a attendu Spring). Appel encore en cours : STALE (valeur périmée servie pendant
 * le rafraîchissement). Indicatif : des requêtes simultanées peuvent fausser l'étiquette, jamais la valeur.
 */
export async function chargerFournisseurs(event: H3Event): Promise<FournisseursServis> {
  const debutsAvant = debuts;
  const finsAvant = fins;
  const fournisseurs = await chargerEnCache(event);
  if (debuts === debutsAvant) return { fournisseurs, etat: 'HIT' };
  return { fournisseurs, etat: fins > finsAvant ? 'MISS' : 'STALE' };
}
