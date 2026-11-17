/*
 * Miroir de `AttemptDtos.java` (API Spring) : réponses de `GET /api/attempts` et
 * `/api/attempts/{id}`. Noms de champs de Spring, tels quels. Dates en ms Unix, durées en ms.
 * TypeScript pur : importé par Angular et par le serveur Nitro.
 */
import type { AttemptResult, Side } from './face';

/**
 * Une ligne de l'historique (`AttemptRow`). durationMs = temps tenu (à la première mort pour une
 * tentative morte) ; deaths compte toutes les morts de la tentative.
 */
export interface AttemptRow {
  id: number;
  startedAt: number;
  sid: string;
  side: Side;
  mapName: string | null;
  result: AttemptResult;
  durationMs: number | null;
  endRoom: string | null;
  deaths: number;
}

/** Une page de l'historique (`AttemptPage`), de la plus récente à la plus ancienne. page commence à 0. */
export interface AttemptPage {
  items: AttemptRow[];
  page: number;
  size: number;
  total: number;
}

/** Une room traversée (`RouteStep`). sessionTimeMs est vide pour la room de départ (pas d'événement d'entrée). */
export interface RouteStep {
  room: string;
  enteredAt: number;
  sessionTimeMs: number | null;
}

/**
 * Une mort de la tentative (`AttemptDeath`). x et y sont les coordonnées du monde de la map, l'axe Y
 * va vers le bas. first = la mort qui fait perdre le deathless.
 */
export interface AttemptDeath {
  deathId: number;
  room: string;
  x: number;
  y: number;
  at: number;
  timeInRoomMs: number;
  first: boolean;
}

/** Le détail d'une tentative (`AttemptDetail`). endedAt et endReason sont vides si elle est en cours. */
export interface AttemptDetail {
  id: number;
  startedAt: number;
  endedAt: number | null;
  sid: string;
  side: Side;
  mapName: string | null;
  result: AttemptResult;
  durationMs: number | null;
  endReason: string | null;
  startRoom: string | null;
  endRoom: string | null;
  route: RouteStep[];
  deaths: AttemptDeath[];
}

/** Périodes acceptées par le paramètre `period` de l'historique : « all » = sans limite de date. */
export type Period = '7d' | '30d' | 'all';

/** Filtres de l'historique côté front (pas un DTO de Spring : ils deviennent des paramètres de requête). */
export interface AttemptFilter {
  sid: string | null;
  side: Side | null;
  result: AttemptResult | null;
  period: Period;
  page: number;
}
