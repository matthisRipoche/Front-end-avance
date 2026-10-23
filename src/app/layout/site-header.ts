import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

// Barre de navigation des pages publiques.
@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
})
export class SiteHeader {}
