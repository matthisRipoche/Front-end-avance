import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { connexionRequise } from '../../../auth/connexion-requise';
import { Session } from '../../../auth/session';
import TableauDeBord, { routeMeta } from './index.page';

describe('Tableau de bord provisoire', () => {
  const render = (utilisateur: { email: string | null; discordUsername: string | null }) => {
    TestBed.configureTestingModule({
      imports: [TableauDeBord],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(Session).definir({
      id: 1,
      createdAt: '2026-11-16T00:00:00Z',
      discordAvatarUrl: null,
      ...utilisateur,
    });
    const fixture = TestBed.createComponent(TableauDeBord);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('affiche le titre et l’email du joueur connecté', () => {
    const page = render({ email: 'lucie@exemple.fr', discordUsername: null });
    expect(page.querySelector('h1')?.textContent).toContain('Tableau de bord');
    expect(page.querySelector('strong')?.textContent).toBe('lucie@exemple.fr');
  });

  it('affiche le pseudo Discord d’un compte sans email', () => {
    const page = render({ email: null, discordUsername: 'lucie_madeline' });
    expect(page.querySelector('strong')?.textContent).toBe('lucie_madeline');
  });

  it('prévient que la page est provisoire et ramène à l’accueil', () => {
    const page = render({ email: 'lucie@exemple.fr', discordUsername: null });
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Page provisoire');
    expect(page.querySelector('a[href="/"]')).not.toBeNull();
  });

  it('est réservée aux joueurs connectés et non indexée', () => {
    expect(routeMeta.canActivate).toContain(connexionRequise);
    expect(routeMeta.meta).toContainEqual({ name: 'robots', content: 'noindex' });
  });
});
