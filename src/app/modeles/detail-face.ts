/*
 * Contrat du front pour la page « Détail d'une face » : ce que renvoie `GET /api/face`
 * (route Nitro) à la page. Construit par le serveur à partir de `FaceDetail` de Spring
 * (`GET /api/faces/detail`), en liste blanche de champs : un champ ajouté par Spring n'arrive pas
 * jusqu'au navigateur sans passer par ici.
 * En français, à la différence des miroirs de Spring : c'est le vocabulaire de la page.
 * TypeScript pur : importé par Angular et par le serveur Nitro.
 */
import type { Side } from './face';

/** Issue d'une tentative, en français : le contrat de la page n'expose pas `AttemptResult` de Spring tel quel. */
export type IssueTentative = 'deathless' | 'chute' | 'abandon' | 'en-cours';

/** Une room de la face, avec ce qui s'y est passé. */
export type RoomArrets = {
  /** Identifiant de la room tel que le jeu l'envoie (`b-05`). */
  room: string;
  /** Tentatives non réussies terminées dans cette room (`endings` de Spring) : ce que la page appelle « arrêts ». */
  arrets: number;
  /** Morts dans cette room, plusieurs par tentative possibles (`deaths` de Spring). */
  morts: number;
};

/** Une tentative du graphique d'évolution. */
export type PointEvolution = {
  /** Identifiant de la tentative (`attemptId`). */
  id: number;
  /** Début de la tentative, en ms Unix (`startedAt`). */
  debut: number;
  /** Temps tenu, en ms ; null si Spring ne l'a pas (`durationMs`). */
  dureeMs: number | null;
  /** Issue de la tentative. */
  issue: IssueTentative;
};

/** Une ligne de « Dernières tentatives ». */
export type TentativeRecente = {
  /** Identifiant de la tentative (`id`). */
  id: number;
  /** Début, en ms Unix (`startedAt`). */
  debut: number;
  /** Issue de la tentative. */
  issue: IssueTentative;
  /** Temps tenu, en ms ; null si inconnu (`durationMs`). */
  dureeMs: number | null;
  /** Room où la tentative s'est arrêtée (`endRoom`) ; null si elle n'en a pas (deathless, en cours). */
  roomFin: string | null;
  /** Rooms franchies avant l'arrêt (`roomsCleared`). */
  roomsFranchies: number;
  /** Morts de la tentative (`deaths`). */
  morts: number;
};

/** Réponse de `GET /api/face`. */
export type DetailFace = {
  /** Fuseau IANA dans lequel la page affiche les dates (cookie `tz`, sinon Europe/Paris). */
  fuseau: string;
  /** Jour du rendu, AAAA-MM-JJ dans ce fuseau, calculé par le serveur : la page compare les dates avec lui pour écrire « Auj. » et « Hier » sans lire l'horloge (hydratation). */
  aujourdhui: string;
  /** SID de la map, peut contenir des `/`. */
  sid: string;
  /** Côté joué : A, B ou C. */
  side: Side;
  /** Nom affiché : `mapName`, sinon le dernier segment du SID. */
  nom: string;
  /** Mod de la map : premier segment du SID. */
  mod: string;
  /** Dernière partie, en ms Unix, déduite de la tentative la plus récente ; null si aucune. */
  dernierePartie: number | null;
  /** Tentatives significatives sur cette face (`attempts`). */
  tentatives: number;
  /** Tentatives des 7 derniers jours, comptées sur `evolution` (au plus 200 tentatives : sous-estimé au-delà). */
  tentativesSemaine: number;
  /** Tentatives réussies sans mourir (`clears`). */
  deathless: number;
  /** Part de tentatives deathless, entre 0 et 1 (`clearRate`). */
  tauxDeathless: number;
  /** Meilleur temps d'un deathless, en ms ; null sans deathless (`bestClearMs`). */
  meilleurDeathlessMs: number | null;
  /** Tentative qui a tenu le plus longtemps, en ms ; null si inconnue (`longestMs`). */
  tenueMaxMs: number | null;
  /** Room où elle s'est arrêtée (`longestEndRoom`) ; null si inconnue. */
  tenueMaxRoom: string | null;
  /** Rooms dans l'ordre de la map. */
  rooms: RoomArrets[];
  /** Au plus 200 tentatives, de la plus ancienne à la plus récente. */
  evolution: PointEvolution[];
  /** 8 tentatives au plus, de la plus récente à la plus ancienne. */
  recentes: TentativeRecente[];
};
