import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { Activite } from '../../modeles/tableau-de-bord';

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

// Le jour et le mois sont lus dans la chaîne AAAA-MM-JJ, jamais recalculés avec une date :
// le fuseau du navigateur pourrait décaler le jour, et l'hydratation doit retrouver le HTML du serveur.
const numeroJour = (jour: string) => jour.slice(8, 10);
const dateEnMots = (jour: string) =>
  `${Number(jour.slice(8, 10))} ${MOIS[Number(jour.slice(5, 7)) - 1] ?? ''}`.trim();
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

// Activité sur les derniers jours : une barre par jour, à l'échelle du meilleur jour.
// Le dernier jour (aujourd'hui) ressort ; un repère signale les jours avec deathless, expliqué par une
// légende visible quand il y en a.
@Component({
  selector: 'cdt-activite-jours',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Le role="img" est sur le graphique, pas sur l'hôte : la légende reste lisible par un lecteur d'écran.
  host: { class: 'cdt-activite' },
  templateUrl: './activite-jours.html',
  styleUrl: './activite-jours.css',
})
export class ActiviteJoursGraphique {
  readonly activite = input.required<Activite>();

  protected readonly barres = computed(() => {
    const { jours, max } = this.activite();
    return jours.map((j, i) => ({
      jour: j.jour,
      numero: numeroJour(j.jour),
      // max vaut 0 quand il n'y a aucune tentative : pas de division par zéro.
      hauteur: max > 0 ? Math.min(100, (j.tentatives / max) * 100) : 0,
      deathless: j.deathless > 0,
      aujourdhui: i === jours.length - 1,
    }));
  });

  /** La légende du repère n'apparaît que s'il y a au moins un repère à expliquer. */
  protected readonly avecDeathless = computed(() => this.activite().jours.some((j) => j.deathless > 0));

  protected readonly label = computed(() => {
    const { jours } = this.activite();
    const periode = `${jours.length} derniers jours`;
    const total = jours.reduce((s, j) => s + j.tentatives, 0);
    if (total === 0) return `Aucune tentative sur les ${periode}`;

    // Le premier jour qui atteint le maximum, pour une phrase stable.
    const meilleur = jours.reduce((m, j) => (j.tentatives > m.tentatives ? j : m));
    const deathless = jours.reduce((s, j) => s + j.deathless, 0);
    const phrases = [
      `${pluriel(total, 'tentative')} sur les ${periode}`,
      `meilleur jour le ${dateEnMots(meilleur.jour)} avec ${pluriel(meilleur.tentatives, 'tentative')}`,
    ];
    // « deathless » est invariable.
    if (deathless > 0) phrases.push(`${deathless} deathless`);
    return phrases.join(', ');
  });
}
