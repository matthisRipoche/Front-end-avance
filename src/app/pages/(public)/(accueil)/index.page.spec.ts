import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import Home from './index.page';

describe('Page d’accueil', () => {
  const render = () => {
    TestBed.configureTestingModule({ imports: [Home], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('annonce la promesse du site', () => {
    expect(render().querySelector('h1')?.textContent).toContain('Ton deathless, tentative par tentative.');
  });

  it('signale que les données d’exemple sont fictives', () => {
    expect(render().textContent).toContain('exemple, données fictives');
  });

  it('ne montre qu’un seul élément doré : le deathless', () => {
    const page = render();
    expect(page.querySelectorAll('.cdt-result--deathless').length).toBe(1);
    expect(page.querySelectorAll('.cdt-reach--deathless').length).toBe(1);
  });

  it('dit que le mod n’est pas encore publié, sans rôle status inutile', () => {
    const alerte = render().querySelector('.cdt-alert');
    expect(alerte?.textContent).toContain('pas encore publié');
    expect(alerte?.hasAttribute('role')).toBe(false);
  });

  it('mène « Créer un compte » vers /inscription', () => {
    const liens = [...render().querySelectorAll('a')];
    const lien = liens.find((a) => a.textContent?.includes('Créer un compte'));
    expect(lien?.getAttribute('href')).toBe('/inscription');
  });

  it('donne un rôle sémantique à tout élément qui porte un aria-label', () => {
    render()
      .querySelectorAll('[aria-label]')
      .forEach((e) => expect(e.getAttribute('role') ?? e.tagName.match(/^(A|BUTTON|INPUT|NAV|SECTION)$/)).toBeTruthy());
  });
});
