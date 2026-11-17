## 2026-10-23 — Fin de l'étape 2 : favicon, confidentialité, page du mod, 404

**Déroulé** : l'agent enchaîne les issues de l'étape 2 en boucle (`/loop`), avec une branche et une PR par issue, et pose la question avant chaque push. Pour ne pas empiler les branches (un squash casse l'empilement), il attend la fusion de la coque (#45), surveillée en arrière-plan, avant de lancer les pages qui en dépendent.

**Décisions de l'utilisateur**, posées ensemble pendant l'attente :
- **page du mod en Markdown à la main** (recommandé) : il n'y a ni release ni version à lire sur GitHub. La lecture par le serveur reste la piste C (#33) ;
- **contact par son adresse email** dans la page Confidentialité, plutôt que par les issues GitHub : plus direct pour une demande de suppression, en sachant qu'elle sera publique ;
- **favicon en « ligne de crête »** parmi trois directions. L'agent a dessiné le SVG, puis vérifié le rendu à 16, 32 et 64 px sur fond clair et sombre avant de le proposer.

**Confidentialité : le texte ne promet que ce qui est vrai.** L'agent a vérifié chaque affirmation dans le code Spring du dépôt d'origine : `BCryptPasswordEncoder`, enregistrement de l'IP et du nom de l'appareil à l'appairage, empreinte SHA-256 du jeton. Il a corrigé ses propres formulations : bcrypt calcule une *empreinte*, il ne *chiffre* pas ; et le mod contacte le site dès l'appairage, il « n'envoie aucune donnée de partie » avant. Il a signalé à l'utilisateur la phrase qui n'est vraie que sur le site actuel.

**404 : un concept SSR.** Une route attrape-tout `(public)/[...not-found].page.ts` affiche la page dans la coque. Pendant le rendu serveur, `injectResponse()` donne la réponse HTTP de Node, sur laquelle on pose `statusCode = 404`. Dans le navigateur, cette fonction renvoie `null`. Vérifié sur le serveur construit : 200 pour les pages, 404 pour `/nimporte` et `/faq/existe-pas`.

**Faux pas de l'agent** :
- un `git add` groupé échouait sur un chemin déjà supprimé : un fichier est resté hors du commit, d'où un petit commit de rattrapage plutôt qu'une réécriture de l'historique ;
- l'utilisateur a vu « la FAQ sans CSS » : son serveur de dev servait la branche du favicon, partie de `main`, donc d'avant la correction. L'agent l'a expliqué et a vérifié la branche corrigée dans un navigateur ;
- le serveur de dev n'a pas rechargé un template modifié par `sed`. Le build de production, lui, était juste.
