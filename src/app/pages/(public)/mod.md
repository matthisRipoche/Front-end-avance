---
title: Le mod
meta:
  - name: description
    content: Ce que le mod Everest de Celeste Death Tracker enregistre, et comment l'installer à la main en attendant sa publication.
  - property: og:title
    content: Le mod Celeste Death Tracker
  - property: og:description
    content: Ce que le mod enregistre, et comment l'installer à la main en attendant sa publication.
  - property: og:type
    content: website
---

# Le mod

Celeste Death Tracker est un mod pour [Everest](https://everestapi.github.io/), le chargeur de mods de Celeste. Pendant que tu joues, il enregistre chaque tentative et l'envoie au site, qui te montre jusqu'où tu vas sur chaque face.

**Le mod n'est pas encore publié** sur GameBanana ni dans l'installeur d'Everest : pour l'instant, il se compile et s'installe à la main. Cette page explique comment.

## Ce que le mod enregistre

Une **tentative** commence quand tu entres dans une face de map et se termine quand tu en sors. Le mod note :

- la map, la face (A, B ou C) et l'emplacement de sauvegarde ;
- les rooms traversées, dans l'ordre ;
- chaque mort : la room, la position dans la room et le temps de la partie ;
- la façon dont la tentative s'arrête : face terminée, chapitre recommencé, abandon, retour au menu, jeu fermé…

## Ce qu'il n'enregistre pas

- rien d'autre que tes parties : ni fichiers, ni autres jeux, ni informations sur ton ordinateur ;
- rien du tout tant que le jeu n'est pas associé à ton compte, ou si tu désactives l'envoi dans le menu du mod.

Le mod n'attend jamais le serveur : si le site ne répond pas, le jeu continue normalement. Le détail des données est sur la page [confidentialité](/confidentialite).

## Ce qu'il te faut

- Celeste avec [Everest](https://everestapi.github.io/) installé ;
- le [SDK .NET 8](https://dotnet.microsoft.com/download/dotnet/8.0), pour compiler le mod ;
- Git, ou le code du dépôt téléchargé en ZIP.

## Installer le mod

1. **Récupère le code** du dépôt [CelesteDeathTracker](https://github.com/matthisRipoche/CelesteDeathTracker) :

   ```
   git clone https://github.com/matthisRipoche/CelesteDeathTracker.git
   cd CelesteDeathTracker
   ```

2. **Compile le mod** en indiquant le dossier de Celeste, celui qui contient `Celeste.dll` :

   ```
   dotnet build CelesteDeathTracker -c Release -p:CELESTE_PATH="C:\chemin\vers\Celeste"
   ```

3. **Ferme Celeste**, puis crée le dossier `Mods/CelesteDeathTracker/` dans le dossier du jeu.

4. **Copie dans ce dossier** deux fichiers :
   - `CelesteDeathTracker.dll`, produit par la compilation dans `CelesteDeathTracker/bin/Release/net8.0/` ;
   - `everest.yaml`, qui se trouve dans `CelesteDeathTracker/`.

5. **Lance Celeste.** Le mod apparaît dans *Mod Options*, sous le nom CelesteDeathTracker.

## Associer le jeu à ton compte

Aucun mot de passe ni aucune clé à copier dans le jeu :

1. au premier lancement, le jeu affiche un **code** dans un bandeau et ouvre la page d'association du site dans ton navigateur ;
2. connecte-toi, puis saisis le code ;
3. le bandeau disparaît : le jeu est associé, et tes tentatives arrivent sur le site à partir de ce moment.

Pour associer le jeu à un autre compte, utilise *Associer ce jeu à un autre compte* dans le menu du mod.

## Désinstaller

Supprime le dossier `Mods/CelesteDeathTracker/`. Les tentatives déjà envoyées restent sur ton compte : pour les faire supprimer, vois la page [confidentialité](/confidentialite).
