## 2026-11-17 — Page « Mes maps » (#26), quatre agents en parallèle et trois décisions après relecture

**Demande** : « On continue avec la prochaine issue ». L'agent a fait le point : `main` contenait tout, aucune PR n'était ouverte. Il a proposé #26 (Mes maps), sur le modèle du tableau de bord tout juste livré. **Validé**.

**Plan** : le `planner` a constaté que le plan de #26 avait déjà été validé sur l'issue plus tôt dans la journée, avec les décisions D1 à D8 et la maquette. Il n'a rien rouvert. Il a seulement :
- confirmé que D1 était remplie (#70 fusionnée) ;
- précisé trois points d'exécution : le fuseau lu uniquement dans le cookie `tz`, les ex aequo départagés par `sid` puis `side`, et l'absence de nouveau rechargement des données quand un filtre change.

Il a aussi relevé que `cdt-face` n'est pas un composant Angular mais une classe CSS.

**Développement** : quatre lots aux fichiers disjoints.
- A, B et D sont partis en parallèle : la route `GET /api/maps`, le résolveur avec `/maps` en page connectée, et les liens d'entrée.
- C, la vue, est parti ensuite, parce qu'il dépendait du contrat de A et du résolveur de B.
- L'agent du lot C n'avait encore rien écrit quand l'utilisateur a demandé de reprendre. La session principale lui a envoyé un message de relance plutôt que d'en lancer un second, qui aurait écrit les mêmes fichiers.

**Vérification et relecture, premier tour** :
- Le `verifier` : tout est conforme sur le serveur construit (401, 302, 502, 503, liste blanche, HTML déjà trié et filtré).
- Le `reviewer` : deux points à corriger.
  - L'agent du lot C avait ajouté, hors plan, une option « X (aucune face) » pour un mod inconnu dans l'URL. C'était contraire à D4, qui disait de revenir à la valeur par défaut.
  - La page `/maps` importait `format.ts` depuis le dossier du tableau de bord, une dépendance cachée entre deux pages.

  Il a aussi relevé un point mineur : les dates sans année deviennent ambiguës sur une liste de toutes les faces jamais jouées.

**Décisions de l'utilisateur** (« Plan modifié » sur l'issue) :
- D9 : un mod inconnu revient à « Tous les mods ».
- D10 : nouveau dossier `src/app/format/` pour les fonctions d'affichage communes, avec la règle écrite dans `conventions-analog`.
- D11 : l'année s'affiche quand elle diffère de celle de la partie la plus récente des **données**, jamais de l'année courante, pour que l'hydratation ne diverge pas.

**Second tour** : un `dev` a appliqué les trois décisions. Le `verifier` et le `reviewer` ont donné le feu vert. Le `reviewer` a encore noté que la règle ajoutée au skill visait « tout utilitaire » alors que D10 ne parlait que d'affichage. La session principale a corrigé la phrase.

**Erreurs et limites de l'agent** :
- **Initiative d'un agent** : l'option « mod inconnu » est une initiative raisonnable mais non demandée. Le `reviewer`, qui relit face au plan posté sur l'issue, l'a repérée. Sans ce plan écrit, elle passait.
- **Maquette** : les agents n'ont pas pu lire l'artefact de la maquette. La session principale l'a lu et a comparé la page. Il reste des écarts mineurs de libellés (« Récentes » au lieu de « Plus récentes »).
- **Accès aux commentaires** : `gh issue view --comments` échoue pour les agents (erreur GraphQL). Il faut passer par `gh api …/issues/26/comments`.

**Laissé à l'utilisateur** (mineurs) :
- le commentaire sur `Intl.Collator` ;
- le résolveur dupliqué entre le tableau de bord et `/maps` ;
- « Réessayer » qui perd les filtres ;
- un nom de test trop large ;
- un 503 en texte brut quand Spring est arrêté, qui vient du middleware de session déjà en place.

**Pour l'oral** : le plan écrit sur l'issue sert deux fois. Une session ultérieure l'a repris sans rien redemander, et le relecteur s'en est servi pour distinguer un ajout utile d'un écart à une décision.
