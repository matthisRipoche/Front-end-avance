---
name: conventions-analog
description: Conventions de code du projet Celeste Tracker (Analog.js 2.9, Angular 22, serveur Nitro) - organisation des fichiers, pages SSR ou SSG, routeMeta, pages Markdown, composants, design system, interdits. À charger avant d'écrire ou de relire du code dans src/, et pour planifier une fonctionnalité.
---

# Conventions Analog du projet

Ce skill dit **comment ce projet** écrit son code. Pour le reste :
- Angular générique (signals, `inject()`, control flow, formulaires, DI…) : skill `angular-developer` ;
- conventions d'Analog pour la version installée : skill officiel `analogjs` (copie de `node_modules/@analogjs/platform/skills/analogjs` pour Analog 2.9.1, à recopier à chaque mise à jour, même contenu que l'`AGENTS.md` du paquet) ;
- couche serveur et appels à Spring : skill `bff-spring` ; tests : skill `tests-analog`.

Avant d'écrire, **ouvre un fichier voisin du même type et imite-le**. Les modèles sont cités ci-dessous.

## Où va quoi

| Je crée… | Emplacement | Modèle |
|---|---|---|
| Page publique (accueil, mod…) | `src/app/pages/(public)/<nom>.page.ts`, ou `(public)/<nom>/index.page.ts` si elle a plusieurs fichiers | `(public)/index.page.ts`, `(public)/mod/index.page.ts` |
| Page de texte (FAQ, confidentialité) | `src/app/pages/(public)/<nom>.md` (titre et meta dans le frontmatter) | `(public)/faq.md` |
| Page hors coque publique | `src/app/pages/<nom>/index.page.ts` | `design-system/index.page.ts` |
| Coque (navigation, pied de page) | `src/app/layout/` | `site-header.ts` |
| Composant réutilisable du design system | `src/app/ui/<nom>.ts` (+ `.html`, `.css`) | `ui/result-tag.ts` |
| Route serveur Nitro | `src/server/routes/…` (méthode dans le nom : `faces.get.ts`) | `server/routes/health.ts` |
| Utilitaire serveur | `src/server/utils/` | `server/utils/spring.ts` |
| Styles globaux | jetons `src/styles/tokens.css`, classes `src/styles/components.css` | |

Groupe `(public)` : `(public).page.ts` est la coque (header, `<router-outlet />`, footer) ; le nom entre parenthèses **n'apparaît pas** dans l'adresse. `(public)/[...not-found].page.ts` attrape tout le reste et pose un vrai 404.

## Composants

- **Trois fichiers côte à côte** : `.ts` + `.html` (+ `.css` s'il a des styles), reliés par `templateUrl` et `styleUrl`. **Jamais** de `template:` ni de `styles:` en ligne. Le test est à côté : `.spec.ts`.
- Standalone, `changeDetection: ChangeDetectionStrategy.OnPush`, dépendances déclarées dans `imports`.
- Une page fait `export default class …` (exigé par le routage d'Analog), sélecteur `app-…`. Un composant de `ui/` est un export nommé, sélecteur `cdt-…`, et pose sa classe `.cdt-*` par `host` (modèle : `ui/result-tag.ts`).
- Une information ne passe jamais par la couleur seule : couleur + forme ou mot.
- `inject()` plutôt que des paramètres de constructeur ; signals et `input()` ; control flow `@if` / `@for` (avec `track`).
- Membres utilisés seulement par le template : `protected readonly`.
- Données d'exemple : constantes en haut du fichier, et la page dit qu'elles sont fictives (modèle : `(public)/index.page.ts`).

## Rendu : SSR, SSG, navigateur

- **SSG (prérendu au build)** : pour les pages publiques sans donnée de compte. Ajoute l'adresse à `prerender.routes` dans `vite.config.ts` ; la liste remplace la valeur par défaut, donc `/` doit y rester.
- **SSR (à chaque requête)** : pour les pages connectées ou dont les données changent. Les données arrivent par un `load` dans un `.server.ts` voisin, lu avec `injectLoad` (voir `bff-spring`).
- Pendant le SSR, **pas de `window`, `document`, `localStorage`** au chargement du composant. Si c'est indispensable : `afterNextRender()`, ou `isPlatformBrowser(inject(PLATFORM_ID))`.
- Statut HTTP depuis une page : `injectResponse()` (`@analogjs/router/tokens`), qui vaut `null` dans le navigateur (modèle : `[...not-found].page.ts`).
- L'hydratation est active (`provideClientHydration(withEventReplay())`) : le premier rendu côté navigateur doit produire **le même HTML** que le serveur (pas de date courante, d'aléatoire ou de lecture de `window` dans le template initial).

## routeMeta

Chaque page exporte ses métadonnées, avec `satisfies` :

```ts
export const routeMeta = {
  title: '<Titre> · Celeste Death Tracker',
  meta: [{ name: 'description', content: DESCRIPTION }],
} satisfies RouteMeta;
```

Gardes, résolveurs et `data` passent aussi par `routeMeta`. Page qu'on ne veut pas indexer : `{ name: 'robots', content: 'noindex' }`.

## Pages Markdown

- **Tout `.md` dans `src/content/` ou `src/app/pages/` devient une route.** N'y pose jamais un `.md` qui n'est pas une page.
- Titre et balises meta dans le frontmatter. Les notes pour les rédacteurs vont dans le frontmatter (commentaires YAML), pas dans le corps.
- Le HTML passe tel quel : une question de FAQ est un `<details>`. Laisse une ligne vide après `</summary>` et avant `</details>`, sinon le Markdown intérieur n'est pas interprété.
- Une page riche en colonnes ou en cartes devient un composant, pas du Markdown (c'est le cas de `/mod`).

## Design system

Référence : `docs/design-system.md`, vitrine : `/design-system`.

- Couleurs, espacements, rayons, polices : **jetons** `var(--…)` de `tokens.css`. Aucune couleur en dur.
- Composants visuels : classes `.cdt-*` de `components.css` ; styles de texte : `.t-*`. Avant d'en créer une, vérifie qu'elle n'existe pas. Une nouvelle classe partagée va dans `components.css` et dans la vitrine.
- Sombre d'abord, **accent cyan pour l'action**, **un seul élément doré par écran** (le deathless).
- Polices : Unbounded, Geist, Geist Mono (`@fontsource-variable`). Pas de Tailwind.
- Icônes : SVG dessinés pour le site.
- **Interdit** : sprites, assets, décor et police (Renogare) de Celeste. Seule exception : les captures recadrées de l'interface du mod (menu Mod Options, bandeau du code).

## Langue et style

- Code, commentaires, textes d'interface et noms de tests **en français**. Apostrophe typographique `’` dans les textes affichés.
- Un commentaire explique **pourquoi**, pas ce que fait la ligne (voir ceux de `vite.config.ts`).
- Pas de dépendance ajoutée sans décision validée par l'utilisateur.
