import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RouteMeta } from '@analogjs/router';

import { Compte } from '../../../auth/compte';
import { cheminDeRetour } from '../../../auth/retour';

export const routeMeta = {
  title: 'Connexion · Celeste Death Tracker',
  meta: [
    { name: 'description', content: 'Connecte-toi pour retrouver tes faces et tes tentatives.' },
    { name: 'robots', content: 'noindex' },
  ],
} satisfies RouteMeta;

/** Message d'erreur affiché au-dessus du formulaire. */
type Erreur = { titre: string; texte: string; lienInscription?: boolean };

/**
 * Page de connexion par email et mot de passe (/login).
 *
 * Le formulaire part vers Spring par le relais /api (service Compte, qui gère le jeton CSRF) :
 * le cookie de session (JSESSIONID, HttpOnly) est posé par Spring sur l'origine du front, et
 * suit ensuite chaque requête.
 *
 * Après la connexion : retour à la page demandée (?redirect=…), contrôlée par cheminDeRetour.
 */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
})
export default class LoginPage {
  private readonly compte = inject(Compte);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);

  private readonly redirect = this.route.snapshot.queryParamMap.get('redirect');
  /** Bandeau « Connecte-toi pour continuer » : seulement après une redirection. */
  protected readonly redirige = this.redirect !== null;
  /** La page demandée suit le joueur s'il passe à l'inscription. */
  protected readonly suite = this.redirect ? { redirect: this.redirect } : null;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly envoi = signal(false);
  protected readonly erreur = signal<Erreur | null>(null);
  protected readonly motDePasseVisible = signal(false);
  /** Secondes avant de pouvoir réessayer après un 429. */
  protected readonly attente = signal(0);
  protected readonly bloque = computed(() => this.envoi() || this.attente() > 0);

  private readonly alerte = viewChild<ElementRef<HTMLElement>>('alerte');
  private minuteur: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.minuteur));
  }

  protected basculerMotDePasse(): void {
    this.motDePasseVisible.update((v) => !v);
  }

  protected async envoyer(): Promise<void> {
    if (this.bloque()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Le focus va au premier champ à corriger, dont le message est relié par aria-describedby.
      const premier = this.form.controls.email.invalid ? 'email' : 'password';
      afterNextRender(() => document.getElementById(premier)?.focus(), { injector: this.injector });
      return;
    }
    this.envoi.set(true);
    this.erreur.set(null);
    try {
      await this.compte.connecter(this.form.getRawValue());
      await this.router.navigateByUrl(cheminDeRetour(this.redirect));
    } catch (e) {
      this.echec(e);
    } finally {
      this.envoi.set(false);
    }
  }

  private echec(e: unknown): void {
    const statut = e instanceof HttpErrorResponse ? e.status : 0;
    // Le mot de passe refusé est effacé ; l'email reste, pour corriger une faute de frappe.
    this.form.controls.password.reset();

    if (statut === 401) {
      this.erreur.set({
        titre: 'Email ou mot de passe incorrect',
        texte: 'Vérifie les deux champs. Pas encore de compte ?',
        lienInscription: true,
      });
    } else if (statut === 429) {
      const secondes = Number((e as HttpErrorResponse).headers.get('retry-after')) || 60;
      this.erreur.set({ titre: 'Trop de tentatives de connexion', texte: 'Le bouton se réactive tout seul.' });
      this.demarrerAttente(secondes);
    } else if (statut === 403) {
      this.erreur.set({ titre: 'Connexion refusée par sécurité', texte: 'Ferme l’onglet, rouvre le site et réessaie.' });
    } else {
      this.erreur.set({ titre: 'Le service ne répond pas', texte: 'Réessaie dans un moment.' });
    }
    // L'alerte vient d'apparaître : on y place le focus pour qu'elle soit lue tout de suite.
    afterNextRender(() => this.alerte()?.nativeElement.focus(), { injector: this.injector });
  }

  private demarrerAttente(secondes: number): void {
    clearInterval(this.minuteur);
    this.attente.set(secondes);
    this.minuteur = setInterval(() => {
      this.attente.update((s) => s - 1);
      if (this.attente() <= 0) {
        clearInterval(this.minuteur);
        this.erreur.set(null);
      }
    }, 1000);
  }
}
