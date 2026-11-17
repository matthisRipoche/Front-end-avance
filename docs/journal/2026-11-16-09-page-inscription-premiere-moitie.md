## 2026-11-16 — Page d'inscription (première moitié de #21)

**Demande** : « Oui, continue » après la PR de la connexion. L'issue #21 regroupe inscription et déconnexion ; l'agent fait l'inscription maintenant (maquette déjà validée) et rattache la déconnexion à #19, puisqu'un bouton « Se déconnecter » n'a de sens que dans une navigation qui sait si l'on est connecté.

**Fait** : le contrat d'inscription est lu dans le dépôt d'origine (`AuthController`) : 201 **sans** ouvrir de session, 409 si l'email existe, 400 sinon. La page enchaîne donc inscription puis connexion. L'appel à Spring (jeton CSRF, réessai sur 403) est sorti de la page de connexion dans un service `Compte`, partagé par les deux pages. Branche empilée sur celle de la connexion (PR 62 pas encore fusionnée).

**Ce que la vérification a apporté** :
- `verifier` : SSR de `/inscription` conforme ; contrat vérifié sur l'API de production **sans créer de compte** (corps volontairement invalide → 400, preuve que le CSRF passe et que la validation de Spring tranche).
- `reviewer` : deux points à corriger. Une phrase cassée (« La connexion automatique a échoué. connecte-toi. »), que le test ne voyait pas parce qu'il ne lisait qu'un mot ; et surtout la limite de BCrypt, **72 octets** et non 72 caractères : une phrase de passe de 72 caractères avec un accent passait le front et `@Size`, puis Spring répondait 500 (« Le service ne répond pas », message trompeur). Corrigé par un validateur qui compte les octets UTF-8, testé avec des accents. Mineurs corrigés aussi : `?redirect=` transmis entre connexion et inscription, retour interdit vers `/inscription`, succès partiel « Compte créé » en alerte neutre.

**Pour l'oral** : la règle « 8 à 72 » lue dans le code de Spring était exacte, mais son unité ne l'était pas ; c'est une relecture indépendante qui l'a vu. Et tester la phrase entière plutôt qu'un mot-clé aurait attrapé le premier défaut.
