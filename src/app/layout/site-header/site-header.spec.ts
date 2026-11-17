import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { CLE_ETAT_SESSION } from '../../auth/session';
import type { EtatSession, Utilisateur } from '../../auth/session-contrat';
import { SiteHeader } from './site-header';

@Component({ template: '' })
class Vide {}

const JOUEUR: Utilisateur = {
  id: 7,
  email: 'madeline@exemple.fr',
  createdAt: '2026-10-01T10:00:00Z',
  discordUsername: null,
  discordAvatarUrl: null,
};

const CONNECTE: EtatSession = { statut: 'connecte', utilisateur: JOUEUR };

/** Laisse les promesses en attente s'exécuter. */
const attendre = () => new Promise((r) => setTimeout(r));

async function monter(url: string, etat: EtatSession = { statut: 'anonyme' }) {
  TestBed.configureTestingModule({
    imports: [SiteHeader],
    providers: [
      provideRouter([{ path: '**', component: Vide }]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: PLATFORM_ID, useValue: 'browser' },
    ],
  });
  // L'état arrive du serveur par TransferState, comme dans l'application.
  TestBed.inject(TransferState).set(CLE_ETAT_SESSION, etat);
  const router = TestBed.inject(Router);
  await router.navigateByUrl(url);
  const fixture = TestBed.createComponent(SiteHeader);
  fixture.detectChanges();
  return {
    fixture,
    router,
    nav: fixture.nativeElement as HTMLElement,
    http: TestBed.inject(HttpTestingController),
  };
}

const boutonDeconnexion = (nav: HTMLElement) =>
  [...nav.querySelectorAll('button')].find((b) => b.textContent?.includes('Se déconnecter'));

describe('Navigation des pages publiques', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=jeton-test; path=/';
  });

  it('propose « Se connecter » sur les pages publiques', async () => {
    const { nav } = await monter('/faq');
    expect(nav.querySelector('a[href="/login"]')?.textContent).toContain('Se connecter');
  });

  it('propose « Créer un compte » sur la page de connexion', async () => {
    const { nav } = await monter('/login?redirect=/mes-maps');
    expect(nav.querySelector('a[href="/login"]')).toBeNull();
    expect(nav.querySelector('a[href="/inscription"]')?.textContent).toContain('Créer un compte');
  });

  it('propose « Se connecter » quand l’état de la session est inconnu', async () => {
    const { nav } = await monter('/faq', { statut: 'inconnu' });
    expect(nav.querySelector('a[href="/login"]')?.textContent).toContain('Se connecter');
    expect(boutonDeconnexion(nav)).toBeUndefined();
  });

  it('montre le compte, le tableau de bord et la déconnexion au joueur connecté', async () => {
    const { nav } = await monter('/faq', CONNECTE);
    expect(nav.textContent).toContain('madeline@exemple.fr');
    expect(nav.querySelector('a[href="/tableau-de-bord"]')?.textContent).toContain('Tableau de bord');
    expect(boutonDeconnexion(nav)).toBeDefined();
    expect(nav.querySelector('a[href="/login"]')).toBeNull();
    expect(nav.textContent).not.toContain('Se connecter');
  });

  it('propose « Mes maps » au joueur connecté', async () => {
    const { nav } = await monter('/faq', CONNECTE);
    const lien = nav.querySelector('a[href="/maps"]');
    expect(lien?.textContent).toContain('Mes maps');
    expect(lien?.getAttribute('aria-current')).toBeNull();
  });

  it('marque « Mes maps » comme page courante sur /maps', async () => {
    const { fixture, nav } = await monter('/maps?tri=alpha', CONNECTE);
    // routerLinkActive calcule son état après le premier rendu : un second passage l'affiche.
    await fixture.whenStable();
    fixture.detectChanges();
    expect(nav.querySelector('a[href="/maps"]')?.getAttribute('aria-current')).toBe('page');
  });

  it('ne propose pas « Mes maps » à un anonyme', async () => {
    const { nav } = await monter('/faq');
    expect(nav.querySelector('a[href="/maps"]')).toBeNull();
    expect(nav.textContent).not.toContain('Mes maps');
  });

  it('montre le pseudo Discord d’un compte sans email', async () => {
    const etat: EtatSession = {
      statut: 'connecte',
      utilisateur: { ...JOUEUR, email: null, discordUsername: 'madeline_discord' },
    };
    const { nav } = await monter('/faq', etat);
    expect(nav.textContent).toContain('madeline_discord');
  });

  it('déconnecte, repasse sur « Se connecter » et quitte une page connectée', async () => {
    const { fixture, router, nav, http } = await monter('/tableau-de-bord', CONNECTE);
    const naviguer = vi.spyOn(router, 'navigateByUrl');

    boutonDeconnexion(nav)!.click();
    fixture.detectChanges();
    expect(boutonDeconnexion(nav)?.getAttribute('aria-busy')).toBe('true');

    await attendre();
    const req = http.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await attendre();
    fixture.detectChanges();

    expect(nav.querySelector('a[href="/login"]')?.textContent).toContain('Se connecter');
    expect(boutonDeconnexion(nav)).toBeUndefined();
    expect(naviguer).toHaveBeenCalledWith('/');
    http.verify();
  });

  it('reste sur une page publique après la déconnexion', async () => {
    const { fixture, router, nav, http } = await monter('/faq', CONNECTE);
    const naviguer = vi.spyOn(router, 'navigateByUrl');

    boutonDeconnexion(nav)!.click();
    await attendre();
    http.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await attendre();
    fixture.detectChanges();

    expect(nav.querySelector('a[href="/login"]')).not.toBeNull();
    expect(naviguer).not.toHaveBeenCalled();
    http.verify();
  });

  it('annonce l’échec de la déconnexion sans casser la navigation', async () => {
    const { fixture, nav, http } = await monter('/faq', CONNECTE);

    boutonDeconnexion(nav)!.click();
    await attendre();
    http.expectOne('/api/auth/logout').flush(null, { status: 502, statusText: 'Bad Gateway' });
    await attendre();
    fixture.detectChanges();

    expect(nav.querySelector('[role="status"]')?.textContent).toContain('Déconnexion impossible pour l’instant. Réessaie.');
    expect(boutonDeconnexion(nav)?.getAttribute('aria-busy')).toBe('false');
    expect(nav.querySelector('a[href="/tableau-de-bord"]')).not.toBeNull();
    http.verify();
  });
});
