/*
 * Recherche, tri et filtre de la page « Mes maps ».
 *
 * Fonctions pures, sans Angular : l'état vit dans l'URL (`?tri=…&mod=…&q=…`), la page le lit et
 * appelle `appliquer` dans un `computed`. Le serveur et le navigateur appliquent donc le même code
 * aux mêmes données, et doivent écrire la même liste pour que l'hydratation la reprenne telle quelle.
 */
import type { FaceJouee } from '../../../modeles/mes-maps';

export const TRIS = ['recentes', 'travaillees', 'alpha'] as const;
export type Tri = (typeof TRIS)[number];

export type Filtres = {
  tri: Tri;
  /** Nom exact du mod, ou null pour tous les mods. */
  mod: string | null;
  /** Texte cherché tel que saisi ; vide pour ne pas filtrer. */
  q: string;
};

export const FILTRES_PAR_DEFAUT: Filtres = { tri: 'recentes', mod: null, q: '' };

/** Ce qu'on lit des paramètres de l'URL : la forme de `ParamMap`, sans dépendre d'Angular. */
export type Parametres = { get(nom: string): string | null };

/** Lit les filtres dans l'URL. Une valeur absente, vide ou inconnue revient à la valeur par défaut. */
export function lireFiltres(params: Parametres): Filtres {
  const tri = params.get('tri');
  const mod = params.get('mod');
  return {
    tri: TRIS.includes(tri as Tri) ? (tri as Tri) : FILTRES_PAR_DEFAUT.tri,
    mod: mod ? mod : FILTRES_PAR_DEFAUT.mod,
    q: params.get('q') ?? FILTRES_PAR_DEFAUT.q,
  };
}

/** Vrai si la recherche ou le filtre par mod réduit la liste (le tri seul ne compte pas). */
export function filtreActif(filtres: Filtres): boolean {
  return filtres.mod !== null || normaliser(filtres.q) !== '';
}

/** Les faces à afficher : filtrées par mod et par nom, puis triées. Ne modifie pas `faces`. */
export function appliquer(faces: readonly FaceJouee[], filtres: Filtres): FaceJouee[] {
  const cherche = normaliser(filtres.q);
  const gardees = faces.filter(
    (f) => (filtres.mod === null || f.mod === filtres.mod) && (cherche === '' || normaliser(f.nom).includes(cherche)),
  );

  switch (filtres.tri) {
    case 'recentes':
      // Le serveur envoie déjà les faces de la plus récente à la plus ancienne.
      return gardees;
    case 'travaillees':
      return gardees.sort((a, b) => b.tentatives - a.tentatives || departager(a, b));
    case 'alpha':
      return gardees.sort((a, b) => COLLATEUR.compare(a.nom, b.nom) || departager(a, b));
  }
}

/** Ordre alphabétique français, sans tenir compte de la casse ni des accents (« Éclat » avec les E). */
const COLLATEUR = new Intl.Collator('fr', { sensitivity: 'base' });

/** Minuscules, sans accents ni espaces aux bords : « Éclat » et « eclat » se trouvent l'un l'autre. */
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Ex aequo : par SID puis par face, en comparant les codes de caractère. Pas de `localeCompare`,
 * dont le résultat dépend de la version d'ICU : Node et le navigateur pourraient ordonner
 * différemment, et l'hydratation trouverait une autre liste que celle du serveur.
 */
function departager(a: FaceJouee, b: FaceJouee): number {
  return parCode(a.sid, b.sid) || parCode(a.side, b.side);
}

function parCode(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
