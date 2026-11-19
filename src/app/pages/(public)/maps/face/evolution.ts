/*
 * Fonctions pures de la page « Détail d'une face » : fenêtre du graphique, onglets, tendance et
 * dates relatives. Sans Angular, sans horloge : tout part des données (hydratation identique).
 */
import type { PointEvolution } from '../../../../modeles/detail-face';

export type Tendance = {
  sens: 'hausse' | 'baisse' | 'stable' | 'insuffisant';
  phrase: string;
};

export type Onglet = {
  id: '20' | '50' | 'toutes';
  /** Nombre de tentatives montrées ; null = toutes. */
  taille: number | null;
  /** Nombre affiché devant « dernières » ; null pour « Toutes ». */
  nombre: number | null;
};

/** Les `n` tentatives les plus récentes (les points vont de la plus ancienne à la plus récente) ; `null` = toutes. */
export function fenetre(points: PointEvolution[], n: number | null): PointEvolution[] {
  return n === null || n >= points.length ? points : points.slice(points.length - n);
}

/**
 * Onglets utiles pour `total` tentatives : un onglet n'apparaît que s'il montre autre chose que le
 * précédent. Une liste vide veut dire « pas de groupe d'onglets » (seul « Toutes » resterait).
 */
export function onglets(total: number): Onglet[] {
  if (total <= 20) return [];
  const liste: Onglet[] = [{ id: '20', taille: 20, nombre: 20 }];
  if (total > 50) liste.push({ id: '50', taille: 50, nombre: 50 });
  liste.push({ id: 'toutes', taille: null, nombre: null });
  return liste;
}

/** Écart de durée en mots : « 1 min 15 », « 45 s », « 2 min ». `secondes` est un entier positif. */
export function ecartEnMots(secondes: number): string {
  const minutes = Math.floor(secondes / 60);
  const reste = secondes % 60;
  if (minutes === 0) return `${reste} s`;
  return reste === 0 ? `${minutes} min` : `${minutes} min ${reste}`;
}

const moyenne = (valeurs: number[]) => valeurs.reduce((a, b) => a + b, 0) / valeurs.length;

/**
 * Tendance de la tenue sur les chutes de la fenêtre : les ⌈k/2⌉ plus récentes contre les ⌊k/2⌋
 * d'avant. Les points vont de la plus ancienne à la plus récente.
 */
export function tendance(points: PointEvolution[]): Tendance {
  const chutes = points.filter((p) => p.issue === 'chute' && p.dureeMs !== null).map((p) => p.dureeMs as number);
  const k = chutes.length;
  if (k < 4) {
    return { sens: 'insuffisant', phrase: 'Pas encore assez de chutes pour dégager une tendance.' };
  }
  const avant = chutes.slice(0, Math.floor(k / 2));
  const recentes = chutes.slice(Math.floor(k / 2));
  const ecartMs = moyenne(recentes) - moyenne(avant);
  if (Math.abs(ecartMs) < 1000) {
    return { sens: 'stable', phrase: 'Tenue moyenne stable sur tes dernières chutes.' };
  }
  const mots = ecartEnMots(Math.round(Math.abs(ecartMs) / 1000));
  const fin = `de tenue moyenne sur tes ${recentes.length} dernières chutes, contre les ${avant.length} d’avant`;
  return ecartMs > 0
    ? { sens: 'hausse', phrase: `+${mots} ${fin}` }
    : { sens: 'baisse', phrase: `−${mots} ${fin}` };
}

/** Fuseau valide pour Intl ; repli sur Paris comme le reste du projet. */
function formateur(fuseau: string, options: Intl.DateTimeFormatOptions, langue = 'fr-FR'): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(langue, { ...options, timeZone: fuseau });
  } catch {
    return new Intl.DateTimeFormat(langue, { ...options, timeZone: 'Europe/Paris' });
  }
}

/** Jour AAAA-MM-JJ d'un instant dans le fuseau du joueur. */
export function jourDe(ms: number, fuseau: string): string {
  const parties = formateur(fuseau, { year: 'numeric', month: '2-digit', day: '2-digit' }, 'en-CA').formatToParts(ms);
  const p = (type: string) => parties.find((x) => x.type === type)?.value ?? '';
  return `${p('year')}-${p('month')}-${p('day')}`;
}

/** Veille d'un jour AAAA-MM-JJ (calcul sur le calendrier, sans horloge). */
export function veille(jour: string): string {
  const [a, m, j] = jour.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j - 1)).toISOString().slice(0, 10);
}

export type DateTentative = { court: string; long: string };

/**
 * Date d'une tentative : « Auj. 21:42 » / « Aujourd’hui, 21:42 », « Hier 22:04 » / « Hier, 22:04 »,
 * sinon « 17 nov., 21:42 » (même texte dans les deux formes). `aujourdhui` vient du serveur.
 */
export function dateTentative(ms: number, fuseau: string, aujourdhui: string): DateTentative {
  const parties = formateur(fuseau, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).formatToParts(ms);
  const p = (type: string) => parties.find((x) => x.type === type)?.value ?? '';
  const heure = `${p('hour')}:${p('minute')}`;
  const jour = jourDe(ms, fuseau);
  if (jour === aujourdhui) return { court: `Auj. ${heure}`, long: `Aujourd’hui, ${heure}` };
  if (jour === veille(aujourdhui)) return { court: `Hier ${heure}`, long: `Hier, ${heure}` };
  const texte = `${p('day')} ${p('month')}, ${heure}`;
  return { court: texte, long: texte };
}

export type PireRooms = { rooms: string[]; arrets: number };

/**
 * Rooms où les tentatives s'arrêtent le plus, dans l'ordre de la map. Toutes celles à égalité sont
 * rendues, comme le fait `cdt-room-breakdown` (qui les met toutes en rouge). `null` si aucun arrêt.
 */
export function pireRooms(rooms: { room: string; arrets: number }[]): PireRooms | null {
  const arrets = Math.max(0, ...rooms.map((r) => r.arrets));
  if (arrets === 0) return null;
  return { rooms: rooms.filter((r) => r.arrets === arrets).map((r) => r.room), arrets };
}

/** Séparateur avant l'élément `i` d'une liste de `n` : « , » entre les premiers, « et » avant le dernier. */
export function separateurListe(i: number, n: number): string {
  if (i === 0) return '';
  return i === n - 1 ? ' et ' : ', ';
}
