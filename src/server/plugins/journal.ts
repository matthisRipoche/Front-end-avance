import type { H3Event } from 'h3';
import { defineNitroPlugin } from 'nitropack/runtime';

/**
 * Journal des requêtes : une ligne par requête sur la sortie standard (lue par `docker logs`).
 *
 *   [req] GET /faq 200 12ms
 *
 * Pourquoi un plugin et pas un middleware (src/server/middleware/) : en production, Nitro place
 * son gestionnaire de fichiers statiques AVANT les middlewares. Les pages prérendues (/, /faq…)
 * et les JS/CSS partiraient sans passer par un middleware, donc sans ligne. Le hook `request`
 * est appelé par Nitro avant tout gestionnaire, statique compris.
 *
 * À ce moment le statut n'est pas connu : on note l'heure de départ, et la ligne s'écrit quand
 * Node a fini d'envoyer la réponse (événement `finish`), statut et durée alors définitifs.
 *
 * Ce qui n'est jamais écrit : la query (un retour OAuth y porte un code à usage unique), les
 * cookies, les en-têtes et les corps (un mot de passe passe dans le corps du login).
 *
 * Le contrôle de santé de Docker appelle /health toutes les 30 s : il n'est journalisé qu'en cas
 * d'échec, pour ne pas noyer le reste.
 *
 * En `npm run dev`, Vite sert lui-même les pages et ne passe à Nitro que /api/** : seules ces
 * requêtes apparaissent alors. C'est le serveur construit (`npm run preview`, Docker) qui compte.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', suivreRequete);
});

/** Branche le journal sur la réponse Node de la requête. Exportée pour les tests. */
export function suivreRequete(event: H3Event): void {
  const debut = performance.now();
  const methode = event.method;
  const chemin = event.path.split('?')[0];
  const res = event.node.res;

  res.once('finish', () => {
    if (chemin === '/health' && res.statusCode < 400) return;
    console.log(ligneJournal(methode, chemin, res.statusCode, performance.now() - debut));
  });
  // Connexion fermée avant que la réponse soit terminée (navigateur parti, relais coupé) : on le
  // dit au lieu d'afficher un statut qui n'a peut-être jamais atteint le client. `writableEnded`
  // et non un drapeau posé par `finish` : pendant le prérendu, `close` arrive avant `finish`
  // pour une réponse complète.
  res.once('close', () => {
    if (!res.writableEnded) {
      console.log(ligneJournal(methode, chemin, 'interrompue', performance.now() - debut));
    }
  });
}

export function ligneJournal(
  methode: string,
  chemin: string,
  statut: number | 'interrompue',
  dureeMs: number,
): string {
  return `[req] ${methode} ${chemin} ${statut} ${Math.round(dureeMs)}ms`;
}
