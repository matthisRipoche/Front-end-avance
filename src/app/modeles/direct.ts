/*
 * Contrat du flux « en jeu » entre le serveur Nitro (`GET /api/direct`) et la page. TypeScript pur :
 * importé par Angular et par Nitro, sans Angular ni h3.
 */

/** Adresse du flux Server-Sent Events relayé par Nitro. */
export const ADRESSE_FLUX_DIRECT = '/api/direct';

/** Nom de l'événement SSE ; son `data` est un JSON `EnJeu | null` (null : plus de partie en cours). */
export const EVENEMENT_EN_JEU = 'en-jeu';
