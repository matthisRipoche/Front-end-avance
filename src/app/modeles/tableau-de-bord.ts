/*
 * Contrat du front pour le tableau de bord : ce que renvoie `GET /api/tableau-de-bord` (route Nitro)
 * à la page `/tableau-de-bord`. Construit par le serveur à partir de `GET /api/summary` (`Summary`)
 * et `GET /api/live` (`LiveSnapshot`), en liste blanche de champs : un champ ajouté par Spring
 * n'arrive pas jusqu'au navigateur sans passer par ici.
 * En français, à la différence des miroirs de Spring : c'est le vocabulaire de la page.
 * TypeScript pur : importé par Angular et par le serveur Nitro.
 */
import type { Side } from './face';

/** Une face et sa progression, prête à afficher. */
export type FaceProgression = {
  /** Identifiant de la map (SID), peut contenir des `/`. */
  sid: string;
  /** Côté joué : A, B ou C. */
  side: Side;
  /** Nom affiché : `mapName` de Spring, sinon le dernier segment du SID. */
  nom: string;
  /** Tentatives significatives sur cette face (`attempts`). */
  tentatives: number;
  /** Tentatives réussies sans mourir (`clears`). */
  deathless: number;
  /** Dernière partie, en ms Unix (`lastPlayedAt`). */
  dernierePartie: number;
  /** Rooms atteintes par la tentative allée le plus loin (`bestRooms`). */
  roomsAtteintes: number;
  /** Rooms vues sur toutes les tentatives (`knownRooms`) : le jeu ne donne pas le total d'une map. */
  roomsVues: number;
  /** roomsAtteintes / roomsVues, entre 0 et 1 ; null si roomsVues vaut 0. */
  progression: number | null;
};

/** La face la plus travaillée du jour. */
export type FacePlusTravaillee = {
  /** Identifiant de la map (SID). */
  sid: string;
  /** Côté joué : A, B ou C. */
  side: Side;
  /** Nom affiché : `mapName`, sinon le dernier segment du SID. */
  nom: string;
  /** Tentatives du jour sur cette face. */
  tentatives: number;
};

/** Chiffres du jour, coupé à minuit dans le fuseau du tableau de bord. */
export type Aujourdhui = {
  /** Tentatives significatives du jour. */
  tentatives: number;
  /** Deathless réussis du jour. */
  deathless: number;
  /** Durée de la tentative du jour qui a tenu le plus longtemps, en ms ; null sans tentative. */
  plusLongueMs: number | null;
  /** Face la plus jouée du jour ; null sans tentative. */
  plusTravaillee: FacePlusTravaillee | null;
};

/** Un jour de l'activité. */
export type JourActivite = {
  /** Date au format AAAA-MM-JJ, dans le fuseau du tableau de bord. */
  jour: string;
  /** Tentatives significatives ce jour-là. */
  tentatives: number;
  /** Deathless réussis ce jour-là. */
  deathless: number;
};

/** Activité des 14 derniers jours, du plus ancien à aujourd'hui, jours vides compris. */
export type Activite = {
  /** Les jours, dans l'ordre. */
  jours: JourActivite[];
  /** Plus grand nombre de tentatives sur un jour (0 si aucune) : sert d'échelle au graphique. */
  max: number;
};

/** La tentative en cours, si le joueur est en jeu. */
export type EnJeu = {
  /** Identifiant de la map (SID). */
  sid: string;
  /** Côté joué : A, B ou C. */
  side: Side;
  /** Nom affiché : `mapName`, sinon le dernier segment du SID. */
  nom: string;
  /** Room où se trouve le joueur ; null si Spring ne la connaît pas encore. */
  room: string | null;
  /** Début de la tentative, en ms Unix. */
  debut: number;
};

/** Réponse de `GET /api/tableau-de-bord`. */
export type TableauDeBord = {
  /** Fuseau IANA retenu pour couper les jours (forme canonique d'`Intl`, ex. `Europe/Paris`). */
  fuseau: string;
  /** Dernière face jouée, à reprendre ; null si le joueur n'a jamais joué. */
  reprendre: FaceProgression | null;
  /** Chiffres du jour. */
  aujourdhui: Aujourdhui;
  /** Faces jouées juste avant celle à reprendre (3 au plus). */
  recentes: FaceProgression[];
  /** Activité des 14 derniers jours. */
  activite: Activite;
  /** Tentative en cours ; null hors jeu, ou si le direct de Spring n'a pas répondu à temps. */
  enJeu: EnJeu | null;
  /** Vrai si `reprendre` est null et aucune tentative sur la période d'activité : la page montre l'accueil d'un nouveau joueur. */
  vide: boolean;
};
