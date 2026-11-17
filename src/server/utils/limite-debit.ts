/**
 * Limiteur de débit en mémoire, à fenêtre fixe : au plus `max` essais par clé (une adresse IP)
 * et par fenêtre de `fenetreMs`. Le premier essai d'une clé ouvre sa fenêtre.
 *
 * Limites, assumées pour ce projet (un seul conteneur Node) :
 * - l'état vit dans le processus : il est perdu au redémarrage, et ne serait pas partagé entre
 *   plusieurs instances du serveur (il faudrait alors un stockage commun, Redis par exemple) ;
 * - en fin de fenêtre, un client peut enchaîner jusqu'à 2 × max essais à cheval sur deux
 *   fenêtres. Suffisant contre les essais en rafale, que l'on cherche seulement à ralentir.
 */
export type ResultatLimite = { accepte: true } | { accepte: false; attenteS: number };

export function creerLimiteur(options: {
  max: number;
  fenetreMs: number;
  maintenant?: () => number;
}) {
  const { max, fenetreMs, maintenant = Date.now } = options;
  const fenetres = new Map<string, { debut: number; essais: number }>();

  /**
   * Retire les fenêtres terminées, pour que la mémoire ne grossisse pas sans fin. Une Map garde
   * l'ordre d'insertion, et chaque nouvelle fenêtre est réinsérée en fin : les plus anciennes sont
   * en tête. On s'arrête donc à la première encore ouverte, sans parcourir toute la Map.
   */
  function purger(t: number): void {
    for (const [cle, f] of fenetres) {
      if (t - f.debut < fenetreMs) return;
      fenetres.delete(cle);
    }
  }

  return {
    /** Compte un essai pour `cle` et dit s'il est accepté. */
    essayer(cle: string): ResultatLimite {
      const t = maintenant();
      purger(t);

      let f = fenetres.get(cle);
      if (!f || t - f.debut >= fenetreMs) {
        f = { debut: t, essais: 0 };
        fenetres.delete(cle); // réinsérée en fin de Map : l'ordre suit `debut`
        fenetres.set(cle, f);
      }
      f.essais++;
      if (f.essais <= max) return { accepte: true };
      return { accepte: false, attenteS: Math.ceil((f.debut + fenetreMs - t) / 1000) };
    },
    /** Nombre de clés suivies (pour les tests). */
    get taille(): number {
      return fenetres.size;
    },
  };
}
