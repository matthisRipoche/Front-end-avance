import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, PLATFORM_ID, inject, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { BarreMobile } from '../layout/barre-mobile/barre-mobile';
import { SiteFooter } from '../layout/site-footer/site-footer';
import { SiteHeader } from '../layout/site-header/site-header';

// Coque des pages publiques. Les parenthèses font de (public) un groupe sans segment d'URL :
// chaque page de (public)/ garde son adresse (/, /faq…) et s'affiche dans le <router-outlet>.
@Component({
  selector: 'app-public-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SiteHeader, SiteFooter, BarreMobile],
  templateUrl: './(public).page.html',
  styleUrl: './(public).page.css',
})
export default class PublicLayout {
  private readonly contenu = viewChild.required<ElementRef<HTMLElement>>('contenu');

  constructor() {
    const router = inject(Router);
    // Seule garde fiable : afterNextRender s'exécute aussi pendant le SSR dans ce build.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    // Chemin sans fragment ni query : un simple changement de fragment ne compte pas comme une page.
    const chemin = (url: string) => url.split(/[?#]/)[0];
    let derniere = chemin(router.url);
    let premiere = true;
    const abonnement = router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const courante = chemin(e.urlAfterRedirects);
        const change = courante !== derniere;
        derniere = courante;
        // La première navigation (initiale, hydratation) ne déplace jamais le focus.
        if (premiere) {
          premiere = false;
          return;
        }
        if (change) this.contenu().nativeElement.focus({ preventScroll: false });
      });
    inject(DestroyRef).onDestroy(() => abonnement.unsubscribe());
  }

  /** Le `<base href="/">` ferait résoudre `#contenu` en `/#contenu` : on gère le lien à la main. */
  protected aller(event: Event): void {
    event.preventDefault();
    const main = this.contenu().nativeElement;
    main.focus();
    main.scrollIntoView();
  }
}
