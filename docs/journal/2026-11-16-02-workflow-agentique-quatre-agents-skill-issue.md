## 2026-11-16 — Workflow agentique : quatre agents et la skill `/issue`

**Demande** : « j'aimerais mettre en place des agents ». D'abord un agent chargé de faire le plan, puis « fais-moi un workflow agentique ».

**Proposition de l'agent** : la session principale coordonne, des agents de projet produisent et vérifient, et l'utilisateur décide à deux points d'arrêt. Principe de découpage : **un sous-agent ne peut pas parler à l'utilisateur**. Valider, trancher et autoriser un push restent donc dans la session principale. On ne délègue que les tâches isolées qui ont un livrable clair.

**Correction de l'utilisateur** : « pourquoi ne pas avoir un sous-agent de dev ? ». La première proposition gardait le code dans la session principale, pour que l'utilisateur suive et comprenne. Cette réponse l'a conduit à abandonner la partie apprentissage (entrée précédente). Ce frein levé, l'agent `dev` entre dans le workflow.

**Mis en place** (`.claude/agents/`, `.claude/skills/issue/`) :
- `planner` (lecture seule, Opus) : plan découpé en **lots aux fichiers disjoints**, décisions structurantes à trancher, vérification attendue ;
- `dev` : réalise un lot et ses tests, selon les conventions du projet. Il s'arrête et remonte toute décision imprévue ou tout fichier hors de son lot. Il ne commite pas ;
- `verifier` (lecture seule) : build, tests, puis `curl` sur le serveur construit (codes HTTP, redirections, HTML rendu) ;
- `reviewer` (lecture seule) : diff comparé au plan validé et à `CLAUDE.md`, classé par gravité. Il remplace, dans ce projet, le `reviewer` générique du poste ;
- la skill `/issue` enchaîne les étapes, limite les corrections à deux tours, puis passe au skill `commit`.

**Choix à expliquer à l'oral** :
- Les lots aux fichiers disjoints rendent le parallélisme sûr : deux `dev` n'écrivent jamais le même fichier.
- `verifier` et `reviewer` sont séparés. L'un prouve que ça marche, l'autre cherche ce qui cloche. Ils tournent en parallèle, sans voir le raisonnement de celui qui a codé.
- Les agents sont versionnés dans le dépôt : l'organisation fait partie du livrable.

**Pas encore éprouvé** : le workflow n'a pas tourné sur une vraie issue. Le premier passage dira ce qu'il faut ajuster.
