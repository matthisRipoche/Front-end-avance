import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { connexionRequise } from '../../../auth/connexion-requise';
import type { FaceProgression, TableauDeBord } from '../../../modeles/tableau-de-bord';
import TableauDeBordPage, { routeMeta } from './index.page';
import { type ResultatTableau, chargerTableau } from './tableau-de-bord.donnees';

// Données fictives, en ms Unix fixes : 17 novembre 2026, 20:04 UTC = 21:04 à Paris.
const INSTANT = Date.UTC(2026, 10, 17, 20, 4);

const FORSAKEN: FaceProgression = {
  sid: 'Celeste/1-ForsakenCity',
  side: 'B',
  nom: 'Forsaken City',
  tentatives: 412,
  deathless: 0,
  dernierePartie: INSTANT,
  roomsAtteintes: 18,
  roomsVues: 24,
  progression: 0.75,
};

const OLD_SITE: FaceProgression = {
  sid: 'Celeste/2-OldSite',
  side: 'A',
  nom: 'Old Site',
  tentatives: 96,
  deathless: 1,
  dernierePartie: INSTANT - 3_600_000,
  roomsAtteintes: 31,
  roomsVues: 34,
  progression: 31 / 34,
};

const TABLEAU: TableauDeBord = {
  fuseau: 'Europe/Paris',
  reprendre: FORSAKEN,
  aujourdhui: {
    tentatives: 57,
    deathless: 1,
    plusLongueMs: 197_400,
    plusTravaillee: { sid: 'Celeste/2-OldSite', side: 'A', nom: 'Old Site', tentatives: 31 },
  },
  recentes: [OLD_SITE],
  activite: {
    jours: [
      { jour: '2026-11-16', tentatives: 40, deathless: 0 },
      { jour: '2026-11-17', tentatives: 57, deathless: 1 },
    ],
    max: 57,
  },
  enJeu: { sid: 'Celeste/1-ForsakenCity', side: 'B', nom: 'Forsaken City', room: 'b-06', debut: INSTANT },
  vide: false,
};

const VIDE: TableauDeBord = {
  fuseau: 'Europe/Paris',
  reprendre: null,
  aujourdhui: { tentatives: 0, deathless: 0, plusLongueMs: null, plusTravaillee: null },
  recentes: [],
  activite: { jours: [], max: 0 },
  enJeu: null,
  vide: true,
};

const ok = (donnees: TableauDeBord): ResultatTableau => ({ etat: 'ok', donnees });

