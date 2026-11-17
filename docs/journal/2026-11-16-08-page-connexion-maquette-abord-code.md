## 2026-11-16 — Page de connexion (#17) : maquette d'abord, puis le code

**Demande** : suite de l'étape 3 en mode solo. L'agent s'arrête avant #17, parce que c'est une page visuelle nouvelle et que la règle de l'utilisateur est « maquette validée avant le code ». Il propose deux voies (maquette, ou code direct avec les seuls composants du design system) et recommande la maquette ; l'utilisateur la choisit.

**Maquette** : un canvas Claude Design, « Celeste Death Tracker — connexion », construit avec le design system (jetons copiés depuis l'artifact du design system) : connexion en sombre, trois états d'erreur (champ invalide, 401, 429 avec décompte), inscription (#21), connexion sur mobile en clair. Les règles de l'inscription (8 à 72 caractères) ont été lues dans le dépôt d'origine, pas devinées. Validée telle quelle (« Validée, code-la »).

**Incohérence repérée en dessinant** : le message du 429 de la PR 61 vouvoyait, alors que le README du design system demande de tutoyer. Corrigé sur la branche de la PR 61.

**Décisions prises seul** : envoi direct vers `POST /api/auth/login` par le relais (pas de route serveur dédiée : il n'y a rien à transformer) ; jeton CSRF posé par l'intercepteur XSRF d'Angular, avec un `GET /api/auth/me` préalable si le cookie manque ; `?redirect=` filtré contre la redirection ouverte (`cheminDeRetour`, réutilisable par #20) ; retour par défaut à l'accueil tant que le tableau de bord n'existe pas.

**Ce que la vérification a apporté** :
- Le `verifier`, sur le serveur construit branché sur l'API de production : HTML servi conforme, et parcours CSRF réel (`GET /api/auth/me` → 401 *avec* cookie, puis POST avec de faux identifiants → 401 et non 403).
- Le `reviewer` doutait justement de ce cookie posé sur un 401 (jeton différé de Spring Security 6) ; le `verifier` l'avait déjà prouvé. Il a aussi relevé : aucun test ne vérifiait l'en-tête `X-XSRF-TOKEN` (le cœur de l'issue) ; l'apostrophe droite contre la règle du projet ; un conseil faux sur le 403 (« recharge la page » ne renouvelle pas le jeton) ; le bouton « Afficher » sans nom explicite ; la règle « est-ce /login » écrite deux fois. Tout corrigé : le 403 redemande un jeton et réessaie une fois.
- L'agent a renoncé à saisir de faux identifiants dans le navigateur contre l'API de production ; le test navigateur prévu ensuite n'a pas pu se faire (navigateur intégré qui refuse le port local). Reste à faire : une vraie connexion avec un compte existant.

**Pour l'oral** : la maquette a coûté un aller-retour, mais elle a fait apparaître une incohérence de ton dans une PR déjà ouverte. Et deux agents indépendants se sont complétés : l'un posait la bonne question, l'autre avait déjà la preuve.
