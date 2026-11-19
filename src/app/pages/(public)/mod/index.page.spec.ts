import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import Mod from './index.page';

describe('Page du mod', () => {
  const render = () => {
    TestBed.configureTestingModule({ imports: [Mod], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Mod);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('dit que le mod n’est pas encore publié, sans rôle status inutile', () => {
    const alerte = render().querySelector('.cdt-alert');
    expect(alerte?.textContent).toContain('Pas encore publié');
    expect(alerte?.hasAttribute('role')).toBe(false);
  });

  it('rend les blocs de code atteignables au clavier', () => {
    const blocs = render().querySelectorAll('pre.code');
    expect(blocs.length).toBe(2);
    blocs.forEach((b) => expect(b.getAttribute('tabindex')).toBe('0'));
  });

  it('mène du bouton principal aux étapes d’installation', () => {
    const page = render();
    expect(page.querySelector('.cdt-btn--primary')?.getAttribute('href')).toBe('/mod#installer');
    expect(page.querySelector('#installer')).not.toBeNull();
    expect(page.querySelectorAll('.install__step').length).toBe(4);
  });

  it('donne les commandes à copier', () => {
    const commandes = [...render().querySelectorAll('pre code')].map((c) => c.textContent);
    expect(commandes[0]).toContain('git clone https://github.com/matthisRipoche/CelesteDeathTracker.git');
    expect(commandes[1]).toContain('dotnet build CelesteDeathTracker -c Release');
  });

  it('réserve un emplacement légendé pour chaque capture', () => {
    const emplacements = render().querySelectorAll('figure.cdt-slot');
    expect(emplacements.length).toBe(8);
    emplacements.forEach((e) => expect(e.querySelector('figcaption')?.textContent?.trim()).not.toBe(''));
  });
});