describe('Tableau de bord', () => {
  const render = (tableau: ResultatTableau) => {
    TestBed.configureTestingModule({
      imports: [TableauDeBordPage],
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { data: of({ tableau }) } }],
    });
    const fixture = TestBed.createComponent(TableauDeBordPage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const section = (page: HTMLElement, titre: string) =>
    Array.from(page.querySelectorAll('section')).find((s) => s.querySelector('h2')?.textContent?.includes(titre));

  const texte = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  describe('avec des données', () => {
    it('affiche le titre et la ville du fuseau', () => {
      const page = render(ok({ ...TABLEAU, fuseau: 'America/New_York' }));
      expect(page.querySelector('h1')?.textContent).toContain('Tableau de bord');
      expect(texte(page)).toContain('Journées comptées en heure de New York');
    });

    it('propose de reprendre la dernière face, avec sa progression et sa date dans le fuseau', () => {
      const reprendre = section(render(ok(TABLEAU)), 'Reprendre');
      expect(texte(reprendre)).toContain('Forsaken City face B');
      expect(texte(reprendre)).toContain('Plus loin atteint 18 / 24 rooms · 75 %');
      expect(texte(reprendre)).toContain('412');
      expect(texte(reprendre)).toContain('17 novembre à 21:04');
      expect(reprendre?.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
        '18 rooms atteintes sur 24 vues',
      );
    });

    it('affiche les chiffres du jour, avec la pastille deathless dorée', () => {
      const jour = section(render(ok(TABLEAU)), 'Aujourd’hui');
      expect(texte(jour)).toContain('57');
      expect(texte(jour)).toContain('03:17');
      expect(texte(jour)).toContain('Old Site · A 31 tentatives');
      const pastille = jour?.querySelector('.cdt-result--deathless');
      expect(texte(pastille)).toBe('1 réussi');
      expect(pastille?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('n’a qu’un seul élément doré', () => {
      expect(render(ok(TABLEAU)).querySelectorAll('.cdt-result--deathless')).toHaveLength(1);
    });

    it('liste les faces récentes', () => {
      const recentes = section(render(ok(TABLEAU)), 'Faces récentes');
      const lignes = recentes?.querySelectorAll('li') ?? [];
      expect(lignes).toHaveLength(1);
      expect(texte(lignes[0])).toBe('Old Site A 31 / 34 96 tent. 17 novembre à 20:04');
    });

    it('affiche le graphique des 14 derniers jours', () => {
      const activite = section(render(ok(TABLEAU)), '14 derniers jours');
      expect(activite?.querySelector('cdt-activite-jours')).not.toBeNull();
      expect(texte(activite)).toContain('14 derniers jours Tentatives par jour · max 57');
    });

    it('affiche le bandeau « En jeu » avec la room et l’heure de début', () => {
      // Texte lu d'un bloc (lecteur d'écran, copier-coller) : les morceaux ne doivent pas se coller.
      const bandeau = render(ok(TABLEAU)).querySelector('.tableau__en-jeu');
      expect(texte(bandeau)).toBe('En jeu Forsaken City · B, room b-06 depuis le 17 novembre à 21:04');
    });

    it('ne met aucun lien vers une page qui n’existe pas encore', () => {
      const page = render(ok(TABLEAU));
      expect(page.querySelector('a[href^="/maps"]')).toBeNull();
      expect(page.querySelectorAll('a')).toHaveLength(0);
    });
  });

  describe('cas particuliers', () => {
    it('n’affiche pas de bandeau hors jeu', () => {
      const page = render(ok({ ...TABLEAU, enJeu: null }));
      expect(page.querySelector('.tableau__en-jeu')).toBeNull();
      expect(texte(page)).not.toContain('En jeu');
    });

    it('affiche le bandeau sans room quand Spring ne la connaît pas', () => {
      const page = render(ok({ ...TABLEAU, enJeu: { ...TABLEAU.enJeu!, room: null } }));
      expect(texte(page.querySelector('.tableau__en-jeu'))).toBe('En jeu Forsaken City · B depuis le 17 novembre à 21:04');
    });

    it('écrit « progression inconnue » quand aucune room n’est connue', () => {
      const inconnue = { ...FORSAKEN, roomsAtteintes: 0, roomsVues: 0, progression: null };
      const page = render(ok({ ...TABLEAU, reprendre: inconnue, recentes: [inconnue] }));
      expect(texte(section(page, 'Reprendre'))).toContain('progression inconnue');
      expect(texte(section(page, 'Faces récentes'))).toContain('progression inconnue');
      expect(texte(page)).not.toContain('0 / 0');
    });

    it('écrit 0 deathless sans pastille dorée', () => {
      const page = render(ok({ ...TABLEAU, aujourdhui: { ...TABLEAU.aujourdhui, deathless: 0 } }));
      expect(page.querySelector('.cdt-result--deathless')).toBeNull();
      const stats = Array.from(section(page, 'Aujourd’hui')?.querySelectorAll('.cdt-stat') ?? []);
      const deathless = stats.find((s) => texte(s.querySelector('dt')) === 'Deathless');
      expect(texte(deathless?.querySelector('dd'))).toBe('0');
    });

    it('accorde « réussis » au pluriel', () => {
      const page = render(ok({ ...TABLEAU, aujourdhui: { ...TABLEAU.aujourdhui, deathless: 3 } }));
      expect(texte(page.querySelector('.cdt-result--deathless'))).toBe('3 réussis');
    });
  });

  describe('nouveau joueur', () => {
    it('explique comment commencer et renvoie vers la page du mod', () => {
      const page = render(ok(VIDE));
      expect(texte(page)).toContain('Aucune tentative pour l’instant');
      expect(Array.from(page.querySelectorAll('ol li'), (li) => texte(li))).toEqual([
        '1 Installe le mod dans Everest',
        '2 Associe ton jeu à ce compte avec le code affiché en jeu',
        '3 Lance une face : chaque tentative arrive ici',
      ]);
      expect(page.querySelector('a[href="/mod"]')?.textContent).toContain('Voir comment installer le mod');
      expect(section(page, 'Reprendre')).toBeUndefined();
      expect(page.querySelector('cdt-activite-jours')).toBeNull();
    });
  });

  describe('API en panne', () => {
    it('affiche l’alerte et un lien pour réessayer', () => {
      const page = render({ etat: 'erreur', statut: 503 });
      const alerte = page.querySelector('[role="alert"]');
      expect(texte(alerte)).toContain('Les données ne répondent pas pour l’instant.');
      expect(alerte?.querySelector('a[href="/tableau-de-bord"]')?.textContent).toContain('Réessayer');
      expect(section(page, 'Reprendre')).toBeUndefined();
    });

    it('n’affiche pas l’alerte pour une session expirée, déjà redirigée', () => {
      const page = render({ etat: 'erreur', statut: 401 });
      expect(page.querySelector('[role="alert"]')).toBeNull();
      expect(page.querySelector('h1')?.textContent).toContain('Tableau de bord');
    });
  });

  it('est réservée aux joueurs connectés, non indexée, et chargée par le résolveur', () => {
    expect(routeMeta.canActivate).toContain(connexionRequise);
    expect(routeMeta.meta).toContainEqual({ name: 'robots', content: 'noindex' });
    expect(routeMeta.resolve.tableau).toBe(chargerTableau);
  });
});
