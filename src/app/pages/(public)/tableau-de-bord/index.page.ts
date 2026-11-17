import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RouteMeta } from '@analogjs/router';
import { map } from 'rxjs';

import { connexionRequise } from '../../../auth/connexion-requise';
import { memoriserFuseau } from '../../../auth/fuseau';
import type { FaceProgression } from '../../../modeles/tableau-de-bord';
import { ActiviteJoursGraphique } from '../../../ui/activite-jours/activite-jours';
import { formaterChrono, formaterDate, formaterPourcentage, villeDuFuseau } from '../../../format/format';
import { type ResultatTableau, chargerTableau } from './tableau-de-bord.donnees';

export const routeMeta = {
  title: 'Tableau de bord · Celeste Death Tracker',
  meta: [{ name: 'robots', content: 'noindex' }],
  // Page connectée : aussi listée dans PAGES_CONNECTEES (session-contrat.ts), que le middleware
  // Nitro lit pour rediriger avant le rendu. Jamais prérendue.
  canActivate: [connexionRequise],
  // Les données arrivent avant le composant : le HTML du serveur est déjà rempli (voir chargerTableau).
  resolve: { tableau: chargerTableau },
} satisfies RouteMeta;

/** Une face mise en forme pour l'affichage : chiffres et date déjà écrits. */
type FaceAffichee = {
  cle: string;
  nom: string;
  side: string;
  tentatives: number;
  derniere: string;
  /** « 18 / 24 », ou null si la progression est inconnue. */
  rooms: string | null;
  pourcentage: string | null;
  /** Largeur de la barre, en %. */
  largeur: number;
  libelleBarre: string;
};

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/**
 * Tableau de bord du joueur connecté : reprendre la dernière face, chiffres du jour, activité sur
 * 14 jours, faces récentes, ou l'accueil d'un nouveau joueur.
 *
 * Les données viennent du résolveur `chargerTableau` (`routeMeta.resolve`) et non d'un appel dans
 * le composant : pendant le SSR, la page sort déjà remplie, sans état de chargement, et le navigateur
 * retrouve la même réponse dans le TransferState au moment de l'hydratation. Toutes les dates sont
 * écrites dans le fuseau porté par les données, pour que serveur et navigateur écrivent le même texte.
 */
@Component({
  selector: 'app-tableau-de-bord',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ActiviteJoursGraphique],
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
})
export default class TableauDeBordPage {
  private readonly document = inject(DOCUMENT);

  private readonly resultat = toSignal(
    inject(ActivatedRoute).data.pipe(map((d) => d['tableau'] as ResultatTableau)),
    { requireSync: true },
  );

  /** Données du tableau, ou null en cas d'erreur. */
  protected readonly donnees = computed(() => {
    const r = this.resultat();
    return r.etat === 'ok' ? r.donnees : null;
  });

  /** Vrai pour une panne de l'API (le 401 est déjà redirigé vers la connexion). */
  protected readonly enErreur = computed(() => {
    const r = this.resultat();
    return r.etat === 'erreur' && r.statut !== 401;
  });

  protected readonly vide = computed(() => this.donnees()?.vide ?? false);

  protected readonly ville = computed(() => {
    const d = this.donnees();
    return d ? villeDuFuseau(d.fuseau) : null;
  });

  protected readonly enJeu = computed(() => {
    const d = this.donnees();
    if (!d?.enJeu) return null;
    const { nom, side, room, debut } = d.enJeu;
    // La room peut manquer quand Spring ne l'a pas encore reçue.
    const face = `${nom} · ${side}`;
    return { libelle: room ? `${face}, room` : face, room, debut: formaterDate(debut, d.fuseau) };
  });

  protected readonly reprendre = computed(() => {
    const d = this.donnees();
    return d?.reprendre ? this.versAffichage(d.reprendre, d.fuseau) : null;
  });

  protected readonly aujourdhui = computed(() => {
    const d = this.donnees();
    if (!d) return null;
    const { tentatives, deathless, plusLongueMs, plusTravaillee } = d.aujourdhui;
    return {
      tentatives,
      deathless,
      // « deathless » est invariable, « réussi » s'accorde.
      deathlessTexte: pluriel(deathless, 'réussi'),
      plusLongue: formaterChrono(plusLongueMs),
      plusTravaillee: plusTravaillee
        ? {
            face: `${plusTravaillee.nom} · ${plusTravaillee.side}`,
            tentatives: pluriel(plusTravaillee.tentatives, 'tentative'),
          }
        : null,
    };
  });

  protected readonly activite = computed(() => this.donnees()?.activite ?? null);

  protected readonly recentes = computed(() => {
    const d = this.donnees();
    return d ? d.recentes.map((f) => this.versAffichage(f, d.fuseau)) : [];
  });

  constructor() {
    // Après le rendu, dans le navigateur seulement : met à jour le cookie `tz` si le fuseau a changé,
    // pour que la prochaine visite coupe les journées à la bonne heure.
    afterNextRender(() => memoriserFuseau(this.document));
  }

  private versAffichage(f: FaceProgression, fuseau: string): FaceAffichee {
    const connue = f.progression !== null;
    return {
      cle: `${f.sid}|${f.side}`,
      nom: f.nom,
      side: f.side,
      tentatives: f.tentatives,
      derniere: formaterDate(f.dernierePartie, fuseau),
      rooms: connue ? `${f.roomsAtteintes} / ${f.roomsVues}` : null,
      pourcentage: connue ? formaterPourcentage(f.progression!) : null,
      largeur: connue ? Math.round(Math.min(1, Math.max(0, f.progression!)) * 100) : 0,
      libelleBarre: connue
        ? `${pluriel(f.roomsAtteintes, 'room')} atteinte${f.roomsAtteintes > 1 ? 's' : ''} sur ${f.roomsVues} vue${f.roomsVues > 1 ? 's' : ''}`
        : 'Progression inconnue',
    };
  }
}
