---
title: Confidentialité
meta:
  - name: description
    content: Ce que Celeste Death Tracker enregistre, pourquoi, où, et comment le faire supprimer.
  - property: og:title
    content: Confidentialité
  - property: og:description
    content: Ce que Celeste Death Tracker enregistre, pourquoi, où, et comment le faire supprimer.
  - property: og:type
    content: website
---

# Confidentialité

Celeste Death Tracker est un projet personnel, sans publicité ni revente de données. Le site ne garde que ce qu'il faut pour te montrer tes tentatives.

## Ce que le site enregistre

- **Ton compte** : ton adresse email et ton mot de passe, stocké sous forme d'empreinte (bcrypt), jamais en clair. Si tu te connectes avec Discord, le site reçoit seulement ton identifiant Discord, ton pseudo et ton avatar, pas ton email.
- **Tes appareils** : quand tu associes le jeu à ton compte, le site note le nom de l'appareil et l'adresse IP qui a demandé le code, pour que tu reconnaisses la demande avant de l'accepter. Le jeton remis au mod est stocké sous forme d'empreinte (SHA-256), jamais en clair.

## Ce que le mod envoie

Uniquement ce qui se passe dans tes parties :

- la map, la face (A, B ou C) et l'emplacement de sauvegarde ;
- les rooms traversées, et pour chaque mort la room et la position dans la room ;
- l'heure de chaque événement et le temps de la partie ;
- la raison de la fin d'une tentative (face terminée, recommencée, abandonnée…).

Le mod ne lit rien d'autre sur ton ordinateur, et n'envoie aucune donnée de partie tant qu'il n'est pas associé à un compte.

## Cookies

Le site n'utilise que deux cookies, tous deux nécessaires à son fonctionnement :

- `JSESSIONID` garde ta session ouverte une fois connecté. Il n'est pas lisible par les scripts de la page.
- `XSRF-TOKEN` protège les formulaires contre les requêtes envoyées depuis un autre site.

Aucun cookie de mesure d'audience ni de publicité. C'est pour cela que le site ne te demande pas ton consentement.

## Aucun service tiers

Les polices sont hébergées sur le site lui-même : ta visite ne déclenche aucune requête vers Google ou un autre service. Il n'y a ni statistiques de visite, ni traceur, ni contenu externe. Seule la connexion avec Discord, si tu la choisis, passe par Discord.

## Où sont les données

Sur un serveur privé loué pour le projet, derrière une connexion chiffrée (HTTPS). Elles ne sont partagées avec personne.

## Tes droits

Tu peux demander à consulter, exporter ou supprimer ton compte et tes tentatives. Le site ne propose pas encore de bouton pour le faire : écris à [matthisripoche@gmail.com](mailto:matthisripoche@gmail.com), la demande est traitée à la main.

Tu peux aussi dissocier un appareil à tout moment depuis le site : le mod cesse alors d'envoyer quoi que ce soit.
