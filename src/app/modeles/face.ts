/*
 * Miroir de `FaceDtos.java` (API Spring) : réponses de `GET /api/faces`, `/api/faces/detail` et
 * `/api/faces/room`. Une « face » = une map + A, B ou C. Noms de champs de Spring, tels quels.
 * TypeScript pur : importé par Angular et par le serveur Nitro.
 * Dates en ms Unix, durées en ms.
 */

/** Côté de la map. Spring renvoie une `String`, mais n'accepte que `A`, `B` ou `C` en entrée. */
export type Side = 'A' | 'B' | 'C';

/** Issue d'une tentative : réussie (deathless), morte, abandonnée ou en cours. */
export type AttemptResult = 'success' | 'death' | 'abandoned' | 'ongoing';

/** Une ligne de « Mes maps » (`FaceSummary`). */
export interface FaceSummary {
  sid: string;
  side: Side;
  mapName: string | null;
  attempts: number;
  clears: number;
  lastPlayedAt: number;
}

/** Une room, dans l'ordre de la map (`RoomStat`). */
export interface RoomStat {
  room: string;
  entries: number;
  endings: number;
  deaths: number;
}

/** Une tentative du graphique d'évolution (`EvolutionPoint`). */
export interface EvolutionPoint {
  attemptId: number;
  startedAt: number;
  durationMs: number | null;
  result: AttemptResult;
}

/** Une ligne de « Dernières tentatives » (`RecentAttempt`). roomsCleared = rooms franchies avant l'arrêt. */
export interface RecentAttempt {
  id: number;
  startedAt: number;
  result: AttemptResult;
  durationMs: number | null;
  endRoom: string | null;
  roomsCleared: number;
  deaths: number;
}

/** Le détail d'une face (`FaceDetail`). */
export interface FaceDetail {
  sid: string;
  side: Side;
  mapName: string | null;
  attempts: number;
  clears: number;
  clearRate: number;
  bestClearMs: number | null;
  longestMs: number | null;
  longestEndRoom: string | null;
  rooms: RoomStat[];
  evolution: EvolutionPoint[];
  recent: RecentAttempt[];
}

/**
 * Une mort dans une room (`DeathPoint`). x et y sont les coordonnées du monde de la map, l'axe Y
 * va vers le bas. first = première mort de sa tentative, celle qui fait perdre le deathless.
 */
export interface DeathPoint {
  deathId: number;
  attemptId: number;
  at: number;
  x: number;
  y: number;
  first: boolean;
}

/** Ce qui est arrivé à une tentative entrée dans la room : franchie, morte ici, ou terminée ici sans mourir. */
export type RoomOutcomeKind = 'cleared' | 'died' | 'left';

/** `RoomOutcome`. */
export interface RoomOutcome {
  attemptId: number;
  startedAt: number;
  outcome: RoomOutcomeKind;
}

/** Le détail d'une room (`RoomDetail`). stopRate = stops / entries, entre 0 et 1. position commence à 1. */
export interface RoomDetail {
  sid: string;
  side: Side;
  mapName: string | null;
  room: string;
  position: number;
  roomCount: number;
  previousRoom: string | null;
  nextRoom: string | null;
  entries: number;
  stops: number;
  stopRate: number;
  deathsTotal: number;
  lastDeathAt: number | null;
  points: DeathPoint[];
  outcomes: RoomOutcome[];
}
