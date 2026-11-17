/** Page où arriver après la connexion quand aucune page n'a été demandée. */
export const RETOUR_PAR_DEFAUT = '/';

/**
 * Adresse où renvoyer le joueur après la connexion, lue dans `?redirect=`.
 *
 * Seul un chemin interne au site est accepté (`/mes-maps?face=…`) : une adresse vers un autre site
 * ferait de la page de connexion une redirection ouverte, utile pour l'hameçonnage
 * (« connecte-toi » puis renvoi vers un faux site). `//autre.fr` et `/\autre.fr` sont des adresses
 * externes pour le navigateur, donc refusées aussi.
 */
export function cheminDeRetour(redirect: string | null | undefined): string {
  if (!redirect || !redirect.startsWith('/')) return RETOUR_PAR_DEFAUT;
  if (redirect.startsWith('//') || redirect.startsWith('/\\')) return RETOUR_PAR_DEFAUT;
  // Caractères de contrôle (tabulation, retour à la ligne) : le navigateur les retire, ce qui
  // pourrait reformer `//` après notre contrôle.
  if (/[\u0000-\u001f\u007f]/.test(redirect)) return RETOUR_PAR_DEFAUT;
  // Ne jamais revenir sur la page de connexion elle-même.
  if (estPageConnexion(redirect)) return RETOUR_PAR_DEFAUT;
  return redirect;
}

/** L'adresse est-elle celle de la page de connexion (avec ou sans query, fragment, slash final) ? */
export function estPageConnexion(url: string): boolean {
  return /^\/login(?:[/?#]|$)/.test(url);
}
