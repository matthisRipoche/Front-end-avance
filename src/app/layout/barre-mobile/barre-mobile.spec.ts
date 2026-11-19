import { provideHttpClient } from '@angular/common/http';
import { Component, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { CLE_ETAT_SESSION } from '../../auth/session';
import type { EtatSession, Utilisateur } from '../../auth/session-contrat';
import { BarreMobile } from './barre-mobile';

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

async function monter(url: string, etat: EtatSession = CONNECTE) {
  TestBed.configureTestingModule({
    imports: [BarreMobile],
    providers: [
      provideRouter([{ path: '**', component: Vide }]),
      provideHttpClient(),
      { provide: PLATFORM_ID, useValue: 'browser' },
    ],
  });
  // L'état arrive du serveur par TransferState, comme dans l'application.
  TestBed.inject(TransferState).set(CLE_ETAT_SESSION, etat);
  await TestBed.inject(Router).navigateByUrl(url);
  const fixture = TestBed.createComponent(BarreMobile);
  fixture.detectChanges();
  // routerLinkActive calcule son état après le premier rendu : un second passage l'affiche.
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

/** Adresses des entrées marquées comme page courante. */
const actives = (el: HTMLElement) =>
  [...el.querySelectorAll('a[aria-current="page"]')].map((a) => a.getAttribute('href'));

describe('Barre de navigation mobile', () => {
  it('n’affiche rien à un anonyme', async () => {
    const el = await monter('/faq', { statut: 'anonyme' });
    expect(el.querySelector('nav')).toBeNull();
  });

  it('ne réserve aucun espace à un anonyme, et en réserve un au joueur connecté', async () => {
    const anonyme = await monter('/faq', { statut: 'anonyme' });
    expect(anonyme.querySelector('.barre-mobile__espaceur')).toBeNull();
    TestBed.resetTestingModule();
    const connecte = await monter('/faq');
    expect(connecte.querySelector('.barre-mobile__espaceur')).not.toBeNull();
  });

  it('n’affiche rien quand l’état de la session est inconnu', async () => {
    const el = await monter('/faq', { statut: 'inconnu' });
    expect(el.querySelector('nav')).toBeNull();
  });

  it('propose trois liens au joueur connecté', async () => {
    const el = await monter('/faq');
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Navigation du compte');
    const liens = [...el.querySelectorAll('nav a')];
    expect(liens.map((a) => a.getAttribute('href'))).toEqual(['/tableau-de-bord', '/maps', '/compte']);
    expect(liens.map((a) => a.textContent?.trim())).toEqual(['Tableau de bord', 'Mes maps', 'Compte']);
  });

  it.each([
    ['/tableau-de-bord', '/tableau-de-bord'],
    ['/maps', '/maps'],
    ['/maps/face?sid=x&side=A', '/maps'],
    ['/compte', '/compte'],
  ])('marque la bonne entrée comme page courante sur %s', async (url, attendue) => {
    expect(actives(await monter(url))).toEqual([attendue]);
  });

  it('ne marque aucune entrée sur une page publique', async () => {
    expect(actives(await monter('/faq'))).toEqual([]);
  });

  it('cache les icônes aux lecteurs d’écran', async () => {
    const icones = (await monter('/faq')).querySelectorAll('svg');
    expect(icones.length).toBe(3);
    icones.forEach((svg) => expect(svg.getAttribute('aria-hidden')).toBe('true'));
  });
});
