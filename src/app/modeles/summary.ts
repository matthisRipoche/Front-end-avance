/*
 * Miroir de `SummaryDtos.java` (API Spring) : réponse de `GET /api/summary?tz=…`. Noms de champs de
 * Spring, tels quels. Les jours sont coupés à minuit dans le fuseau `tz` demandé.
 * TypeScript pur : importé par Angular et par le serveur Nitro.
 */
import type { Side } from './face';

/**
 * Une face avec sa progression (`FaceProgress`). bestRooms = rooms atteintes par la tentative allée
 * le plus loin ; knownRooms = rooms vues sur toutes les tentatives (le jeu n'envoie pas le nombre de
 * rooms d'une map).
 */
export interface FaceProgress {
  sid: string;
  side: Side;
  mapName: string | null;
  lastPlayedAt: number;
  attempts: number;
  clears: number;
  bestRooms: number;
  knownRooms: number;
}

/** La face la plus travaillée du jour (`MostPlayed`). */
export interface MostPlayed {
  sid: string;
  side: Side;
  mapName: string | null;
  attempts: number;
}

/** Chiffres du jour (`Today`). bestAttemptMs = la tentative qui a tenu le plus longtemps, null sans tentative. */
export interface Today {
  attempts: number;
  clears: number;
  bestAttemptMs: number | null;
  mostPlayed: MostPlayed | null;
}

/** Un jour de l'activité (`ActivityDay`). day au format AAAA-MM-JJ, dans le fuseau demandé. */
export interface ActivityDay {
  day: string;
  attempts: number;
  clears: number;
}

/**
 * `Summary`. resume = dernière face jouée (null si aucune) ; recent = les faces jouées juste avant
 * (3 au plus, sans celle de resume) ; activity = les 14 derniers jours, du plus ancien à aujourd'hui,
 * jours vides compris.
 */
export interface Summary {
  resume: FaceProgress | null;
  today: Today;
  recent: FaceProgress[];
  activity: ActivityDay[];
}
