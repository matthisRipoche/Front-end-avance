# Design system

Remplace le design system « Topo » du site actuel. Références : Strava et Linear. L'interface est précise, énergique, arrondie et douce, et **sombre d'abord** : le site est surtout regardé sur un second écran, le soir, à côté du jeu.

## Où il vit

| Quoi | Où |
|---|---|
| Source : jetons, règles d'usage, aperçus des composants | Claude Design, artifact « Celeste Death Tracker — design system » (privé : demander le lien au propriétaire) |
| Maquette de l'accueil construite dessus | Claude Design, canvas « Celeste Death Tracker — accueil » |
| Jetons en CSS | `src/styles/tokens.css` |
| Composants en CSS (classes `.cdt-*`) | `src/styles/components.css` |
| Polices, base de page | `src/styles.css` |
| Vitrine en ligne | `/design-system` (`src/app/pages/design-system/index.page.ts`) |

`tokens.css` est généré à partir du `tokens.json` du design system. On change une valeur dans le design system, puis on la reporte ici, jamais l'inverse.

## Thèmes

- Sombre par défaut. Le clair suit `prefers-color-scheme: light`.
- `data-theme="dark"` ou `data-theme="light"` sur `<html>` force l'un ou l'autre.
- Les deux thèmes ne redéfinissent que les jetons de couleur : aucun composant n'a de couleur en dur.

## Jetons

- **Couleurs** :
  - fonds et texte : `bg`, `surface`, `surface-raised`, `border`, `border-strong`, `ink`, `ink-muted` ;
  - marque et action : `accent`, `on-accent`, `accent-soft` ;
  - résultats : `success`, `danger`, `gold`, avec leurs variantes `-soft` et `on-gold`, ainsi que `gold-text` ;
  - focus : `focus-ring`.
- **Typographie** (classes `.t-*`) :
  - Unbounded : `display-xl`, `display`, `stat` ;
  - Geist : `title`, `heading`, `body`, `body-sm`, `label` ;
  - Geist Mono : `data`.
- **Espacement** : `space-1` (4 px) à `space-16` (64 px).
- **Arrondis** : `radius-sm` 8 px, `radius-md` 12 px, `radius-lg` 20 px, `radius-pill`.
- **Ombre** : `shadow-float`, la seule élévation, réservée à ce qui flotte.

## Règles qui comptent

1. `accent` est l'action, jamais un résultat.
2. Un résultat se lit par la couleur, une forme et un mot : coche et « passée », croix et « chute », fraise et « deathless ».
3. **Un seul élément doré par écran**, réservé au deathless réussi.
4. Grouper par la surface (`surface` sur `bg`), pas par des bordures. Jamais de carte dans une carte.
5. Unbounded seulement pour les titres et les chiffres clés ; Geist Mono seulement pour les données.
6. Texte à au moins 4,5:1 dans les deux thèmes, focus toujours visible, cibles de 44 px.
7. Données d'exemple toujours signalées comme fictives. Jamais de total de morts.

## Composants

| Composant | Classe | Rôle |
|---|---|---|
| Bouton | `cdt-btn` (`--primary`, `--secondary`, `--ghost`, `--danger`, `--sm`) | Une action principale par écran |
| Champ | `cdt-field` (`--error`) | Libellé visible, aide, erreur qui dit comment corriger |
| Étiquette de résultat | `cdt-result` (`--success`, `--fall`, `--deathless`) | Couleur, forme et mot |
| Pastille de face | `cdt-side` (`--lg`) | A, B ou C, à gauche du nom de la map |
| Chiffre clé | `cdt-stat` | Libellé, valeur, tendance en mots |
| Panneau | `cdt-panel` | Groupe posé sur le fond |
| Répartition par room | `cdt-rooms` | Où les tentatives s'arrêtent, la pire en `danger` |
| Trajectoire | `cdt-reach` (`--deathless`) | Jusqu'où une tentative est allée, une case par room |
| Ligne de face | `cdt-face` | Lien vers le détail d'une face |
| Onglets segmentés | `cdt-tabs` | Période ou vue |
| Alerte | `cdt-alert` (`--error`) | Information ou erreur dans la page |
| Navigation | `cdt-nav` | Nom du site en Unbounded, liens en pilule |
| État vide | `cdt-empty` | Ce qui apparaîtra ici et comment y arriver |

## Interdits

Ni sprites, ni images, ni police (Renogare) de Celeste (© Extremely OK Games). Le site est un projet de fan non officiel, sans logo : le nom s'écrit en Unbounded. Les icônes sont des SVG en ligne, dessinés pour le site.
