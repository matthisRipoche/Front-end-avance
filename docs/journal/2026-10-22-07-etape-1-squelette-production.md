## 2026-10-22 — Étape 1 : squelette en production

**Proposition de l'agent.** Reprendre le modèle de déploiement du projet d'origine, simplifié :
- un `Dockerfile` en deux étapes, dont l'image finale ne garde que le serveur produit par Nitro (environ 6 Mo, utilisateur non root, contrôle de santé sur `/health`) ;
- un seul conteneur derrière le Traefik existant, avec un routeur nommé `celeste-next` pour ne pas entrer en collision avec le site actuel ;
- une CI GitHub Actions : tests et build sur chaque PR ; image GHCR et déploiement par SSH sur `main`.

**Corrigé ou décidé par l'utilisateur.**
- **Domaine** : l'utilisateur a créé `new-celeste.matthisripoche.com` au lieu du `next.celeste…` prévu. L'agent a adapté la documentation.
- **Rien à faire sur le serveur** : l'utilisateur voulait tout passer par les secrets GitHub. L'agent a adapté la CI : elle crée le dossier dans le répertoire de l'utilisateur SSH (sans `sudo`) et réécrit le `.env` à chaque déploiement. GitHub devient la seule source de vérité.
- **Secrets SSH** : l'utilisateur ne savait pas où retrouver la clé privée et l'empreinte du serveur. L'agent a expliqué qu'un secret GitHub ne se relit jamais. Il a créé une clé dédiée au projet, installé sa partie publique sur le serveur et relevé l'empreinte, en vérifiant qu'elle correspondait à celle que le poste connaissait déjà. L'outil de l'agent a **bloqué** l'écriture des secrets dans GitHub, jugée sensible : l'utilisateur a lancé lui-même les commandes. La clé privée n'a jamais été affichée, et la copie locale a été supprimée ensuite.
- **La passation était fausse sur un point** : le port SSH du VPS est joignable depuis le poste de développement.

**Premier exercice en mode mixte : la route `/health`.**
- L'agent a préparé le fichier avec un `TODO` et des indices, ainsi que le test.
- L'utilisateur a buté sur `process`. L'erreur ne venait pas de lui : le gabarit de `create-analog` n'installe pas `@types/node`, donc TypeScript ne connaissait pas `process`. **Erreur de l'agent** : il aurait dû vérifier l'outillage avant de donner l'exercice.
- **Correction de l'utilisateur** : l'indice contenait déjà la solution (`process.uptime()`). « Ne mets pas la réponse en prérempli. » Désormais, les indices disent où chercher, pas quoi écrire. C'est noté dans le skill `teach` et dans la mémoire de l'agent.
- **Question de relecture** : faut-il vérifier Spring dans `/health` ? Réponse de l'utilisateur : non. Si Spring tombe, le site serait marqué en panne à tort. C'est la différence entre la vivacité du processus et la disponibilité de ses dépendances.
