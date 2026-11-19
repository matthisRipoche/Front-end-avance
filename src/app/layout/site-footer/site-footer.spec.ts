import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SiteFooter } from './site-footer';

describe('Pied de page', () => {
  it('propose « Le mod » et « FAQ »', () => {
    TestBed.configureTestingModule({ imports: [SiteFooter], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(SiteFooter);
    fixture.detectChanges();
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav[aria-label="Pied de page"]');
    expect(nav?.querySelector('a[href="/mod"]')?.textContent).toContain('Le mod');
    expect(nav?.querySelector('a[href="/faq"]')?.textContent).toContain('FAQ');
  });
});
