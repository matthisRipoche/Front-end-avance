## 2026-10-23 — Page d'accueil (#8), faite par l'agent à la demande de l'utilisateur

**Demande.** « Fais la page d'accueil sans rien me demander, je m'absente un peu. » Le mode mixte prévoyait que l'utilisateur écrive cette première page SSR : c'est **son choix explicite** d'y déroger cette fois. L'agent a donc travaillé seul, de bout en bout.

**Réalisé.**
- La page d'accueil suit la maquette validée : promesse, panneau d'exemple (données fictives signalées), alerte « mod pas encore publié », trois questions du joueur avec leur composant, mise en route.
- Titre, description et balises Open Graph passent par `routeMeta` (avec `satisfies`, comme le recommande le guide d'Analog).
- Premiers composants Angular du design system, dans `src/app/ui/` : `ResultTag`, `ReachTrack`, `RoomBreakdown`. Ils sont réutilisables pour le tableau de bord.
- Navigation et pied de page partagés, dans `src/app/layout/`. C'est une avance sur l'issue #7.
- Tests : la page (promesse, données marquées fictives, un seul élément doré) et `ReachTrack`.

**Vérifié.**
- Le build et les 11 tests passent.
- Le HTML servi par le serveur contient la page complète (SSR).
- Le rendu sur bureau a été contrôlé dans le navigateur et correspond à la maquette.
- **Non vérifié** : l'affichage à la largeur d'un téléphone, car la fenêtre du navigateur n'a pas pu être redimensionnée.

**Pour l'apprentissage.** Le concept de page SSR reste à expliquer : la leçon (rendu serveur, hydratation, routage par fichiers, `routeMeta`) s'appuiera sur cette page déjà écrite, et le prochain concept nouveau (la FAQ en SSG, #9) repasse en mode mixte.
