import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { SiteHeader } from './site-header';

@Component({ template: '' })
class Vide {}

async function monter(url: string) {
  TestBed.configureTestingModule({
    imports: [SiteHeader],
    providers: [provideRouter([{ path: '**', component: Vide }])],
  });
  await TestBed.inject(Router).navigateByUrl(url);
  const fixture = TestBed.createComponent(SiteHeader);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('Navigation des pages publiques', () => {
  it('propose « Se connecter » sur les pages publiques', async () => {
    const nav = await monter('/faq');
    expect(nav.querySelector('a[href="/login"]')?.textContent).toContain('Se connecter');
  });

  it('propose « Créer un compte » sur la page de connexion', async () => {
    const nav = await monter('/login?redirect=/mes-maps');
    expect(nav.querySelector('a[href="/login"]')).toBeNull();
    expect(nav.querySelector('a[href="/inscription"]')?.textContent).toContain('Créer un compte');
  });
});
