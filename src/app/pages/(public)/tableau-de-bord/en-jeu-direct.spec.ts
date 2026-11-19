import { Component } from '@angular/core';
import { provideRouter, RouterOutlet } from '@angular/router';
import { bootstrapApplication, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { renderApplication } from '@angular/platform-server';
import { TestBed } from '@angular/core/testing';

import { FABRIQUE_EVENT_SOURCE, injecterEnJeuDirect } from './en-jeu-direct';

@Component({ selector: 'app-sonde', template: '{{ valeur() === undefined ? "rien" : "reçu" }}' })
class Sonde {
  protected readonly valeur = injecterEnJeuDirect();
}

@Component({ selector: 'app-racine', imports: [RouterOutlet], template: '<router-outlet />' })
class Racine {}

describe('injecterEnJeuDirect', () => {
  const configurer = (fabrique: unknown) =>
    TestBed.configureTestingModule({
      providers: [{ provide: FABRIQUE_EVENT_SOURCE, useValue: fabrique }],
    });

  it('n’ouvre pas de flux avant le premier rendu', () => {
    const fabrique = vi.fn(() => ({ addEventListener: vi.fn(), close: vi.fn() }));
    configurer(fabrique);
    const fixture = TestBed.createComponent(Sonde);
    expect(fabrique).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fabrique).toHaveBeenCalledWith('/api/direct');
  });

  it('n’ouvre jamais de flux pendant un vrai rendu serveur', async () => {
    const fabrique = vi.fn();
    const html = await renderApplication(
      (context) => bootstrapApplication(Sonde, { providers: [{ provide: FABRIQUE_EVENT_SOURCE, useValue: fabrique }] }, context),
      { document: '<app-sonde></app-sonde>' },
    );
    expect(html).toContain('rien');
    expect(fabrique).not.toHaveBeenCalled();
  });

  it('n’essaie jamais d’ouvrir un EventSource pendant un rendu serveur avec la fabrique par défaut', async () => {
    const eventSource = vi.fn();
    vi.stubGlobal('EventSource', eventSource);
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // Dans le build d'Analog, `ngServerMode` n'est pas actif pour le code des pages : `afterNextRender`
    // n'est alors plus un no-op côté serveur et son callback s'exécute pendant le rendu (constaté sur
    // le serveur construit). On reproduit cette condition.
    const global = globalThis as { ngServerMode?: boolean };
    const modeServeur = global.ngServerMode;
    global.ngServerMode = false;
    try {
      // Comme dans l'application : la page est une route, rendue après la navigation initiale.
      const html = await renderApplication(
        (context) => bootstrapApplication(Racine, { providers: [provideRouter([{ path: '', component: Sonde }]), provideClientHydration(withEventReplay())] }, context),
        { document: '<app-racine></app-racine>', url: '/' },
      );
      expect(html).toContain('rien');
      expect(eventSource).not.toHaveBeenCalled();
      expect(erreurs).not.toHaveBeenCalled();
    } finally {
      global.ngServerMode = modeServeur;
      vi.unstubAllGlobals();
      erreurs.mockRestore();
    }
  });

  describe('reconnexion', () => {
    /** Fausse source : le test déclenche les événements et choisit `readyState`. */
    class FausseSource {
      static toutes: FausseSource[] = [];
      readyState = 0;
      close = vi.fn(() => (this.readyState = 2));
      private ecouteurs = new Map<string, Array<(e: unknown) => void>>();
      constructor() {
        FausseSource.toutes.push(this);
      }
      addEventListener(type: string, fn: (e: unknown) => void) {
        this.ecouteurs.set(type, [...(this.ecouteurs.get(type) ?? []), fn]);
      }
      emettre(type: string, evenement: unknown = {}) {
        this.ecouteurs.get(type)?.forEach((fn) => fn(evenement));
      }
      tomber() {
        this.readyState = 2;
        this.emettre('error');
      }
    }

    const demarrer = () => {
      configurer((() => new FausseSource()) as unknown);
      const fixture = TestBed.createComponent(Sonde);
      fixture.detectChanges();
      return fixture;
    };

    beforeEach(() => {
      FausseSource.toutes = [];
      vi.useFakeTimers();
    });
    afterEach(() => vi.useRealTimers());

    it('rouvre la source 5 s après être passée en CLOSED', () => {
      demarrer();
      expect(FausseSource.toutes).toHaveLength(1);
      FausseSource.toutes[0].tomber();
      vi.advanceTimersByTime(4999);
      expect(FausseSource.toutes).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(FausseSource.toutes).toHaveLength(2);
    });

    it('laisse EventSource se reconnecter seul tant qu’il n’est pas CLOSED', () => {
      demarrer();
      FausseSource.toutes[0].readyState = 0; // CONNECTING : le navigateur réessaie
      FausseSource.toutes[0].emettre('error');
      vi.advanceTimersByTime(60_000);
      expect(FausseSource.toutes).toHaveLength(1);
    });

    it('abandonne après 5 réouvertures de suite, sans boucler', () => {
      demarrer();
      for (let i = 0; i < 10; i++) {
        FausseSource.toutes.at(-1)!.tomber();
        vi.advanceTimersByTime(5000);
      }
      expect(FausseSource.toutes).toHaveLength(6); // l’originale + 5 réouvertures
      vi.advanceTimersByTime(60_000);
      expect(FausseSource.toutes).toHaveLength(6);
    });

    it('repart de zéro quand une connexion s’ouvre', () => {
      demarrer();
      for (let i = 0; i < 4; i++) {
        FausseSource.toutes.at(-1)!.tomber();
        vi.advanceTimersByTime(5000);
      }
      FausseSource.toutes.at(-1)!.emettre('open');
      for (let i = 0; i < 5; i++) {
        FausseSource.toutes.at(-1)!.tomber();
        vi.advanceTimersByTime(5000);
      }
      expect(FausseSource.toutes).toHaveLength(10);
    });

    it('annule le minuteur de réouverture à la destruction', () => {
      const fixture = demarrer();
      FausseSource.toutes[0].tomber();
      fixture.destroy();
      vi.advanceTimersByTime(60_000);
      expect(FausseSource.toutes).toHaveLength(1);
    });

    it('ferme la source ouverte à la destruction', () => {
      const fixture = demarrer();
      fixture.destroy();
      expect(FausseSource.toutes[0].close).toHaveBeenCalled();
    });
  });
});
