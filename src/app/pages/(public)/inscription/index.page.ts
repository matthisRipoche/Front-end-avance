import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RouteMeta } from '@analogjs/router';

import { Compte } from '../../../auth/compte';
import { cheminDeRetour } from '../../../auth/retour';

export const routeMeta = {
  title: 'Créer un compte · Celeste Death Tracker',
  meta: [
    { name: 'description', content: 'Crée ton compte : le mod y enverra tes tentatives.' },
    { name: 'robots', content: 'noindex' },
  ],
} satisfies RouteMeta;

/**
 * Règles de Spring (RegisterRequest) : email de 255 caractères au plus, mot de passe de 8 caractères
 * au moins. La limite haute vient de BCrypt : 72 OCTETS en UTF-8, pas 72 caractères. Un accent
 * compte pour 2 octets, un emoji pour 4 ; au-delà, Spring répondrait par une erreur serveur.
 */
export const MOT_DE_PASSE_MIN = 8;
export const MOT_DE_PASSE_MAX_OCTETS = 72;

export function octetsMax(max: number) {
  return (c: AbstractControl<string>): ValidationErrors | null =>
    new TextEncoder().encode(c.value ?? '').length > max ? { octets: true } : null;
}

/**
 * Message au-dessus du formulaire. `info` : un succès partiel (alerte neutre) ;
 * `lienConnexion` : la phrase se termine par le lien « connecte-toi ».
 */
type Message = { titre: string; texte: string; info?: boolean; lienConnexion?: boolean };

/**
 * Page d'inscription (/inscription).
 *
 * Spring crée le compte (201) mais n'ouvre pas de session : la page enchaîne donc avec la
 * connexion, puis renvoie à la page demandée (?redirect=…), comme la page de connexion.
 */
@Component({
  selector: 'app-inscription',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
})
export default class InscriptionPage {
  private readonly compte = inject(Compte);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly redirect = inject(ActivatedRoute).snapshot.queryParamMap.get('redirect');
  /** La page demandée suit le joueur s'il passe à la page de connexion. */
  protected readonly suite = this.redirect ? { redirect: this.redirect } : null;

  protected readonly min = MOT_DE_PASSE_MIN;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(MOT_DE_PASSE_MIN), octetsMax(MOT_DE_PASSE_MAX_OCTETS)]],
  });

  protected readonly envoi = signal(false);
  protected readonly message = signal<Message | null>(null);
  protected readonly motDePasseVisible = signal(false);

  private readonly alerte = viewChild<ElementRef<HTMLElement>>('alerte');

  protected basculerMotDePasse(): void {
    this.motDePasseVisible.update((v) => !v);
  }

  /** Message sous le champ email, ou null s'il est valide ou pas encore touché. */
  protected messageEmail(): string | null {
    const c = this.form.controls.email;
    if (!c.touched || c.valid) return null;
    if (c.hasError('required')) return 'Saisis ton adresse email.';
    if (c.hasError('maxlength')) return 'Cette adresse est trop longue (255 caractères au plus).';
    return 'Saisis une adresse complète, par exemple nom@exemple.fr.';
  }

  /** Message sous le mot de passe, ou null s'il est valide ou pas encore touché. */
  protected messageMotDePasse(): string | null {
    const c = this.form.controls.password;
    if (!c.touched || c.valid) return null;
    if (c.hasError('required')) return `Choisis un mot de passe de ${MOT_DE_PASSE_MIN} caractères au moins.`;
    if (c.hasError('minlength')) {
      const manque = MOT_DE_PASSE_MIN - c.value.length;
      return `Encore ${manque} caractère${manque > 1 ? 's' : ''} : il en faut ${MOT_DE_PASSE_MIN} au moins.`;
    }
    return `Trop long : ${MOT_DE_PASSE_MAX_OCTETS} octets au plus (un accent compte pour 2, un emoji pour 4).`;
  }

  protected async envoyer(): Promise<void> {
    if (this.envoi()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const premier = this.form.controls.email.invalid ? 'email' : 'password';
      afterNextRender(() => document.getElementById(premier)?.focus(), { injector: this.injector });
      return;
    }
    this.envoi.set(true);
    this.message.set(null);
    const identifiants = this.form.getRawValue();
    try {
      await this.compte.creer(identifiants);
    } catch (e) {
      this.echecCreation(e);
      this.envoi.set(false);
      return;
    }
    try {
      await this.compte.connecter(identifiants);
      await this.router.navigateByUrl(cheminDeRetour(this.redirect));
    } catch {
      // Compte créé, connexion ratée (Spring indisponible un instant, limite de débit…) :
      // le joueur n'a qu'à se connecter, surtout pas à recréer le compte.
      this.montrer({
        titre: 'Compte créé',
        texte: 'La connexion automatique a échoué :',
        info: true,
        lienConnexion: true,
      });
    } finally {
      this.envoi.set(false);
    }
  }

  private echecCreation(e: unknown): void {
    const statut = e instanceof HttpErrorResponse ? e.status : 0;
    if (statut === 409) {
      this.montrer({
        titre: 'Un compte existe déjà avec cet email',
        texte: 'Utilise une autre adresse, ou',
        lienConnexion: true,
      });
    } else if (statut === 400) {
      this.montrer({
        titre: 'Ces informations sont refusées',
        texte: `Vérifie l’email, et un mot de passe de ${MOT_DE_PASSE_MIN} caractères au moins.`,
      });
    } else if (statut === 403) {
      this.montrer({ titre: 'Création refusée par sécurité', texte: 'Ferme l’onglet, rouvre le site et réessaie.' });
    } else {
      this.montrer({ titre: 'Le service ne répond pas', texte: 'Réessaie dans un moment.' });
    }
  }

  private montrer(message: Message): void {
    this.message.set(message);
    afterNextRender(() => this.alerte()?.nativeElement.focus(), { injector: this.injector });
  }
}
