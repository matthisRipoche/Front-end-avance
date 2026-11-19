import { defineEventHandler } from 'h3';

import { relayerFluxDirect } from '../../utils/flux-direct';

/**
 * Flux « en jeu » du joueur connecté (#34) : Server-Sent Events, un événement `en-jeu` à chaque
 * changement de la partie en cours. Toute la logique est dans utils/flux-direct.ts.
 */
export default defineEventHandler((event) => relayerFluxDirect(event));
