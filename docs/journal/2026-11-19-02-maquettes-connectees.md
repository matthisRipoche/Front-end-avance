## 2026-11-19 — Maquettes des pages connectées (#22), refaites pour ce qui manque seulement

**Demande** : prendre les tickets restants avant toute migration vers l'ancien projet. Ordre proposé par l'agent : fermer #31 et #32 (préparation de l'oral, qui est déjà passé), puis #22 (maquettes), qui débloque #27 (détail d'une face). Validé par l'utilisateur.

**Écart repéré avant de commencer** : #22 demande quatre maquettes (tableau de bord, Mes maps, détail d'une face, barre mobile), mais le tableau de bord (#25) et Mes maps (#26) sont déjà codés. L'agent a posé trois questions avant le `planner` :
- **périmètre** : seulement ce qui manque (détail d'une face, barre mobile). Choisi ;
- **outil** : Claude Design plutôt que des prototypes HTML dans le dépôt. L'agent recommandait le HTML (vérifiable seul) ; l'utilisateur a préféré Claude Design, conformément à l'issue. Le plan est posté en commentaire sur #22 ;
- **priorité de la page de détail** : l'évolution dans le temps en tête, avant la répartition par room et les dernières tentatives. Choisi contre la recommandation de l'agent (la répartition par room).

Le `planner` n'a pas été lancé : le travail est du design, sans code du dépôt, et les trois décisions suffisaient.

**Réalisation** (artifact « Maquettes des pages connectées », sept planches) :
- une page de détail unique, réimportée en sombre, en clair et en mobile, pour que les variantes ne divergent pas ;
- la barre de navigation du bas, seule et dans ses trois états actifs ;
- les états vide et erreur, dans les deux thèmes ;
- construit sur les jetons et les classes `cdt-*` du dépôt, recopiés tels quels. Un seul élément doré (la colonne du deathless), résultats lus par couleur, forme et mot, données signalées comme fictives.

**Choix de contenu** : `EvolutionPoint` ne contient que la durée et le résultat. Le graphique montre donc le temps tenu, pas la room atteinte. La barre du bas compte trois entrées dont « Compte », ajoutée par l'agent.

**Écart avec le code, à reporter dans #27** : `.cdt-tabs` a un fond `surface`. Posés dans un panneau (déjà en `surface`), les onglets seraient invisibles. La maquette les met en `bg`. Si on suit la maquette, `components.css` change au moment de coder.

**Vérification et erreurs rattrapées** :
- l'agent a d'abord publié sans regarder le résultat, parce que le type d'artifact interdit de vérifier sans demande de l'utilisateur ; l'utilisateur a demandé la vérification ;
- le navigateur intégré demandait de se connecter à claude.ai. L'agent n'a rien saisi : l'utilisateur s'est connecté lui-même dans le volet ;
- la vérification a trouvé cinq défauts de l'agent, corrigés et republiés : barre du haut qui déborde entre 720 et 960 px, onglets et dates sur deux lignes en mobile, bandes blanches sous les planches, bouton « Réessayer » à environ 4,2:1 en clair (calcul à la main, sous 4,5:1) ;
- limites : la page tourne dans un cadre d'un autre domaine, donc aucune mesure par script, seulement l'œil. La version claire du détail de face n'a pas été regardée de près.

**Validé** par l'utilisateur le 2026-11-19. Reste ouvert : sur bureau, la colonne des rooms est plus courte que celle des tentatives (vide dessous), laissé tel quel.
