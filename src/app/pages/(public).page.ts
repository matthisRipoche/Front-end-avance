import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SiteFooter } from '../layout/site-footer';
import { SiteHeader } from '../layout/site-header';

// Coque des pages publiques. Les parenthèses font de (public) un groupe sans segment d'URL :
// chaque page de (public)/ garde son adresse (/, /faq…) et s'affiche dans le <router-outlet>.
@Component({
  selector: 'app-public-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  templateUrl: './(public).page.html',
  styleUrl: './(public).page.css',
})
export default class PublicLayout {}
