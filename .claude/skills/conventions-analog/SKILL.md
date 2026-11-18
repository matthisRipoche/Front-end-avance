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

**Règle : un composant par dossier** (décision de l'utilisateur, 2026-11-17). Chaque composant, page comprise, a son propre dossier, qui ne contient que ses fichiers : `.ts`, `.html`, `.css`, `.spec.ts`, plus ses utilitaires propres (`filtres.ts`, `<page>.donnees.ts`). Un utilitaire reste dans le dossier de sa page tant qu'elle seule s'en sert ; dès qu'une deuxième page l'importe, une fonction d'affichage passe dans `src/app/format/` (décision de l'utilisateur, 2026-11-17, pour `format.ts`) ; un autre utilitaire partagé est une décision à faire valider. Jamais d'import d'un dossier de page à un autre. Jamais deux composants dans le même dossier. L'accueil (`index.page.ts`, adresse `/`) va dans un **dossier de groupe** `(accueil)/`, qui n'apparaît pas dans l'adresse. Exceptions imposées par le routage :
- la coque `(public).page.*` est à côté du dossier `(public)/` qu'elle entoure ;
- la page 404 `[...not-found].page.*` reste dans `(public)/` : placée dans un dossier de groupe, elle passe avant les autres routes et `/`, `/mod`, `/login` répondent 404 (essayé le 2026-11-17) ;
- les pages Markdown (`faq.md`) sont des fichiers seuls.

| Je crée… | Emplacement | Modèle |
|---|---|---|
| Page publique | `src/app/pages/(public)/<nom>/index.page.ts` (+ `.html`, `.css`, `.spec.ts`) ; l'accueil dans un groupe : `(public)/(accueil)/index.page.ts` | `(public)/mod/index.page.ts`, `(public)/(accueil)/index.page.ts` |
| Page de texte (FAQ, confidentialité) | `src/app/pages/(public)/<nom>.md` (titre et meta dans le frontmatter) | `(public)/faq.md` |
| Page hors coque publique | `src/app/pages/<nom>/index.page.ts` | `design-system/index.page.ts` |
| Coque (navigation, pied de page) | `src/app/layout/<nom>/<nom>.ts` | `layout/site-header/site-header.ts` |
| Composant réutilisable du design system | `src/app/ui/<nom>/<nom>.ts` (+ `.html`, `.css`, `.spec.ts`) | `ui/result-tag/result-tag.ts` |
| Fonction d'affichage commune à plusieurs pages (dates, chronos, pourcentages) | `src/app/format/` : fonctions pures, sans Angular, testées à côté | `format/format.ts` |
| Route serveur Nitro | `src/server/routes/…` (méthode dans le nom : `faces.get.ts`) | `server/routes/health.ts` |
| Utilitaire serveur | `src/server/utils/` | `server/utils/spring.ts` |
| Styles globaux | jetons `src/styles/tokens.css`, classes `src/styles/components.css` | |

Groupe `(public)` : `(public).page.ts` est la coque (header, `<router-outlet />`, footer) ; le nom entre parenthèses **n'apparaît pas** dans l'adresse. `(public)/[...not-found].page.ts` attrape tout le reste et pose un vrai 404.

## Composants

- **Trois fichiers côte à côte** : `.ts` + `.html` (+ `.css` s'il a des styles), reliés par `templateUrl` et `styleUrl`. **Jamais** de `template:` ni de `styles:` en ligne. Le test est à côté : `.spec.ts`.
- Standalone, `changeDetection: ChangeDetectionStrategy.OnPush`, dépendances déclarées dans `imports`.
- Une page fait `export default class …` (exigé par le routage d'Analog), sélecteur `app-…`. Un composant de `ui/` est un export nommé, sélecteur `cdt-…`, et pose sa classe `.cdt-*` par `host` (modèle : `ui/result-tag/result-tag.ts`).
- Une information ne passe jamais par la couleur seule : couleur + forme ou mot.
- `inject()` plutôt que des paramètres de constructeur ; signals et `input()` ; control flow `@if` / `@for` (avec `track`).
- Membres utilisés seulement par le template : `protected readonly`.
- Données d'exemple : constantes en haut du fichier, et la page dit qu'elles sont fictives (modèle : `(public)/(accueil)/index.page.ts`).

## Rendu : SSR, SSG, navigateur

- **SSG (prérendu au build)** : pour les pages publiques sans donnée de compte. Ajoute l'adresse à `PAGES_PRERENDUES` (`scripts/pages-prerendues.mjs`), lue par `prerender.routes` de `vite.config.ts` et par le contrôle du build, qui échoue si une page de la liste n'est pas écrite ; la liste remplace la valeur par défaut, donc `/` doit y rester.
- **SSR (à chaque requête)** : pour les pages connectées ou dont les données changent. Une **page connectée** : son préfixe dans `PAGES_CONNECTEES` (`src/app/auth/session-contrat.ts`) **et** `canActivate: [connexionRequise]` dans son `routeMeta` (voir `bff-spring`). Le compte s'affiche par le service `Session` (`src/app/auth/session.ts`). Ses données arrivent par un **résolveur** (`resolve` dans `routeMeta`) qui appelle une route du front `/api/…` par `HttpClient`, la même URL côté serveur et côté navigateur ; la page les lit par `ActivatedRoute.data` (modèle : `(public)/tableau-de-bord/tableau-de-bord.donnees.ts`, détail dans `bff-spring`). Un `load` dans un `.server.ts` voisin, lu avec `injectLoad`, reste possible pour des données **publiques** : il est servi sans cookie.
- Pendant le SSR, **pas de `window`, `document`, `localStorage`** au chargement du composant. Si c'est indispensable : `afterNextRender()`, ou `isPlatformBrowser(inject(PLATFORM_ID))`.
- Statut HTTP depuis une page : `injectResponse()` (`@analogjs/router/tokens`), qui vaut `null` dans le navigateur (modèle : `(public)/[...not-found].page.ts`).
- L'hydratation est active (`provideClientHydration(withEventReplay())`) : le premier rendu côté navigateur doit produire **le même HTML** que le serveur (pas de date courante, d'aléatoire ou de lecture de `window` dans le template initial).
- **Dates dans le rendu initial** : jamais `Date.now()` ni `new Date()` sans argument, jamais de date relative (« il y a 2 h ») ; une date se formate par `Intl` avec le `timeZone` **porté par les données** (le fuseau du joueur), pas celui de la machine, sinon le serveur (UTC) et le navigateur écrivent des heures différentes. Le fuseau arrive au serveur par le cookie `tz`, posé par `memoriserFuseau` (`src/app/auth/fuseau.ts`) à la connexion et par la page connectée après rendu (`afterNextRender`). Pour écrire l'année seulement quand elle change, la référence est l'année d'une date **des données** (`anneeDe`, `formaterDate(ms, fuseau, anneeDeReference)` dans `src/app/format/format.ts`), jamais l'année courante.

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

- **Tout `.md` dans `src/content/` ou `src/app/pages/` devient une route.** N'y pose jamais un `.md` qui n'est pas une page : un texte chargé par `injectContent` crée donc aussi une page.
- Titre et balises meta dans le frontmatter. Les notes pour les rédacteurs vont dans le frontmatter (commentaires YAML), pas dans le corps.
- Le HTML passe tel quel : une question de FAQ est un `<details>`. Laisse une ligne vide après `</summary>` et avant `</details>`, sinon le Markdown intérieur n'est pas interprété.
- Une page riche en colonnes ou en cartes devient un composant, pas du Markdown (c'est le cas de `/mod`).

## Design system

Référence : `docs/design-system.md`, vitrine : `/design-system`.

- Couleurs, espacements, rayons, polices : **jetons** `var(--…)` de `tokens.css`. Aucune couleur en dur.
- Composants visuels : classes `.cdt-*` de `components.css` ; styles de texte : `.t-*`. Avant d'en créer une, vérifie qu'elle n'existe pas. Une nouvelle classe partagée va dans `components.css` et dans la vitrine.
- Sombre d'abord, **accent cyan pour l'action**, **un seul élément doré par écran** (le deathless).
- Polices : Unbounded, Geist, Geist Mono (`@fontsource-variable`). Pas de Tailwind.
- Icônes : SVG dessinés pour le site. **Seule exception** (validée par l'utilisateur le 2026-11-18) : le logo Discord, en SVG inline monochrome (`fill="currentColor"`, `aria-hidden`), sur le bouton « Continuer avec Discord » de `/login` seulement.
- **Interdit** : sprites, assets, décor et police (Renogare) de Celeste. Seule exception : les captures recadrées de l'interface du mod (menu Mod Options, bandeau du code).

## Langue et style

- Code, commentaires, textes d'interface et noms de tests **en français**. Apostrophe typographique `’` dans les textes affichés.
- Un commentaire explique **pourquoi**, pas ce que fait la ligne (voir ceux de `vite.config.ts`).
- Pas de dépendance ajoutée sans décision validée par l'utilisateur.
