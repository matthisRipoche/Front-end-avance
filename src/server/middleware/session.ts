import { defineEventHandler } from 'h3';

import { gererSession } from '../utils/session';

/**
 * Session vérifiée auprès de Spring avant le rendu des pages (logique : utils/session.ts).
 *
 * Pourquoi un middleware : il passe avant tout rendu Angular, donc une page connectée sans session
 * est redirigée vers /login avant que le moindre HTML parte, sans clignotement.
 *
 * Les pages prérendues (/, /faq, /mod, /confidentialite) sont servies comme fichiers statiques avant
 * les middlewares en production : elles ne passent pas ici, et c'est voulu, elles n'ont pas de compte.
 *
 * Un middleware qui renvoie une valeur termine la requête : c'est le cas du 302 et du 503 ;
 * sinon gererSession renvoie undefined et la requête continue vers le rendu.
 *
 * Pas de test dans ce dossier : en dev, Analog charge tout .ts d'ici comme middleware.
 * Les tests sont dans utils/session.spec.ts.
 */
export default defineEventHandler(gererSession);
