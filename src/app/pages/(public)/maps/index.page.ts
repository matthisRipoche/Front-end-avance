import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RouteMeta } from '@analogjs/router';
import { map } from 'rxjs';

import { connexionRequise } from '../../../auth/connexion-requise';
import { memoriserFuseau } from '../../../auth/fuseau';
import { anneeDe, formaterDate } from '../../../format/format';
import { FILTRES_PAR_DEFAUT, type Filtres, type Tri, appliquer, filtreActif, lireFiltres } from './filtres';
import { type ResultatMesMaps, chargerMesMaps } from './maps.donnees';

export const routeMeta = {
  title: 'Mes maps · Celeste Death Tracker',
  meta: [{ name: 'robots', content: 'noindex' }],
  // Page connectée : aussi listée dans PAGES_CONNECTEES (session-contrat.ts), que le middleware
  // Nitro lit pour rediriger avant le rendu. Jamais prérendue.
  canActivate: [connexionRequise],
  // Les données arrivent avant le composant : le HTML du serveur est déjà rempli (voir chargerMesMaps).
  // `runGuardsAndResolvers` reste à sa valeur par défaut : changer le tri ou la recherche (query
  // params) ne rappelle pas l'API, la page refiltre ce qu'elle a déjà.
  resolve: { maps: chargerMesMaps },
} satisfies RouteMeta;

const TRIS_AFFICHES: ReadonlyArray<{ id: Tri; libelle: string }> = [
  { id: 'recentes', libelle: 'Récentes' },
  { id: 'travaillees', libelle: 'Plus travaillées' },
  { id: 'alpha', libelle: 'De A à Z' },
];

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/**
 * « Mes maps » : toutes les faces jouées par le joueur connecté, avec recherche, tri et filtre par mod.
 *
 * Les données viennent du résolveur `chargerMesMaps`, une seule fois ; la recherche, le tri et le
 * filtre vivent dans l'URL et s'appliquent dans un `computed`. Pendant le SSR, la page sort donc
 * déjà triée et filtrée selon l'adresse demandée, et le navigateur produit la même liste à
 * l'hydratation. Les dates sont écrites dans le fuseau porté par les données.
 */
@Component({
  selector: 'app-mes-maps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
})
export default class MesMapsPage {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly resultat = toSignal(this.route.data.pipe(map((d) => d['maps'] as ResultatMesMaps)), {
    requireSync: true,
  });

  private readonly filtresDeLUrl = toSignal(this.route.queryParamMap.pipe(map(lireFiltres)), { requireSync: true });

  protected readonly tris = TRIS_AFFICHES;

  /** Données de la page, ou null en cas d'erreur. */
  protected readonly donnees = computed(() => {
    const r = this.resultat();
    return r.etat === 'ok' ? r.donnees : null;
  });

  /** Vrai pour une panne de l'API (le 401 est déjà redirigé vers la connexion). */
  protected readonly enErreur = computed(() => {
    const r = this.resultat();
    return r.etat === 'erreur' && r.statut !== 401;
  });

  /** Aucune face jouée : rien à chercher, la page renvoie vers le mod. */
  protected readonly vide = computed(() => this.donnees()?.faces.length === 0);

  protected readonly mods = computed(() => this.donnees()?.mods ?? []);

  /**
   * Filtres appliqués : ceux de l'URL, sauf un mod absent des données, qui vaut « Tous les mods »
   * (lien ancien, mod dont toutes les faces ont disparu). `lireFiltres` ne connaît pas les mods :
   * le croisement se fait ici.
   */
  protected readonly filtres = computed<Filtres>(() => {
    const filtres = this.filtresDeLUrl();
    const connu = filtres.mod === null || this.mods().some((m) => m.nom === filtres.mod);
    return connu ? filtres : { ...filtres, mod: null };
  });

  /**
   * Année de la partie la plus récente, dans le fuseau des données : les dates d'une autre année
   * l'écrivent. Pas l'année courante, que le serveur et le navigateur pourraient ne pas partager.
   */
  private readonly anneeDeReference = computed(() => {
    const d = this.donnees();
    if (!d || d.faces.length === 0) return undefined;
    return anneeDe(Math.max(...d.faces.map((f) => f.dernierePartie)), d.fuseau);
  });

  protected readonly faces = computed(() => {
    const d = this.donnees();
    if (!d) return [];
    const reference = this.anneeDeReference();
    return appliquer(d.faces, this.filtres()).map((f) => ({
      cle: `${f.sid}|${f.side}`,
      nom: f.nom,
      side: f.side,
      mod: f.mod,
      tentatives: pluriel(f.tentatives, 'tentative'),
      // « deathless » est invariable.
      deathless: f.deathless > 0 ? `${f.deathless} deathless` : null,
      derniere: formaterDate(f.dernierePartie, d.fuseau, reference),
    }));
  });

  /** « 3 faces sur 12 » quand la liste est filtrée, « 12 faces » sinon. */
  protected readonly compte = computed(() => {
    const total = this.donnees()?.faces.length ?? 0;
    const affichees = this.faces().length;
    return filtreActif(this.filtres()) ? `${pluriel(affichees, 'face')} sur ${total}` : pluriel(total, 'face');
  });

  constructor() {
    // Après le rendu, dans le navigateur seulement : met à jour le cookie `tz` si le fuseau a changé.
    afterNextRender(() => memoriserFuseau(this.document));
  }

  protected chercher(q: string): void {
    this.naviguer({ q });
  }

  protected trier(tri: Tri): void {
    this.naviguer({ tri });
  }

  protected filtrerParMod(mod: string): void {
    this.naviguer({ mod: mod || null });
  }

  protected effacer(): void {
    this.naviguer({ mod: null, q: null });
  }

  /**
   * Écrit les filtres dans l'URL, sans nouvelle entrée d'historique (une par lettre tapée serait
   * pénible). Une valeur par défaut est retirée de l'adresse (`null`), pour que `/maps` reste `/maps`.
   */
  private naviguer(changes: { [K in keyof Filtres]?: Filtres[K] | null }): void {
    const queryParams: Record<string, string | null> = {};
    for (const [cle, valeur] of Object.entries(changes) as [keyof Filtres, string | null][]) {
      queryParams[cle] = valeur === null || valeur === FILTRES_PAR_DEFAUT[cle] ? null : valeur;
    }
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
