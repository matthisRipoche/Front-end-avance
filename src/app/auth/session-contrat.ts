/*
 * Contrat de session partagé entre le serveur Nitro (middleware qui interroge Spring) et Angular
 * (gardes et pages rendues en SSR). TypeScript pur : aucun import Angular ni h3, pour que les deux
 * côtés puissent l'importer sans tirer l'autre framework.
 */

/** Utilisateur connecté, tel que Spring le renvoie (`UserResponse`). */
export type Utilisateur = {
  id: number;
  email: string | null;
  createdAt: string;
  discordUsername: string | null;
  discordAvatarUrl: string | null;
};

/**
 * État de la session pour la requête en cours.
 *
 * `inconnu` : Spring injoignable ou en erreur (5xx), ou page prérendue au build (aucune requête
 * d'utilisateur). On ne sait pas, donc on ne conclut ni « connecté » ni « anonyme ».
 */
export type EtatSession =
  | { statut: 'connecte'; utilisateur: Utilisateur }
  | { statut: 'anonyme' }
  | { statut: 'inconnu' };

/**
 * Clé sous laquelle le middleware Nitro range l'`EtatSession` sur l'`IncomingMessage` de Node.
 *
 * Pourquoi la requête Node et pas `event.context` : Angular reçoit `req` (jeton `REQUEST`
 * d'Analog) mais ni l'événement h3 ni son `context`. Et en dev, chaque middleware reçoit un
 * événement recréé : seul l'objet requête de Node est commun à tous. `Symbol.for` donne le même
 * symbole aux deux bundles (serveur Nitro et rendu Angular), là où `Symbol()` en créerait deux.
 */
export const CLE_SESSION = Symbol.for('celeste-tracker.session');

/**
 * Préfixes des pages réservées aux joueurs connectés.
 *
 * Cette liste et la garde de route `connexionRequise` vont ensemble : une page connectée ajoutée
 * ici doit aussi porter la garde, et inversement.
 */
export const PAGES_CONNECTEES = ['/tableau-de-bord', '/maps'];

/**
 * Le chemin demandé mène-t-il à une page connectée ?
 *
 * Le chemin est normalisé comme le routeur Angular le lirait, sinon une variante
 * (`/%74ableau-de-bord`, `//tableau-de-bord`, `/tableau-de-bord;a=b`) afficherait la page sans que
 * le serveur l'ait reconnue comme protégée.
 */
export function estPageConnectee(chemin: string): boolean {
  const segments = segmentsDe(chemin);
  // Un encodage invalide ne se lit pas : par prudence, on le traite comme une page protégée.
  if (segments === null) return true;
  return PAGES_CONNECTEES.some((prefixe) => {
    const attendus = segmentsDe(prefixe) ?? [];
    return attendus.every((segment, i) => segments[i] === segment);
  });
}

/** Segments décodés du chemin, ou `null` si un segment est mal encodé. */
function segmentsDe(chemin: string): string[] | null {
  const sansSuffixe = chemin.split(/[?#]/, 1)[0];
  const segments: string[] = [];
  // Les segments vides disparaissent : `/` répétés et slash final ne comptent pas.
  for (const brut of sansSuffixe.split('/')) {
    // Paramètres matriciels retirés avant le décodage, comme le routeur Angular : un `;` encodé
    // (`%3B`) fait partie du nom du segment.
    const nom = brut.split(';', 1)[0];
    if (!nom) continue;
    try {
      segments.push(decodeURIComponent(nom));
    } catch {
      return null;
    }
  }
  return segments;
}
