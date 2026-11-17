## 2026-11-17 — Workflow comparé aux pratiques publiées, et hook avant commit

**Demande** : un diagramme Mermaid du workflow de développement, une comparaison avec ce qui existe sur internet, et des pistes d'amélioration.

**Fait par l'agent** : `docs/workflow-agentique.md`. Le diagramme couvre tout le chemin, de `/issue` au déploiement : planner, deux points d'arrêt humains, dev, verifier et reviewer, commit, PR avec Auto-fix, CI, fusion en squash. Le rendu a été vérifié dans un navigateur. La comparaison s'appuie sur le guide officiel de Claude Code, GitHub Spec Kit et des articles multi-agents. Le workflow suit déjà l'essentiel : explorer, planifier, coder, commiter ; rôles stricts ; relecteur frais en lecture seule ; relecture face au plan ; boucle bornée. Cinq améliorations sont proposées, chacune liée à un incident du projet : A hook avant commit, B plan posté sur l'issue, C isolation du verifier, D modèle plus léger pour le verifier, E `CLAUDE.md` plus court.

**Validé** : A d'abord.

**Pourquoi A** : le guide d'Anthropic sépare ce que le modèle décide (`CLAUDE.md`, skills) de ce que l'outil impose (hooks). « Tests et build avant chaque commit » était une règle du skill `commit`, et elle a été sautée deux fois : un `dev` a annoncé « build OK » sans lire les erreurs du prérendu, et la session principale a commité malgré un build en échec.

**Fait** : `.claude/hooks/verifier-avant-commit.mjs`, déclaré en `PreToolUse` dans `.claude/settings.json`. Il ne réagit qu'à `git commit` et lance l'une après l'autre les étapes tests, build et en-têtes. Il bloque avec le code 2 et renvoie l'erreur à l'agent. Essayé sur quatre cas : commande ordinaire ignorée, dépôt sain autorisé, test cassé bloqué (l'erreur Vitest revient), prérendu vide bloqué (« ✗ Prérendu : 4 page(s) sans contenu »).

**Pour l'oral** : la discipline de l'agent ne suffit pas pour ce qui doit toujours arriver. Une règle écrite reste une intention ; un hook est une garantie. Le coût : une trentaine de secondes par commit.

**Suite : amélioration B, le plan validé sur l'issue.** Jusqu'ici, le plan du `planner` et les décisions validées ne vivaient que dans la conversation. Le `reviewer` les recevait recopiés dans son brief, et ils disparaissaient ensuite. La skill `issue` poste maintenant le plan validé en commentaire de l'issue (`## Plan validé`, chaque décision avec l'option retenue), puis un `## Plan modifié` si une décision change. Le `reviewer` lit ce commentaire lui-même, et dit s'il n'en trouve pas. Inspiré de GitHub Spec Kit, en version légère : pas de fichier de spec dans le dépôt, l'issue suffit. Cette amélioration n'est pas encore éprouvée : elle le sera à la prochaine issue traitée par `/issue`. Ajoutée à la même PR que A (#68), ouverte quelques minutes plus tôt et pas encore relue.
