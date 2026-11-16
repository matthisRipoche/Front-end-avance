import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { REQUEST } from '@analogjs/router/tokens';

import { CLE_ETAT_SESSION, Session } from './session';
import { CLE_SESSION, type EtatSession, type Utilisateur } from './session-contrat';

const JOUEUR: Utilisateur = {
  id: 7,
  email: 'madeline@exemple.fr',
  createdAt: '2026-10-01T10:00:00Z',
  discordUsername: null,
  discordAvatarUrl: null,
};

type Options = {
  plateforme: 'server' | 'browser';
  requete?: object;
  transfert?: EtatSession;
};

const preparer = ({ plateforme, requete, transfert }: Options) => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: PLATFORM_ID, useValue: plateforme },
      ...(requete ? [{ provide: REQUEST, useValue: requete }] : []),
    ],
  });
  if (transfert) TestBed.inject(TransferState).set(CLE_ETAT_SESSION, transfert);
  const session = TestBed.inject(Session);
  return { session, http: TestBed.inject(HttpTestingController) };
};

/** Laisse l'application se stabiliser, puis les promesses en attente s'exécuter. */
const stabiliser = async () => {
  await TestBed.inject(ApplicationRef).whenStable();
  await new Promise((r) => setTimeout(r));
};

describe('Session côté serveur', () => {
  it('lit l’état posé par le middleware sur la requête et le transmet au navigateur', () => {
    const etat: EtatSession = { statut: 'connecte', utilisateur: JOUEUR };
    const { session } = preparer({ plateforme: 'server', requete: { [CLE_SESSION]: etat } });

    expect(session.etat()).toEqual(etat);
    expect(session.utilisateur()).toEqual(JOUEUR);
    expect(TestBed.inject(TransferState).get(CLE_ETAT_SESSION, null)).toEqual(etat);
  });

  it('reste inconnu sans requête (prérendu au build)', () => {
    const { session } = preparer({ plateforme: 'server' });

    expect(session.etat()).toEqual({ statut: 'inconnu' });
    expect(session.utilisateur()).toBeNull();
    expect(TestBed.inject(TransferState).get(CLE_ETAT_SESSION, null)).toEqual({ statut: 'inconnu' });
  });

  it('reste inconnu si le middleware n’a rien posé', () => {
    const { session } = preparer({ plateforme: 'server', requete: {} });
    expect(session.etat()).toEqual({ statut: 'inconnu' });
  });
});

describe('Session dans le navigateur', () => {
  it('reprend l’état du serveur sans rappeler Spring', async () => {
    const { session, http } = preparer({
      plateforme: 'browser',
      transfert: { statut: 'connecte', utilisateur: JOUEUR },
    });
    await stabiliser();

    expect(session.utilisateur()).toEqual(JOUEUR);
    http.expectNone('/api/auth/me');
  });

  it('n’appelle Spring qu’après la stabilisation de l’application', async () => {
    const { session, http } = preparer({ plateforme: 'browser' });

    expect(session.etat()).toEqual({ statut: 'inconnu' });
    http.expectNone('/api/auth/me');

    await stabiliser();
    http.expectOne('/api/auth/me');
  });

  it('demande à Spring après la stabilisation si l’état est inconnu : 200 → connecté', async () => {
    const { session, http } = preparer({ plateforme: 'browser' });
    await stabiliser();

    http.expectOne('/api/auth/me').flush(JOUEUR);
    await new Promise((r) => setTimeout(r));

    expect(session.etat()).toEqual({ statut: 'connecte', utilisateur: JOUEUR });
  });

  it('passe anonyme quand Spring répond 401', async () => {
    const { session, http } = preparer({ plateforme: 'browser' });
    await stabiliser();

    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await new Promise((r) => setTimeout(r));

    expect(session.etat()).toEqual({ statut: 'anonyme' });
  });

  it('reste inconnu quand l’API est en panne', async () => {
    const { session, http } = preparer({ plateforme: 'browser' });
    await stabiliser();

    http.expectOne('/api/auth/me').flush(null, { status: 502, statusText: 'Bad Gateway' });
    await new Promise((r) => setTimeout(r));

    expect(session.etat()).toEqual({ statut: 'inconnu' });
  });

  it('definir met à jour l’état après une connexion ou une déconnexion', () => {
    const { session } = preparer({ plateforme: 'browser', transfert: { statut: 'anonyme' } });

    session.definir(JOUEUR);
    expect(session.etat()).toEqual({ statut: 'connecte', utilisateur: JOUEUR });

    session.definir(null);
    expect(session.etat()).toEqual({ statut: 'anonyme' });
    expect(session.utilisateur()).toBeNull();
  });
});
