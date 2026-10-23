import { TestBed } from '@angular/core/testing';

import { ReachTrack } from './reach-track';

describe('ReachTrack', () => {
  const render = (fallAt: number | null) => {
    const fixture = TestBed.createComponent(ReachTrack);
    fixture.componentRef.setInput('rooms', 6);
    fixture.componentRef.setInput('fallAt', fallAt);
    fixture.componentRef.setInput('fallRoom', fallAt === null ? '' : `a-0${fallAt}`);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('marque les rooms passées et la room de la chute', () => {
    const host = render(3);
    expect(host.querySelectorAll('.cdt-reach__cell').length).toBe(6);
    expect(host.querySelectorAll('.cdt-reach__cell--done').length).toBe(3);
    expect(host.querySelectorAll('.cdt-reach__cell--fall').length).toBe(1);
    expect(host.getAttribute('aria-label')).toBe('Tentative arrêtée en a-03, room 4 sur 6');
  });

  it('passe en doré pour un deathless', () => {
    const host = render(null);
    expect(host.classList).toContain('cdt-reach--deathless');
    expect(host.getAttribute('aria-label')).toBe('Tentative deathless, 6 rooms sur 6');
  });
});
