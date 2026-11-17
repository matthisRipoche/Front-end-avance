import { createError, getQuery, parseCookies, type H3Event } from 'h3';

import type { LiveSnapshot } from '../../app/modeles/live';
import type { FaceProgress, Summary } from '../../app/modeles/summary';
import type { FaceProgression, TableauDeBord } from '../../app/modeles/tableau-de-bord';
import { callSpring } from './spring';

/** Fuseau retenu quand ni la requête ni le cookie n'en donnent un valide : le public du site. */
export const FUSEAU_PAR_DEFAUT = 'Europe/Paris';

/** Au-delà, ce n'est pas un nom de fuseau : inutile de le soumettre à `Intl`. */
const LONGUEUR_MAX_FUSEAU = 64;

/** `/api/live` est accessoire : le tableau de bord ne l'attend pas plus longtemps. */
const DELAI_LIVE_MS = 2000;

/**
 * Forme canonique d'un fuseau IANA (`europe/paris` → `Europe/Paris`), ou null s'il est inconnu.
 *
 * `Intl` fait foi : c'est la base de fuseaux de Node, sans liste à maintenir ici. La forme
 * canonique part chez Spring et revient dans la réponse, pour que la page affiche le même nom.
 */
export function fuseauValide(valeur: unknown): string | null {
  if (typeof valeur !== 'string' || valeur.length === 0 || valeur.length > LONGUEUR_MAX_FUSEAU) return null;
  // Node accepte aussi des décalages (`+01:00`, `+18:30`) : ce ne sont pas des noms IANA, et Spring
  // (`ZoneId.of`) refuse ceux au-delà de ±18:00. On s'en tient aux noms, comme le dit le message.
  if (/^[+-]/.test(valeur)) return null;
  try {
    return new Intl.DateTimeFormat('en', { timeZone: valeur }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

/**
 * Fuseau dans lequel couper les jours : `?tz=` d'abord, puis le cookie `tz`, puis Europe/Paris.
 *
 * Un `?tz=` invalide (même vide) est une erreur de l'appelant : 400, plutôt qu'un tableau de bord
 * calculé en silence dans un autre fuseau. Un cookie invalide, lui, est ignoré : le joueur ne l'a
 * pas écrit à la main et ne doit pas se retrouver bloqué par un vieux cookie.
 */
export function fuseauDe(event: H3Event): string {
  const query = getQuery(event);
  if ('tz' in query) {
    const fuseau = fuseauValide(query['tz']);
    if (!fuseau) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Le fuseau horaire doit être un nom IANA, par exemple Europe/Paris.',
      });
    }
    return fuseau;
  }
  return fuseauValide(parseCookies(event)['tz']) ?? FUSEAU_PAR_DEFAUT;
}

/**
 * Appelle `/api/summary` et `/api/live` en parallèle, au nom du joueur de la requête, et renvoie
 * le tableau de bord.
 *
 * Le direct n'est qu'un plus (« en jeu ») : s'il échoue ou tarde plus de 2 s, `enJeu` vaut null et
 * le reste s'affiche. Le résumé est le cœur de la page : son erreur (déjà traduite par callSpring)
 * remonte telle quelle.
 */
export async function chargerTableauDeBord(event: H3Event, fuseau: string): Promise<TableauDeBord> {
  const [summary, live] = await Promise.all([
    callSpring<Summary>(event, '/api/summary', { query: { tz: fuseau } }),
    callSpring<LiveSnapshot>(event, '/api/live', { timeoutMs: DELAI_LIVE_MS }).catch(() => {
      // callSpring a déjà noté le statut de Spring ; on note seulement la conséquence.
      console.error('[tableau-de-bord] direct indisponible → enJeu: null');
      return null;
    }),
  ]);
  return versTableauDeBord(summary, live, fuseau);
}

/**
 * Met en forme les réponses de Spring pour la page. Fonction pure, en liste blanche : chaque champ
 * est recopié un par un, un champ ajouté un jour par Spring n'arrive pas au navigateur.
 */
export function versTableauDeBord(summary: Summary, live: LiveSnapshot | null, fuseau: string): TableauDeBord {
  const reprendre = summary.resume ? versFaceProgression(summary.resume) : null;
  const jours = summary.activity.map((jour) => ({
    jour: jour.day,
    tentatives: jour.attempts,
    deathless: jour.clears,
  }));
  const max = jours.reduce((plusGrand, jour) => Math.max(plusGrand, jour.tentatives), 0);
  const plusTravaillee = summary.today.mostPlayed;
  const enCours = live?.current ?? null;

  return {
    fuseau,
    reprendre,
    aujourdhui: {
      tentatives: summary.today.attempts,
      deathless: summary.today.clears,
      plusLongueMs: summary.today.bestAttemptMs,
      plusTravaillee: plusTravaillee
        ? {
            sid: plusTravaillee.sid,
            side: plusTravaillee.side,
            nom: nomDeFace(plusTravaillee.mapName, plusTravaillee.sid),
            tentatives: plusTravaillee.attempts,
          }
        : null,
    },
    recentes: summary.recent.map(versFaceProgression),
    activite: { jours, max },
    enJeu: enCours
      ? {
          sid: enCours.sid,
          side: enCours.side,
          nom: nomDeFace(enCours.mapName, enCours.sid),
          room: enCours.room,
          debut: enCours.startedAt,
        }
      : null,
    // Nouveau joueur : rien à reprendre et aucune tentative sur les 14 jours.
    vide: reprendre === null && max === 0,
  };
}

function versFaceProgression(face: FaceProgress): FaceProgression {
  return {
    sid: face.sid,
    side: face.side,
    nom: nomDeFace(face.mapName, face.sid),
    tentatives: face.attempts,
    deathless: face.clears,
    dernierePartie: face.lastPlayedAt,
    roomsAtteintes: face.bestRooms,
    roomsVues: face.knownRooms,
    progression: face.knownRooms > 0 ? face.bestRooms / face.knownRooms : null,
  };
}

/**
 * Nom affiché d'une face : celui que le mod a envoyé, sinon le dernier segment du SID
 * (`Celeste/1-ForsakenCity` → `1-ForsakenCity`), plus lisible que le SID entier.
 */
function nomDeFace(mapName: string | null, sid: string): string {
  if (mapName) return mapName;
  return sid.split('/').filter(Boolean).pop() ?? sid;
}
