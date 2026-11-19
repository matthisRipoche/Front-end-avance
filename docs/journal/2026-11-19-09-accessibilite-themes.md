## 2026-11-19 — Passe d'accessibilité et de thèmes (#29)

**Demande** : `/issue 29`. Passe d'accessibilité WCAG AA (contrastes, clavier, sémantique) dans les thèmes clair et sombre, avec relecture selon les Web Interface Guidelines.

**Proposition de l'agent** : le `planner` a fait un audit statique, sans navigateur : les ratios WCAG sont calculés par script à partir de `tokens.css`. Bonne base déjà en place : `lang="fr"`, titres par route, thème 100 % CSS (aucun flash), focus visible global, lien d'évitement, repères, formulaires libellés, `prefers-reduced-motion`. Le thème sombre passe partout. 22 constats, dont : texte `accent`, `success` et `danger` sous 4,5:1 en thème clair (4,20 à 4,44), éléments dorés à 1,6–1,8 (3 attendu), état sélectionné marqué presque seulement par le fond (ratio ≈ 1,1), lien d'évitement et « Installer le mod » menant à `/#…` à cause de `<base href="/">`, aucun déplacement du focus au changement de page, un **lien mort** `/register` sur l'accueil (la route est `/inscription`, bug sans rapport avec l'accessibilité trouvé en passant), `aria-label` sur des `<span>` sans rôle, liste des rooms sans sémantique, bandeau « En jeu » relu à chaque room.

**Validé par l'utilisateur** (toutes les recommandations, dont trois choix visuels que l'agent n'a pas pris seul)
- D1 : foncer trois jetons du thème clair : `--accent` `#036b97`, `--success` `#17733e`, `--danger` `#b93127` (ratios 5,0 à 5,9) ; le sombre ne change pas ;
- D2 : contour de 1,5 px en bordure forte sur l'élément sélectionné, plus une barre de 2 px en encre sur l'onglet courant de la barre mobile (jamais d'accent, le design system l'interdit) ;
- D3 : nouveau jeton `--gold-edge` (filet doré foncé en clair seulement) ;
- D4 à D7 : pas de bascule manuelle de thème ; aucune dépendance d'audit (un test Vitest calcule les ratios de `tokens.css`) ; viser AA et réécrire la règle des cibles (24 px minimum, 44 px pour les actions principales) ; bandeau « En jeu » annoncé par une zone masquée `role="status"`.

**Réalisation** : lots A (jetons, design system, test de contrastes), B (coque : lien d'évitement, focus après navigation, `theme-color`, `scroll-padding`) et C (pages publiques) en parallèle, puis D (annonces du tableau de bord et liste des rooms, après A pour `.cdt-sr-only`), puis `verifier` et `reviewer` en parallèle, un `dev` de corrections, un second tour du `verifier`.

**Erreurs rattrapées**
- **`replace(', room', '')` dans un template** : le `dev` du lot D n'avait pas la face seule et a retiré « , room » du libellé par une chaîne. La session principale a ajouté un champ `face` à `enJeu` (une ligne) et supprimé le `replace`.
- **Test qui ne prouvait rien** (trouvé par le `reviewer`) : le test « ne déplace pas le focus au premier rendu » démarrait sur `/` alors que l'URL du routeur valait déjà `/` : il aurait passé sans la garde `premiere`. Refait en construisant la coque avant la navigation initiale vers `/faq` ; on a vérifié qu'il échoue sans la garde.
- **« Plus en jeu » faux** : le `dev` avait écrit « Plus en jeu » quand aucune partie n'est en cours, ce qui est faux pour un joueur qui n'a jamais joué ; le plan validé disait « ou rien ». La zone est maintenant vide.
- **Couleurs forcées** : le contour supplémentaire de la barre mobile ajoutait 2 px de hauteur (l'espaceur est calé sur 57 px), et les règles d'`outline` écrasaient l'anneau de focus global. Remplacés par un dégradé sans décalage et une règle `:focus-visible` plus spécifique. Aussi : l'étiquette `deathless` n'avait pas le filet doré, et un mock de `scrollIntoView` n'était pas restauré.
- **Erreur réseau** : le `dev` des corrections s'est arrêté sur une erreur de connexion à l'API avant d'avoir rien modifié. La session principale a contrôlé l'arbre (aucune correction appliquée, aucun processus) avant de le relancer.
- Le skill `web-design-guidelines`, que le `reviewer` n'a pas pu charger (pas d'outil Skill), a été appliqué de mémoire par lui.

**Vérifié** : 750 tests (dont 58 de `contrastes.spec.ts`, qui échoue sur les anciennes valeurs), build, `test:serveur`. Ratios recalculés à la main par le `verifier` : accent sur surface-raised 5,25, danger sur danger-soft 5,00, gold-text sur surface 5,38. Les deux blocs clairs de `tokens.css` sont identiques. Sur le serveur construit : `/`, `/mod`, `/faq`, `/confidentialite`, `/login`, `/inscription` en 200 avec `lang="fr"` et un titre propre ; pages connectées sans cookie en 302 ; 404 propre ; zone `role="status"` avec « En jeu sur … » sans la room, ou vide ; aucune erreur au journal de Nitro.

**Limites** (aucun navigateur, clavier ni lecteur d'écran côté agents)
- À vérifier par l'utilisateur : parcours au clavier de chaque page ; lien d'évitement et focus après navigation sur `/maps` et `/mod` ; focus non caché par la barre mobile ; affichage à 320 et 400 px dans les deux thèmes (émulation `prefers-color-scheme` des DevTools) ; `prefers-reduced-motion` ; axe DevTools ou Lighthouse pour les contrastes au rendu ; annonces d'un lecteur d'écran (bandeau « En jeu », compteur de `/maps`, liste des rooms) ; mode couleurs forcées.
- Les nouvelles valeurs de couleur (D1, D3) doivent être **reportées dans Claude Design**, source des jetons ; sinon la source diverge.
- Sans JavaScript ou avant l'hydratation, le lien d'évitement mène encore à `/#contenu` sur une autre page que l'accueil (`<base href="/">`) : défaut préexistant, accepté par le plan.
- `/mod#installer` est un `href` simple : un clic recharge `/mod` au lieu d'une navigation SPA ; un `routerLink` avec `fragment` serait possible.
- `pre.code` avec `tabindex="0"` est un arrêt de tabulation même quand il ne déborde pas, sans rôle ni nom ; le graphique d'évolution reste peu utilisable au clavier s'il défile (limite connue).
- Pas de bascule manuelle de thème (D4) : à rouvrir en bonus si besoin.
