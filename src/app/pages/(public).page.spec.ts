import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import PublicLayout from './(public).page';

@Component({ template: '<h1>Page enfant</h1>' })
class Enfant {}

describe('Coque des pages publiques', () => {
  const render = async (url: string) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: PublicLayout,
            children: [
              { path: '', component: Enfant },
              { path: 'faq', component: Enfant },
            ],
          },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create(url);
    // routerLinkActive se met à jour après la navigation : un second rendu l'affiche.
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  };

  it('affiche la page enfant entre la navigation et le pied de page', async () => {
    const page = await render('/');
    expect(page.querySelector('header nav')).not.toBeNull();
    expect(page.querySelector('main h1')?.textContent).toBe('Page enfant');
    expect(page.querySelector('footer')).not.toBeNull();
  });

  it('propose un lien d’évitement vers le contenu', async () => {
    const page = await render('/');
    const lien = page.querySelector<HTMLAnchorElement>('.skip-link');
    expect(lien?.getAttribute('href')).toBe('#contenu');
    expect(page.querySelector('main')?.id).toBe('contenu');
  });

  it('marque la page courante dans la navigation', async () => {
    const page = await render('/faq');
    const courant = page.querySelectorAll('[aria-current="page"]');
    expect(courant.length).toBe(1);
    expect(courant[0].textContent?.trim()).toBe('FAQ');
  });
});
