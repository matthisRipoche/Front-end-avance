import { defineEventHandler, getRequestHeader, setResponseHeader, setResponseStatus, type H3Event } from 'h3';

import { creerLimiteur } from '../utils/limite-debit';
import { cibleSpring } from '../utils/relais';

/** Au plus 10 essais de connexion par minute et par adresse IP. */
export const MAX_ESSAIS = 10;
const limiteur = creerLimiteur({ max: MAX_ESSAIS, fenetreMs: 60_000 });

/**
 * Limitation de débit du login (piste E) : au-delà de MAX_ESSAIS par minute pour une même
 * adresse IP, POST /api/auth/login répond 429 sans appeler Spring.
 *
 * Un middleware passe avant toutes les routes, donc avant le relais /api. Le chemin comparé est
 * celui que Spring recevrait (`cibleSpring`) : /api/x/../auth/login ou /api/auth/%6Cogin sont
 * comptés aussi. Il est ensuite normalisé (casse, `//`, slash final) : selon sa version et sa
 * configuration, Spring pourrait traiter /api/auth/login/ comme le login, et compter une
 * variante en trop ne coûte rien.
 */
export default defineEventHandler((event) => {
  if (event.method !== 'POST' || !estLogin(event.path)) return;

  const resultat = limiteur.essayer(adresseClient(event));
  if (resultat.accepte) return;

  setResponseStatus(event, 429, 'Too Many Requests');
  setResponseHeader(event, 'retry-after', resultat.attenteS);
  return {
    message: `Trop de tentatives de connexion. Réessayez dans ${resultat.attenteS} s.`,
  };
});

function estLogin(path: string): boolean {
  const cible = cibleSpring(path);
  if (!cible) return false;
  try {
    const chemin = decodeURIComponent(cible.pathname)
      .toLowerCase()
      .replace(/\/{2,}/g, '/')
      .replace(/\/+$/, '');
    return chemin === '/api/auth/login';
  } catch {
    return false;
  }
}

/**
 * Adresse IP du navigateur. En production, Traefik est devant Node : la connexion vient de lui,
 * et l'adresse du client est dans X-Forwarded-For. Traefik n'accepte pas les X-Forwarded-For
 * envoyés par le client (aucune adresse de confiance n'est configurée) : il pose le sien. On lit
 * quand même la DERNIÈRE valeur, celle ajoutée par le proxy le plus proche, jamais la première,
 * qu'un client pourrait inventer pour changer de compteur à chaque essai.
 * Sans proxy (en local), l'en-tête peut être falsifié : sans conséquence hors production.
 */
export function adresseClient(event: H3Event): string {
  const relais = getRequestHeader(event, 'x-forwarded-for');
  const derniere = relais?.split(',').at(-1)?.trim();
  return derniere || event.node.req.socket?.remoteAddress || 'inconnue';
}
