import { defineEventHandler } from 'h3';
import process from 'node:process';

/**
 * Contrôle de santé : GET /health.
 * Appelé par Docker (HEALTHCHECK du Dockerfile) et par la CI après chaque déploiement
 * pour savoir si le serveur Node répond.
 * Contrôle de vivacité seulement : ne dépend pas de l'API Spring.
 */
export default defineEventHandler(() => {
  return { status: 'ok', uptime: process.uptime() }
});
