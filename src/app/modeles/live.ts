/*
 * Miroir de `LiveDtos.java` (API Spring) : réponse de `GET /api/live` (et des messages du flux
 * `/api/live/stream`). Noms de champs de Spring, tels quels. Dates en ms Unix, durées en ms.
 * TypeScript pur : importé par Angular et par le serveur Nitro.
 */
import type { AttemptResult, Side } from './face';

/**
 * La tentative ouverte (`CurrentAttempt`). lastEventAt = dernier événement reçu du jeu.
 * room peut être null : sans room traversée, Spring renvoie la room de départ, colonne facultative.
 */
export interface CurrentAttempt {
  id: number;
  sid: string;
  side: Side;
  mapName: string | null;
  room: string | null;
  startedAt: number;
  lastEventAt: number;
  deaths: number;
  roomsVisited: number;
}

/** La room qui concentre le plus d'arrêts pendant la session, au moins deux (`CruxRoom`). */
export interface CruxRoom {
  sid: string;
  side: Side;
  room: string;
  endings: number;
}

/** Tentatives et deathless d'une face pendant la session (`FaceCount`). */
export interface FaceCount {
  sid: string;
  side: Side;
  mapName: string | null;
  attempts: number;
  clears: number;
}

/** Une tentative récente de la session, avec sa face (`LiveAttempt`). */
export interface LiveAttempt {
  id: number;
  sid: string;
  side: Side;
  mapName: string | null;
  startedAt: number;
  result: AttemptResult;
  durationMs: number | null;
  endRoom: string | null;
  deaths: number;
}

/** Les chiffres de la session (`SessionStats`). activeMs = temps de jeu actif, hors pauses entre les tentatives. */
export interface SessionStats {
  startedAt: number;
  lastActivityAt: number;
  activeMs: number;
  attempts: number;
  clears: number;
  deaths: number;
  bestClearMs: number | null;
  longestMs: number | null;
  longestEndRoom: string | null;
  crux: CruxRoom | null;
  faces: FaceCount[];
  recent: LiveAttempt[];
}

/**
 * L'état du direct (`LiveSnapshot`). session = null quand rien n'a été joué récemment ; active = la
 * session continue (sinon c'est le résumé de la dernière) ; serverTime recale les chronos.
 */
export interface LiveSnapshot {
  active: boolean;
  session: SessionStats | null;
  current: CurrentAttempt | null;
  serverTime: number;
}
