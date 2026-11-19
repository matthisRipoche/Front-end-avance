import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type PointGraphique = {
  id: number;
  dureeMs: number;
  issue: 'chute' | 'abandon' | 'deathless';
};

const MINUTE_MS = 60_000;
const ECHELLE_MIN_MINUTES = 5;
const MAX_REPERES_MINUTE = 6;

const NOMS = {
  chute: { un: 'chute', plusieurs: 'chutes' },
  abandon: { un: 'abandon', plusieurs: 'abandons' },
  deathless: { un: 'deathless', plusieurs: 'deathless' },
} as const;

// m:ss, secondes tronquées (le même texte côté serveur et côté navigateur).
function formaterDuree(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/*
 * Graphique « Ton évolution » : une colonne par tentative, hauteur = temps tenu.
 * HTML et CSS seulement. Les classes ci-dessous sont écrites dans
 * src/styles/components.css (lot L5) :
 *   cdt-chart (racine, posée par host), cdt-chart__body, cdt-chart__axis,
 *   cdt-chart__tick (style `bottom: X%`, contient un <span>), cdt-chart__plot, cdt-chart__track (enveloppe interne : repères et colonnes, pour que les repères suivent le défilement)
 *   (défile en horizontal au-delà de ~100 colonnes), cdt-chart__grid (`bottom: X%`),
 *   cdt-chart__col, cdt-chart__col--chute | --abandon | --deathless,
 *   cdt-chart__bar (`height: X%`, min-height: 2px côté CSS), cdt-chart__marker
 *   (pastille fraise des deathless), cdt-chart__legend,
 *   cdt-chart__swatch, cdt-chart__swatch--chute | --abandon | --deathless.
 * Les repères de texte sous les colonnes (« n° 29 » / « n° 48 ») viennent de la page.
 */
@Component({
  selector: 'cdt-evolution-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'cdt-chart', role: 'img', '[attr.aria-label]': 'resume()' },
  templateUrl: './evolution-chart.html',
})
export class EvolutionChart {
  readonly points = input.required<PointGraphique[]>();

  /** Échelle de l'axe, en minutes entières. */
  protected readonly echelle = computed(() => {
    const plusLongue = Math.max(0, ...this.points().map((p) => p.dureeMs));
    return Math.max(ECHELLE_MIN_MINUTES, Math.ceil(plusLongue / MINUTE_MS));
  });

  protected readonly reperes = computed(() => {
    const echelle = this.echelle();
    const minutes =
      echelle <= MAX_REPERES_MINUTE
        ? Array.from({ length: echelle + 1 }, (_, i) => i)
        : Array.from({ length: 5 }, (_, i) => Math.round((i * echelle) / 4));
    return minutes.map((m) => ({ libelle: `${m}:00`, bas: (m / echelle) * 100 }));
  });

  protected readonly colonnes = computed(() => {
    const echelleMs = this.echelle() * MINUTE_MS;
    return this.points().map((p) => ({
      ...p,
      hauteur: Math.min(100, (p.dureeMs / echelleMs) * 100),
      titre: `Tentative n° ${p.id} : ${p.issue}, ${formaterDuree(p.dureeMs)}`,
    }));
  });

  protected readonly resume = computed(() => {
    const points = this.points();
    if (points.length === 0) return 'Aucune tentative à afficher.';
    const parties = (['chute', 'abandon', 'deathless'] as const)
      .map((issue) => ({ issue, n: points.filter((p) => p.issue === issue).length }))
      .filter(({ n }) => n > 0)
      .map(({ issue, n }) => `${n} ${n > 1 ? NOMS[issue].plusieurs : NOMS[issue].un}`);
    const plusLongue = Math.max(...points.map((p) => p.dureeMs));
    const total = `${points.length} ${points.length > 1 ? 'tentatives' : 'tentative'}`;
    return `${total} : ${parties.join(', ')} ; la plus longue a tenu ${formaterDuree(plusLongue)}.`;
  });
}
