import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, type RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { REQUEST, RESPONSE } from '@analogjs/router/tokens';

import { connexionRequise } from './connexion-requise';
import { CLE_ETAT_SESSION } from './session';
import { CLE_SESSION, type EtatSession, type Utilisateur } from './session-contrat';

const JOUEUR: Utilisateur = {
  id: 7,
  email: 'madeline@exemple.fr',
  createdAt: '2026-10-01T10:00:00Z',
  discordUsername: null,
  discordAvatarUrl: null,
};

/** Fausse réponse Node : statut et en-têtes posés par la garde. */
const fausseReponse = () => {
  const entetes: Record<string, string> = {};
  return {
    statusCode: 200,
    entetes,
    setHeader: (nom: string, valeur: string) => {
      entetes[nom.toLowerCase()] = valeur;
    },
  };
};

const garder = (plateforme: 'server' | 'browser', etat: EtatSession, reponse?: object) => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: PLATFORM_ID, useValue: plateforme },
      // Côté serveur, l'état vient de la requête Node, posé par le middleware ; dans le
      // navigateur, du TransferState rempli par le rendu serveur.
      ...(plateforme === 'server' ? [{ provide: REQUEST, useValue: { [CLE_SESSION]: etat } }] : []),
      ...(reponse ? [{ provide: RESPONSE, useValue: reponse }] : []),
    ],
  });
  if (plateforme === 'browser') TestBed.inject(TransferState).set(CLE_ETAT_SESSION, etat);
  const state = { url: '/tableau-de-bord' } as RouterStateSnapshot;
  return TestBed.runInInjectionContext(() =>
    connexionRequise({} as ActivatedRouteSnapshot, state),
  ) as Promise<boolean | UrlTree>;
};

describe('Garde connexionRequise côté serveur', () => {
  it('laisse passer un joueur connecté sans toucher à la réponse', async () => {
    const reponse = fausseReponse();
    expect(await garder('server', { statut: 'connecte', utilisateur: JOUEUR }, reponse)).toBe(true);
    expect(reponse.statusCode).toBe(200);
  });

  it('répond 302 vers la connexion pour un anonyme', async () => {
    const reponse = fausseReponse();
    expect(await garder('server', { statut: 'anonyme' }, reponse)).toBe(false);
    expect(reponse.statusCode).toBe(302);
    expect(reponse.entetes['location']).toBe('/login?redirect=%2Ftableau-de-bord');
  });

  it('répond 503 sans appeler Spring quand l’état est inconnu', async () => {
    const reponse = fausseReponse();
    expect(await garder('server', { statut: 'inconnu' }, reponse)).toBe(false);
    expect(reponse.statusCode).toBe(503);
    TestBed.inject(HttpTestingController).verify();
  });
});

describe('Garde connexionRequise dans le navigateur', () => {
  it('laisse passer un joueur connecté', async () => {
    expect(await garder('browser', { statut: 'connecte', utilisateur: JOUEUR })).toBe(true);
  });

  it('envoie un anonyme vers la connexion, avec la page demandée en retour', async () => {
    const resultat = await garder('browser', { statut: 'anonyme' });
    expect(resultat).toBeInstanceOf(UrlTree);
    expect(String(resultat)).toBe('/login?redirect=%2Ftableau-de-bord');
  });

  it('demande à Spring quand l’état est inconnu, puis décide : connecté', async () => {
    const decision = garder('browser', { statut: 'inconnu' });
    TestBed.inject(HttpTestingController).expectOne('/api/auth/me').flush(JOUEUR);
    expect(await decision).toBe(true);
  });

  it('demande à Spring quand l’état est inconnu, puis décide : anonyme', async () => {
    const decision = garder('browser', { statut: 'inconnu' });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/me')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(String(await decision)).toBe('/login?redirect=%2Ftableau-de-bord');
  });

  it('reste sur place si l’API est toujours en panne', async () => {
    const decision = garder('browser', { statut: 'inconnu' });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/me')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    expect(await decision).toBe(false);
  });
});
