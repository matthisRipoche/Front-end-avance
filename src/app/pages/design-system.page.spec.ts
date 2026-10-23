import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';

import DesignSystemPage from './design-system.page';

describe('Page /design-system', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DesignSystemPage] }).compileComponents();
  });

  afterEach(() => TestBed.inject(DOCUMENT).documentElement.removeAttribute('data-theme'));

  it('présente les sections du design system', () => {
    const fixture = TestBed.createComponent(DesignSystemPage);
    fixture.detectChanges();
    const titles = [...fixture.nativeElement.querySelectorAll('h2')].map((h: HTMLElement) => h.textContent?.trim());
    expect(titles).toEqual(['Couleurs', 'Typographie', 'Espacement et formes', 'Composants']);
  });

  it('force le thème sur <html>, puis revient au thème du système', () => {
    const fixture = TestBed.createComponent(DesignSystemPage);
    fixture.detectChanges();
    const root = TestBed.inject(DOCUMENT).documentElement;
    const button = (label: string) =>
      [...fixture.nativeElement.querySelectorAll('[aria-label="Thème"] button')].find(
        (b: HTMLElement) => b.textContent?.trim() === label,
      ) as HTMLButtonElement;

    button('Clair').click();
    fixture.detectChanges();
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(button('Clair').getAttribute('aria-pressed')).toBe('true');

    button('Système').click();
    expect(root.hasAttribute('data-theme')).toBe(false);
  });
});
