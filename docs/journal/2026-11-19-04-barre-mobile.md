## 2026-11-19 — Barre de navigation mobile et page /compte (#77)

**Demande** : `/issue 77`. Sous 960 px, un joueur connecté voit une barre fixe en bas (Tableau de bord, Mes maps, Compte) et l'en-tête ne garde que le nom du site. Rien ne change au-dessus de 960 px ni pour un anonyme.

**Proposition de l'agent** : le `planner` a découpé le travail en quatre lots aux fichiers disjoints (classe `cdt-tabbar`, composant `BarreMobile`, coque, page `/compte`) et posé quatre décisions. Il a aussi relevé que les agents `dev` ne lisent pas la maquette Claude Design : le style est donc fixé dans le plan au lieu d'être laissé à leur initiative.

**Validé par l'utilisateur** (les quatre recommandations) :
- `/compte` devient une vraie page SSR (nom, pseudo Discord, déconnexion), protégée par `connexionRequise` et jamais prérendue : l'issue ne la demandait pas, mais « Compte » n'avait aucune destination et l'en-tête perd la déconnexion sous 960 px ;
- « Le mod » rejoint le pied de page, qui avait déjà « FAQ » ;
- l'en-tête n'est réduit que pour le joueur connecté : l'anonyme garde « Se connecter » ;
- style : barre pleine largeur, fond `surface`, entrée active sobre (`surface-raised`, `ink`, graisse 600), sans accent ni doré.

**Réalisation** : quatre `dev` en parallèle, sans build, puis `verifier` et `reviewer` en parallèle. Le seuil de 960 px est en CSS seulement (pas de `matchMedia`) pour que le HTML du serveur et celui du navigateur restent identiques.

**Erreurs rattrapées**
- Le `dev` du lot 2 n'avait pas la hauteur de la barre (lot 1 en parallèle) et a mis 4 rem à l'espaceur. La session principale l'a recalculée à 57 px (8 + 22 + 2 + 16 + 8, plus 1 px de bordure).
- Le `reviewer` a trouvé que cet espaceur était posé sur l'hôte du composant : un anonyme aurait vu une bande vide de 57 px sous le pied de page, que jsdom ne montre pas. L'espaceur est maintenant dans le `@if` de la barre, avec un test.
- Le lien « Le mod » n'avait aucun test (pas de spec pour le pied de page) : ajouté. Ajouté aussi un test de la garde de `/compte`, et `white-space: nowrap` sur les libellés pour que la barre ne dépasse pas l'espaceur.
- Un `dev` a vu vitest ignorer `/compte` quand `PAGES_CONNECTEES` tenait sur une ligne, sans trouver la cause et en contournant par une forme multiligne. Le `verifier` ne le reproduit pas sur le build ; la cause reste inconnue.

**Vérifié** : 609 tests et build verts avant les corrections du `reviewer`. Sur le serveur construit avec un faux Spring : `/compte` anonyme → 302 vers `/login?redirect=%2Fcompte`, 503 si Spring est injoignable, 200 avec `cache-control: private, no-store` et `Vary: Cookie` pour un joueur connecté. La barre porte le bon `aria-current` sur `/tableau-de-bord`, `/maps`, `/maps/face` et `/compte`.

**Limites** : le rendu visuel (959 et 961 px, clair et sombre) n'a pas été contrôlé dans un navigateur. `/faq` est prérendue : pour un joueur connecté, la barre n'y apparaît qu'après l'hydratation, comme l'en-tête.
