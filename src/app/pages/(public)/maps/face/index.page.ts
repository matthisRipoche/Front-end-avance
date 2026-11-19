import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RouteMeta } from '@analogjs/router';
import { map } from 'rxjs';

import { connexionRequise } from '../../../../auth/connexion-requise';
import { memoriserFuseau } from '../../../../auth/fuseau';
import { formaterChrono, formaterDate, formaterPourcentage } from '../../../../format/format';
import type { IssueTentative } from '../../../../modeles/detail-face';
import { EvolutionChart, type PointGraphique } from '../../../../ui/evolution-chart/evolution-chart';
import { ReachTrack } from '../../../../ui/reach-track/reach-track';
import { ResultTag, type ResultKind } from '../../../../ui/result-tag/result-tag';
import { RoomBreakdown } from '../../../../ui/room-breakdown/room-breakdown';
import { type Onglet, dateTentative, fenetre, jourDe, onglets, pireRooms, separateurListe, tendance } from './evolution';
import { type ResultatFace, chargerDetailFace } from './face.donnees';

// Pas de `title` ici : le titre dépend des données (nom de la face), la page le pose elle-même.
// Un titre statique serait réécrit par la stratégie de titre du routeur après l'activation.
export const routeMeta = {
  meta: [{ name: 'robots', content: 'noindex' }],
  // Page connectée : aussi listée dans PAGES_CONNECTEES (session-contrat.ts). Jamais prérendue.
  canActivate: [connexionRequise],
  resolve: { face: chargerDetailFace },
  // Aller d'une face à une autre ne change que la query : sans cela, les anciennes données restent.
  runGuardsAndResolvers: 'paramsOrQueryParamsChange',
} satisfies RouteMeta;

const TITRE_PAR_DEFAUT = 'Détail d’une face · Celeste Death Tracker';

const ETIQUETTES: Record<IssueTentative, { kind: ResultKind; mot: string }> = {
  chute: { kind: 'fall', mot: 'chute' },
  deathless: { kind: 'deathless', mot: 'deathless' },
  abandon: { kind: 'abandon', mot: 'abandon' },
  'en-cours': { kind: 'abandon', mot: 'en cours' },
};

/**
 * « Détail d'une face » : chiffres clés, évolution, rooms où ça casse, dernières tentatives.
 *
 * Données par le résolveur `chargerDetailFace`. Les dates relatives se calculent avec `aujourdhui`,
 * fourni par le serveur : la page ne lit jamais l'horloge (hydratation identique). La tendance
 * dépend de l'onglet choisi, donc se calcule ici.
 */
@Component({
  selector: 'app-detail-face',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EvolutionChart, ReachTrack, ResultTag, RoomBreakdown],
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
})
export default class DetailFacePage {
  private readonly document = inject(DOCUMENT);
  private readonly titre = inject(Title);
  private readonly route = inject(ActivatedRoute);

  private readonly resultat = toSignal(this.route.data.pipe(map((d) => d['face'] as ResultatFace)), {
    requireSync: true,
  });

  protected readonly etat = computed(() => this.resultat().etat);
  protected readonly donnees = computed(() => {
    const r = this.resultat();
    return r.etat === 'ok' ? r.donnees : null;
  });

  /** Onglet choisi ; le serveur et le navigateur partent du même. */
  protected readonly ongletChoisi = signal<'20' | '50' | 'toutes'>('20');

  protected readonly onglets = computed(() => onglets(this.donnees()?.evolution.length ?? 0));

  /**
   * Onglet réellement actif : le choisi s'il est proposé, sinon « 20 » s'il l'est, sinon aucun (pas
   * d'onglets : tout est affiché). Le choix peut ne plus exister quand les données changent.
   */
  protected readonly ongletActif = computed<Onglet['id'] | null>(() => {
    const proposes = this.onglets();
    const choisi = this.ongletChoisi();
    if (proposes.some((o) => o.id === choisi)) return choisi;
    return proposes.some((o) => o.id === '20') ? '20' : null;
  });

  private readonly taille = computed(() => this.onglets().find((o) => o.id === this.ongletActif())?.taille ?? null);

  private readonly fenetre = computed(() => fenetre(this.donnees()?.evolution ?? [], this.taille()));

  protected readonly points = computed<PointGraphique[]>(() =>
    this.fenetre().flatMap((p) =>
      p.dureeMs !== null && p.issue !== 'en-cours' ? [{ id: p.id, dureeMs: p.dureeMs, issue: p.issue }] : [],
    ),
  );

  protected readonly tendance = computed(() => tendance(this.fenetre()));

  protected readonly reperes = computed(() => {
    const d = this.donnees();
    const f = this.fenetre();
    if (!d || f.length === 0) return null;
    const dernier = f[f.length - 1];
    return {
      premier: d.tentatives - f.length + 1,
      dernier: d.tentatives,
      aujourdhui: jourDe(dernier.debut, d.fuseau) === d.aujourdhui,
    };
  });

  protected readonly sousTitre = computed(() => {
    const d = this.donnees();
    if (!d) return '';
    if (d.dernierePartie === null) return d.mod;
    const date = formaterDate(d.dernierePartie, d.fuseau, Number(d.aujourdhui.slice(0, 4)));
    return `${d.mod} · dernière partie ${date}`;
  });

  protected readonly chiffres = computed(() => {
    const d = this.donnees();
    if (!d) return null;
    return {
      tentatives: d.tentatives,
      semaine: d.tentativesSemaine,
      deathless: d.deathless,
      taux: formaterPourcentage(d.tauxDeathless),
      meilleur: formaterChrono(d.meilleurDeathlessMs),
      tenue: formaterChrono(d.tenueMaxMs),
      tenueRoom: d.tenueMaxRoom,
    };
  });

  protected readonly pires = computed(() => pireRooms(this.donnees()?.rooms ?? []));

  protected readonly separateur = separateurListe;

  protected readonly roomsPourGraphique = computed(() =>
    (this.donnees()?.rooms ?? []).map((r) => ({ id: r.room, stops: r.arrets })),
  );

  protected readonly recentes = computed(() => {
    const d = this.donnees();
    if (!d) return [];
    const premiere = d.rooms[0]?.room ?? '';
    const derniere = d.rooms[d.rooms.length - 1]?.room ?? '';
    return d.recentes.map((t) => {
      const etiquette = ETIQUETTES[t.issue];
      return {
        id: t.id,
        date: dateTentative(t.debut, d.fuseau, d.aujourdhui),
        kind: etiquette.kind,
        mot: t.issue === 'chute' && t.roomFin ? `chute en ${t.roomFin}` : etiquette.mot,
        duree: formaterChrono(t.dureeMs),
        rooms: d.rooms.length,
        chuteA: t.issue === 'deathless' ? null : t.roomsFranchies,
        roomFin: t.roomFin ?? '',
        premiere,
        derniere,
      };
    });
  });

  protected readonly lienFace = computed(() => {
    const d = this.donnees();
    return d ? `${d.nom} · Face ${d.side} · Celeste Death Tracker` : TITRE_PAR_DEFAUT;
  });

  constructor() {
    effect(() => this.titre.setTitle(this.lienFace()));
    // Après le rendu, dans le navigateur seulement : met à jour le cookie `tz` si le fuseau a changé.
    afterNextRender(() => memoriserFuseau(this.document));
  }

  protected choisir(id: '20' | '50' | 'toutes'): void {
    this.ongletChoisi.set(id);
  }
}
