## 2026-11-19 — Examiner les vulnérabilités de `npm audit` (#28)

**Demande** : `/issue 28`. L'issue (écrite à la création du projet) annonçait 16 vulnérabilités dans les dépendances générées par `create-analog` et demandait de les examiner, sans lancer `npm audit fix --force`.

**Proposition de l'agent** : le `planner` a relevé l'état réel (lecture seule) : **12** vulnérabilités, **0 en production** (`npm audit --omit=dev`), toutes issues d'une seule racine, `@analogjs/platform` (devDependency). L'image de production ne contient que `dist/analog` : pas de `node_modules` du projet, et 8 paquets seulement dans `server/node_modules`. Il a surtout relevé une **limite de `--omit=dev`** : Nitro embarque dans ses chunks du code venu de devDependencies (h3, ofetch, unstorage, runtime), que cet audit ne voit pas. Une faille future dans h3 passerait donc inaperçue d'un contrôle de production seul.

**Validé par l'utilisateur** (toutes les recommandations)
- D1 : `npm update` ciblé (nitropack, @vercel/nft, node-forge, serialize-javascript), pas `npm audit fix` ; `package.json` inchangé, aucun override ;
- D2 : esbuild (low, serveur de dev sous Windows) accepté et justifié, pas d'override ;
- D3 : job `audit` séparé, que `image` n'attend pas : `--omit=dev` bloquant au seuil `high`, tout l'arbre en avertissement. Une nouvelle publication d'avis rougit la PR sans bloquer une mise en production ;
- D4 : justification dans le journal et dans `deploy/README.md` (section 7).

**Réalisation** : trois `dev` en parallèle (lockfile, job CI, README), puis `verifier` et `reviewer` en parallèle.

**Écart au plan, accepté** : après la mise à jour, `npm audit` liste **7** avis (3 low, 4 moderate), au lieu des 3 low attendus. Les 4 moderate sont un seul défaut (minimatch 10.2.6, DoS par amplification de globparts) signalé sur la chaîne nitropack → archiver 8.0.0 → readdir-glob 3.0.0 → minimatch. Aucun correctif n'existe dans les plages : `archiver` 8.0.0 est la dernière version et dépend de `readdir-glob@^3`. `npm audit fix` ne change rien (« up to date »). Seul un override le corrigerait ; refusé pour la même raison qu'esbuild (forcer une dépendance hors de la plage déclarée par Nitro, pour un code qui ne tourne qu'au build). Le `dev` du lot 1 s'est arrêté à la commande demandée et a remonté la décision au lieu de lancer `npm audit fix`.

**Erreurs rattrapées**
- **Étape d'audit muette** (trouvée par le `reviewer`). Le premier job avait `npm audit --audit-level=high` avec `continue-on-error: true` : l'étape réussit sans rien annoncer, et même un avis `high` sur h3 serait passé sans annotation. Remplacé par `|| echo "::warning::…"`, qui laisse une annotation jaune sur la PR.
- **README inexact** : il promettait un avertissement permanent alors que les avis moderate ne déclenchent rien au seuil `high`, et il ne citait pas les quatre paquets de la chaîne. Corrigé.
- **YAML cassé par ma propre correction** : le message d'avertissement contenait « : » dans une valeur non quotée, ce qui faisait refuser tout le workflow (donc aussi le déploiement). Aucun test local ne l'aurait vu ; je l'ai attrapé en relisant ma modification puis en la passant dans un vrai parseur (`js-yaml`, déjà dans `node_modules`). Le `verifier` avait relu l'ancienne version, sans parseur. Leçon : après une modification de workflow, parser le YAML avant de commiter.

**Vérifié** : 678 tests, build, `test:serveur`. `npm audit --omit=dev --audit-level=high` sort en code 0 ; 0 high. Versions : nitropack 2.13.6, node-forge 1.4.3, serialize-javascript 7.1.4 ; Angular 22.2.3, Analog 2.9.1, vite 8.3.5, vitest 5.0.5 inchangés. Sur le serveur construit : `/health`, `/` et `/mod` 200 ; `/tableau-de-bord` sans cookie 302 ; `/api/_analog/x` et `/api/ingest/x` 404 ; Spring injoignable → 503. `dist/analog/server/package.json` garde les 8 mêmes dépendances. Le changelog de nitropack 2.13.6 (lu par le `reviewer`) corrige trois failles du cache et des règles de proxy, qui ne concernent pas le relais h3 ni `defineCachedFunction`.

**Limites**
- Le job `audit` n'a jamais tourné sur GitHub Actions : seules ses commandes ont été lancées en local. Sa première exécution aura lieu sur la PR.
- Le Dockerfile n'a pas été éprouvé (Docker Desktop non lancé) : c'est le job `image` de la PR qui le fera.
- La mise à jour du lockfile est plus large que les quatre paquets ciblés (rollup, glob, minimatch, archiver et leurs voisins montent aussi, par leurs plages) ; Angular, Analog, vite et vitest ne bougent pas.
- Si `npm audit` ne peut pas joindre le registre, l'étape bloquante rougit sans raison : à ne pas rendre « vérification requise » dans GitHub sans y penser.
- `CLAUDE.md` (ligne `npm audit` de « Pièges d'environnement ») est dépassée : sa mise à jour attend la validation de l'utilisateur.
