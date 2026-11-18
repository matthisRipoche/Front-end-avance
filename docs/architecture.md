# Périmètre et architecture

Ce que ce front couvre, et le rôle du serveur Node. Déplacé de `CLAUDE.md` le 2026-11-17, sans changement de fond.

## Périmètre

Un nouveau front pour CelesteDeathTracker, en partie neuf. Ce n'est pas une copie du site Angular actuel (`web/` du dépôt d'origine).

| Partie | Site actuel | Ce front |
|---|---|---|
| Pages publiques : accueil, page du mod, FAQ, confidentialité | N'existent pas | **Nouvelles**, en SSR ou SSG (FAQ et confidentialité en Markdown) |
| Pages connectées : tableau de bord, mes maps, détail d'une face | Rendues dans le navigateur | **Refaites** sur la couche serveur et la connexion côté serveur |
| Historique, détail d'une room, direct, appareils, appairage | Existent | Hors périmètre au départ, s'il reste du temps |

Remplacer un jour le site actuel : à décider à la fin. La comparaison des deux architectures sert l'oral.

## Architecture visée

```
navigateur ──▶ serveur Node d'Analog (Nitro) ──────────────▶ API Spring (celeste.matthisripoche.com)
                 ├─ pages publiques : SSR ou SSG
                 ├─ pages connectées : SSR, connexion vérifiée côté serveur
                 ├─ couche serveur dédiée au front (routes src/server/routes/)
                 └─ middlewares : /health, journaux, limitation de débit
```

Rôle du serveur Node (validé, pistes A + B + E) :

- **A. Couche serveur dédiée au front (BFF)** : des routes Nitro (`h3`) qui appellent Spring, combinent les réponses et renvoient ce dont la page a besoin. Validation des paramètres, traduction des erreurs.
- **B. Connexion vérifiée côté serveur** : pendant le rendu SSR, Node transmet le cookie de session à Spring et sait si l'utilisateur est connecté avant d'envoyer la page. La redirection vers le login se fait côté serveur, sans clignotement.
- **E. Transversal** : route `/health` (contrôle de santé Docker), journaux des requêtes, limitation de débit sur le login.
- S'il reste du temps : **C.** cache serveur de données publiques (page du mod), **D.** relais du flux SSE `/api/live/stream`. Pas de base de données propre, sauf si la consigne l'exige.

Détails techniques :

- Le navigateur ne voit qu'une origine : le cookie de session `JSESSIONID` et le CSRF (`XSRF-TOKEN` → en-tête `X-XSRF-TOKEN`) fonctionnent sans CORS. Les appels qui n'ont pas besoin d'être transformés sont relayés tels quels vers Spring.
- En production, Spring est joint par le **nginx de l'ancien projet** (`http://celeste-web-1`, réseau Docker `frontend`), adresse donnée par une variable d'environnement : son conteneur est sur le réseau privé de l'autre projet, et par l'adresse publique Traefik réécrirait `X-Forwarded-Host`, dont Spring tire l'adresse de retour Discord (décision D2 de #35, détail dans `deploy/README.md`).
- Contrat de l'API et vocabulaire (face, tentative, SID) : `docs/api-spring.md`.
- Spécification des pages : `docs/arborescence-pages.md` du dépôt d'origine. Modèles TypeScript à reprendre : `web/src/app/core/*.model.ts` du dépôt d'origine.
- Connexion : email et mot de passe, et Discord (OAuth2, #35) par le flux de Spring relayé, sans le modifier (`docs/api-spring.md`, « Connexion Discord »).
