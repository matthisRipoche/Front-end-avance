## 2026-11-17 — Relire des PR longues : un guide plutôt qu'un découpage

**Demande** : après la #69 et la #70, plus de 30 fichiers chacune, l'utilisateur écrit : « pour les prochaines fois, essaye de faire des PR plus petites, histoire que la relecture soit plus fluide ; là j'ai du mal ».

**Proposition de l'agent** : découper dès le plan en PR d'une intention chacune. Pour #26 : la route, puis la page, puis les liens. Il l'a noté dans sa mémoire.

**Correction de l'utilisateur** : « en fait non, annule. Il faut plutôt que moi je m'adapte aux PR plus longues, mais j'aimerais que tu me fasses un guide de relecture quand la PR est envoyée. »

**Fait** :
- **Mémoire de l'agent** : la consigne « PR plus petites » est retirée et remplacée par « un guide de relecture à chaque PR ».
- **Skill `commit`** : la description de chaque PR gagne une section `## Guide de relecture`. Elle contient l'ordre de lecture des fichiers (du contrat vers l'usage), 3 à 5 endroits à regarder de près avec ce qui pourrait mal tourner, ce qui se survole, les questions à se poser et comment voir le résultat. Le message de fin de tour en donne le résumé.
- **PR #70**, déjà ouverte, reçoit son guide.

**Pour l'oral** : la même difficulté a trois réponses possibles. On peut changer la taille des PR, la façon de les relire, ou les outils de relecture. L'utilisateur a préféré garder le rythme de livraison et demander de l'aide pour lire, plutôt que multiplier les PR et les fusions dans l'ordre, avec les conflits de squash déjà rencontrés sur #63 et #64.
