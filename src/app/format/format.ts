/*
 * Mise en forme des chiffres et des dates, commune aux pages du front (tableau de bord, mes maps).
 * Fonctions pures, sans Angular.
 *
 * Tout est calculé à partir des données, jamais de l'heure courante : le serveur et le navigateur
 * doivent écrire le même texte pour que l'hydratation reprenne le HTML tel quel. Pas de « il y a… ».
 */

/** Fuseau du serveur quand celui des données est illisible (même repli que la route Nitro). */
const FUSEAU_PAR_DEFAUT = 'Europe/Paris';

const deuxChiffres = (n: number) => String(n).padStart(2, '0');

/**
 * Chrono, comme en jeu : « 03:17 », puis « 1:05:03 » au-delà d'une heure. Sans durée : « — ».
 * Une durée négative compte pour 0.
 */
export function formaterChrono(ms: number | null): string {
  if (ms === null) return '—';
  const total = Math.max(0, Math.floor(ms / 1000));
  const heures = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secondes = total % 60;
  const mmss = `${deuxChiffres(minutes)}:${deuxChiffres(secondes)}`;
  return heures > 0 ? `${heures}:${mmss}` : mmss;
}

/**
 * Date et heure dans le fuseau du joueur : « 17 novembre à 21:04 ».
 *
 * Avec `anneeDeReference`, l'année est écrite quand elle en diffère : « 17 novembre 2025 à 21:04 ».
 * La référence vient des données (voir `anneeDe`), jamais de l'année courante : le serveur et le
 * navigateur n'ont pas forcément la même horloge, surtout autour du 1er janvier.
 *
 * Assemblée à partir de `formatToParts` plutôt que par `format` : la ponctuation entre le jour et
 * l'heure varie selon la version d'ICU (Node et navigateur n'ont pas toujours la même), les
 * morceaux eux-mêmes non.
 */
export function formaterDate(ms: number, fuseau: string, anneeDeReference?: number): string {
  const parties = formateur(fuseau).formatToParts(ms);
  const partie = (type: Intl.DateTimeFormatPartTypes) => parties.find((p) => p.type === type)?.value ?? '';
  const annee = partie('year');
  const jour =
    anneeDeReference !== undefined && Number(annee) !== anneeDeReference
      ? `${partie('day')} ${partie('month')} ${annee}`
      : `${partie('day')} ${partie('month')}`;
  return `${jour} à ${partie('hour')}:${partie('minute')}`;
}

/** Année d'un instant dans le fuseau du joueur : le 31 décembre à 23 h UTC est encore 31 décembre à New York. */
export function anneeDe(ms: number, fuseau: string): number {
  return Number(formateur(fuseau).formatToParts(ms).find((p) => p.type === 'year')?.value);
}

/** Nom de ville d'un fuseau IANA : `Europe/Paris` → « Paris », `America/New_York` → « New York ». */
export function villeDuFuseau(fuseau: string): string {
  const segment = fuseau.split('/').pop() ?? fuseau;
  return segment.replaceAll('_', ' ');
}

/** Pourcentage entier d'une progression entre 0 et 1, borné : « 75 % ». */
export function formaterPourcentage(progression: number): string {
  return `${Math.round(Math.min(1, Math.max(0, progression)) * 100)} %`;
}

function formateur(fuseau: string): Intl.DateTimeFormat {
  // L'année est toujours demandée, puis écrite ou non par `formaterDate`.
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  };
  try {
    return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: fuseau });
  } catch {
    // Fuseau inconnu d'Intl : on écrit l'heure du serveur plutôt que de faire tomber la page.
    return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: FUSEAU_PAR_DEFAUT });
  }
}
