## 2026-11-16 — Limitation de débit du login (#18), mode solo

**Demande** : suite de l'étape 3 en mode solo. Issue : au-delà de N essais de connexion par minute pour une même adresse IP, refuser en 429 sans appeler Spring.

**Décisions prises seul par l'agent** (rapportées dans la PR) : 10 essais par minute ; fenêtre fixe en mémoire (un seul conteneur, état perdu au redémarrage : limite assumée) ; 429 + `Retry-After` + `{ message }` comme les autres erreurs du relais ; adresse IP lue en **dernière** valeur de `X-Forwarded-For` (posée par Traefik), pour qu'un client ne puisse pas changer de compteur en inventant une première valeur ; chemin comparé après normalisation par `cibleSpring`, la fonction déjà écrite pour le relais.

**Vérification** : le `verifier` confirme sur le serveur construit (10 essais passent, le 11e est un 429 sans appel à Spring, une autre IP passe). Le `reviewer` ne trouve rien de bloquant, mais trois points que l'agent a corrigés : un slash final, `//` ou une casse différente échappaient au compteur (contournement seulement si Spring les accepte ; normaliser coûtait moins cher que de le vérifier) ; la purge de la mémoire parcourait toute la table à chaque essai au-delà de 10 000 adresses (elle s'arrête maintenant à la première fenêtre ouverte) ; le 429 n'était documenté nulle part.

**Pour l'oral** : la limite protège le chemin qui passe par le front, pas l'API : Spring reste joignable directement à son adresse publique. C'est le périmètre fixé au départ (ne pas modifier l'API), mais il faut le dire.
