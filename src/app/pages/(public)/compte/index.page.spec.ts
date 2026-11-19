import { Component, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Compte } from '../../../auth/compte';
import { CLE_ETAT_SESSION } from '../../../auth/session';
import type { Utilisateur } from '../../../auth/session-contrat';
import { connexionRequise } from '../../../auth/connexion-requise';
import ComptePage, { routeMeta } from './index.page';

@Component({ template: '' })
class Vide {}

const JOUEUR: Utilisateur = {
  id: 7,
  email: 'madeline@exemple.fr',
  createdAt: '2026-10-01T10:00:00Z',
  discordUsername: null,
  discordAvatarUrl: null,
};

const attendre = () => new Promise((r) => setTimeout(r));

function monter(utilisateur: Utilisateur, deconnecter = vi.fn().mockResolvedValue(undefined)) {
  TestBed.configureTestingModule({
    imports: [ComptePage],
    providers: [
      provideRouter([{ path: '**', component: Vide }]),
      { provide: PLATFORM_ID, useValue: 'browser' },
      { provide: Compte, useValue: { deconnecter } },
    ],
  });
  TestBed.inject(TransferState).set(CLE_ETAT_SESSION, { statut: 'connecte', utilisateur });
  const fixture = TestBed.createComponent(ComptePage);
  fixture.detectChanges();
  return { fixture, page: fixture.nativeElement as HTMLElement, deconnecter, router: TestBed.inject(Router) };
}

const bouton = (page: HTMLElement) => page.querySelector('button') as HTMLButtonElement;

describe('Page Compte', () => {
  it('affiche l’email du joueur', () => {
    const { page } = monter(JOUEUR);
    expect(page.textContent).toContain('madeline@exemple.fr');
    expect(page.textContent).not.toContain('Pseudo Discord');
  });

  it('se replie sur le pseudo Discord sans email', () => {
    const { page } = monter({ ...JOUEUR, email: null, discordUsername: 'madeline#1' });
    expect(page.querySelector('.compte__nom')?.textContent).toContain('madeline#1');
    expect(page.textContent).toContain('Pseudo Discord');
  });

  it('n’affiche pas la date de création', () => {
    const { page } = monter(JOUEUR);
    expect(page.textContent).not.toContain('2026');
  });

  it('déconnecte puis renvoie vers l’accueil', async () => {
    const { page, deconnecter, router } = monter(JOUEUR);
    const naviguer = vi.spyOn(router, 'navigateByUrl');
    bouton(page).click();
    await attendre();
    expect(deconnecter).toHaveBeenCalledOnce();
    expect(naviguer).toHaveBeenCalledWith('/');
  });

  it('affiche un message si la déconnexion échoue', async () => {
    const { fixture, page, router } = monter(JOUEUR, vi.fn().mockRejectedValue(new Error('x')));
    const naviguer = vi.spyOn(router, 'navigateByUrl');
    bouton(page).click();
    await attendre();
    fixture.detectChanges();
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Déconnexion impossible');
    expect(naviguer).not.toHaveBeenCalled();
  });
});

describe('Page Compte : route', () => {
  it('exige une connexion', () => {
    expect(routeMeta.canActivate).toContain(connexionRequise);
  });
});
