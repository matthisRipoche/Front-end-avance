## 2026-10-22 — Correction : la partie Node est aussi notée

**Correction de l'utilisateur.** La passation disait « seul le front est noté ». C'était faux : **la partie Node est notée aussi**.

**Conséquence, selon l'agent.** Dans le plan, Nitro ne faisait que relayer `/api`, ce qui ne se note pas. L'agent a proposé six pistes pour donner au serveur de vraies responsabilités : (A) couche serveur dédiée au front, (B) connexion vérifiée côté serveur, (C) cache, (D) relais SSE, (E) transversal (`/health`, journaux, limitation de débit), (F) données propres. Il a recommandé A + B + E, et F seulement si la consigne l'exige.

**Validé.** A + B + E ; C et D s'il reste du temps.

**Question de l'utilisateur.** « Le but, ce serait de refaire le front de mon projet de base ? » L'agent a comparé ce front avec le site actuel :
- les pages publiques n'existent pas aujourd'hui, elles sont nouvelles ;
- les pages connectées sont un sous-ensemble, refait sur une autre architecture ;
- le reste du site est hors périmètre.

Il a aussi présenté l'autre façon de voir (ne faire que la vitrine publique) et ce qu'elle coûte : moins de matière pour la partie Node, qui est notée. **Sujet gardé tel quel.**

**Mis à jour.** `CLAUDE.md` (cadre, périmètre, rôle du serveur Node) et `learning/MISSION.md` (critères de réussite côté Node).
