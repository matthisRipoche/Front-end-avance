import { deleteCookie, getRequestProtocol, parseCookies, setCookie, type H3Event } from 'h3';

import { cheminDeRetour } from '../../app/auth/retour';

/** Nom du cookie qui garde la page demandée pendant l'aller-retour chez Discord. */
export const COOKIE_RETOUR = 'retour-connexion';

/** Dix minutes : le temps d'autoriser l'application sur Discord, pas davantage. */
const DUREE_S = 600;

/**
 * Attributs communs à la pose et à l'effacement : un cookie ne s'efface que si on le désigne
 * avec le même chemin.
 *
 * - HttpOnly : aucun script de la page n'a à le lire ;
 * - SameSite=Lax : le retour de Discord est une navigation venue d'un autre site, le cookie doit
 *   l'accompagner ; Strict le retiendrait ;
 * - Secure seulement en https, sinon le navigateur le refuserait en local (http://localhost).
 *   Derrière Traefik, la requête arrive en http avec `X-Forwarded-Proto: https`, que h3 lit.
 */
function attributs(event: H3Event) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: getRequestProtocol(event) === 'https',
  };
}

/**
 * Retient la page où renvoyer le joueur après la connexion par Discord.
 *
 * Le chemin passe par `cheminDeRetour` avant d'être écrit : jamais d'adresse externe gardée.
 * Pour l'accueil (ou une valeur refusée, ou rien), rien n'est posé : c'est déjà la page par défaut
 * au retour. Un cookie laissé par une tentative abandonnée est alors effacé : sinon il renverrait
 * le joueur, au retour de cette connexion-ci, vers la page d'une connexion précédente.
 */
export function poserRetourConnexion(event: H3Event, redirect: string | null | undefined): void {
  const chemin = cheminDeRetour(redirect);
  if (chemin === '/') {
    // Seulement s'il existe : pas de Set-Cookie inutile sur chaque départ vers Discord.
    if (parseCookies(event)[COOKIE_RETOUR] !== undefined) effacerRetourConnexion(event);
    return;
  }
  setCookie(event, COOKIE_RETOUR, chemin, { ...attributs(event), maxAge: DUREE_S });
}

/**
 * Page retenue par le cookie, ou `null` s'il n'y en a pas.
 *
 * Revalidée à la lecture : le cookie vient du navigateur, qui peut l'avoir écrit lui-même.
 */
export function lireRetourConnexion(event: H3Event): string | null {
  const valeur = parseCookies(event)[COOKIE_RETOUR];
  return valeur ? cheminDeRetour(valeur) : null;
}

/** Efface le cookie : il ne sert qu'une fois. */
export function effacerRetourConnexion(event: H3Event): void {
  deleteCookie(event, COOKIE_RETOUR, attributs(event));
}
