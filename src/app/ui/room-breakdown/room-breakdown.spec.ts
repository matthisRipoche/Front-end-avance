import { TestBed } from '@angular/core/testing';

import { RoomBreakdown, type RoomStops } from './room-breakdown';

const ROOMS: RoomStops[] = [
  { id: 'b-04', stops: 3 },
  { id: 'b-05', stops: 12 },
  { id: 'b-06', stops: 1 },
];

describe('Répartition par room', () => {
  const render = (rooms: RoomStops[] = ROOMS) => {
    TestBed.configureTestingModule({ imports: [RoomBreakdown] });
    const fixture = TestBed.createComponent(RoomBreakdown);
    fixture.componentRef.setInput('rooms', rooms);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  const lignes = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('[role="listitem"]'));
  const texte = (el: Element) => el.textContent?.replace(/\s+/g, ' ').trim();

  it('se présente comme une liste de lignes', () => {
    const el = render();
    expect(el.getAttribute('role')).toBe('list');
    expect(lignes(el)).toHaveLength(3);
  });

  it('masque la barre aux lecteurs d’écran', () => {
    for (const ligne of lignes(render())) {
      expect(ligne.querySelector('.cdt-rooms__track')?.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('ajoute l’unité en texte masqué, accordée au nombre', () => {
    const [a, b, c] = lignes(render());
    expect(texte(a)).toContain('3 arrêts');
    expect(texte(b)).toContain('12 arrêts');
    expect(texte(c)).toContain('1 arrêt');
    expect(texte(c)).not.toContain('1 arrêts');
    expect(a.querySelector('.cdt-rooms__count .cdt-sr-only')).not.toBeNull();
  });

  it('signale « la plus fréquente » seulement sur la pire room', () => {
    const [a, b, c] = lignes(render());
    expect(texte(b)).toContain('la plus fréquente');
    expect(texte(a)).not.toContain('la plus fréquente');
    expect(texte(c)).not.toContain('la plus fréquente');
  });
});
