/*
 * Contrat du front pour la page « Mes maps » : ce que renvoie `GET /api/maps` (route Nitro) à la
 * page `/maps`. Construit par le serveur à partir de `GET /api/faces` (`FaceSummary`), en liste
 * blanche de champs : un champ ajouté par Spring n'arrive pas jusqu'au navigateur sans passer par ici.
 * En français, à la différence des miroirs de Spring : c'est le vocabulaire de la page.
 * TypeScript pur : importé par Angular et par le serveur Nitro.
 */
import type { Side } from './face';

/** Une face jouée, prête à afficher. */
export type FaceJouee = {
  /** Identifiant de la map (SID), peut contenir des `/`. */
  sid: string;
  /** Côté joué : A, B ou C. */
  side: Side;
  /** Nom affiché : `mapName` de Spring, sinon le dernier segment du SID. */
  nom: string;
  /** Mod de la map : premier segment du SID (`Celeste`, `StrawberryJam2021`), sinon le SID entier. */
  mod: string;
  /** Tentatives significatives sur cette face (`attempts`). */
  tentatives: number;
  /** Tentatives réussies sans mourir (`clears`). */
  deathless: number;
  /** Dernière partie, en ms Unix (`lastPlayedAt`). */
  dernierePartie: number;
};

/** Un mod joué, pour le filtre de la page. */
export type ModJoue = {
  /** Nom du mod, tel que dans `FaceJouee.mod`. */
  nom: string;
  /** Nombre de faces jouées de ce mod. */
  faces: number;
};

/** Réponse de `GET /api/maps`. */
export type MesMaps = {
  /** Fuseau IANA dans lequel la page affiche les dates (cookie `tz`, sinon Europe/Paris). */
  fuseau: string;
  /** Les faces jouées, de la plus récemment jouée à la plus ancienne. */
  faces: FaceJouee[];
  /** Les mods joués, du plus fourni au moins fourni, puis par nom. */
  mods: ModJoue[];
};
