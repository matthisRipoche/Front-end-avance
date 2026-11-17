## 2026-10-23 — FAQ (#9) : préparation de l'exercice en mode mixte

**Retour au mode mixte** : SSG et contenu Markdown sont des concepts nouveaux. L'agent prépare, l'utilisateur écrit le cœur.

**L'agent a vérifié l'outillage avant de donner l'exercice** (leçon tirée de la route `/health`). Pour cela, il a écrit une solution jetable, l'a construite, puis l'a retirée. Il a ainsi trouvé un piège : sans l'option `content` du plugin `analog()` dans `vite.config.ts`, le build échoue sur le fichier `.md`, avec une erreur incompréhensible (« Cannot assign to this expression »). Cette option est réglée dans le squelette : l'utilisateur ne butera que sur le concept.

**Préparé par l'agent.**
- Le moteur Markdown (`provideContent(withMarkdownRenderer())`) et la classe `cdt-prose`.
- Le texte de la FAQ (`src/content/faq.md`), rédigé à partir de la documentation du dépôt d'origine, à relire par l'utilisateur.
- La coque de la page, avec quatre `TODO`. Les indices disent où chercher (pages de documentation, fichier à imiter, question à se poser), jamais le code.
- La leçon 2. Elle commence par les deux questions de la leçon 1 restées sans réponse, sous forme de quiz : l'utilisateur passe souvent à la suite sans répondre aux questions posées dans le terminal.

**Déroulé de l'exercice.**
- **Fichiers séparés.** L'utilisateur a demandé à séparer le template de la logique : la FAQ a son `.html` et son `.css`, et elle est regroupée dans `src/app/pages/faq/`. La généralisation au reste du projet est proposée, pas encore validée.
- **TODO 1 écrit par l'utilisateur.** La structure de `routeMeta` était juste dès le premier essai, mais les textes étaient ceux de l'accueil, copiés tels quels. L'agent l'a relevé en expliquant pourquoi c'est un vrai problème : ces balises sont lues par les moteurs de recherche et les aperçus de lien. Après un indice plus concret, l'utilisateur a corrigé.
- Une relecture a d'abord porté sur un fichier non enregistré. L'agent l'a repéré grâce à l'heure de modification du fichier.
- **TODO 2 à 4.** L'utilisateur a demandé la solution complète (« ça ira plus vite »), puis que l'agent l'écrive. L'agent a donné chaque morceau avec son explication, notamment le piège du prérendu : écrire sa propre liste remplace la valeur par défaut, donc `/` doit y figurer. Puis il l'a implémenté.
- **Vérifications** :
  - `dist/analog/public/faq/index.html` contient les 8 questions et le bon titre ;
  - l'accueil est toujours prérendu ;
  - le build et les 11 tests passent.

**À retenir pour la suite du mode mixte** : l'utilisateur préfère avancer vite. Les indices « où chercher » l'ont ralenti sur un concept surtout mécanique (charger un fichier, configurer une liste). Il vaut mieux garder l'exercice pour le cœur des concepts serveur (relais, session, couche dédiée au front), et donner des indices plus concrets.

**Changement de règle demandé par l'utilisateur** : « je veux seulement comprendre les principes, pas forcément les faire et les mettre en place ». Le mode mixte change :
- l'agent implémente aussi la première occurrence d'un concept, et en explique le principe sur le code réel (leçon ou réponse courte) ;
- la compréhension est vérifiée par des questions et des quiz ;
- un exercice à `TODO` n'est proposé que sur demande.

Mis à jour : `CLAUDE.md`, le skill `teach`, la mémoire de l'agent. Le label `mode : à moi` des issues signifie désormais « concept nouveau, avec leçon ».

**Pourquoi c'est notable pour l'oral** : l'organisation n'est pas figée. Elle s'est ajustée après l'avoir éprouvée sur un vrai exercice : les indices « où chercher » ralentissaient l'utilisateur sans lui faire mieux comprendre.
