## 2026-11-16 — Premier passage du workflow `/issue` : relais `/api` (#15)

**Demande** : « on lance les features ». L'agent propose de commencer par #15, base de l'étape 3, et premier essai réel du workflow.

**Plan (`planner`)** : trois décisions, toutes tranchées par l'utilisateur sur la recommandation de l'agent :
- **D1** : une route h3 écrite à la main (`src/server/routes/api/[...path].ts`, `proxyRequest`) plutôt que `routeRules` (adresse de Spring figée au build) ou un middleware (passerait avant les routes dédiées) ;
- **D2** : tout `/api/**` relayé, sauf `/api/_analog` (interne à Analog) et `/api/ingest` (réservé au mod), refusés en 404 sans appeler Spring ;
- **D3** : erreurs traduites : 4xx inchangés, Spring en panne → 502, Spring injoignable → 503, journal sans cookie.

**Production** : un `dev` pour le relais et ses tests, un second pour la documentation des cookies (`bff-spring`, `docs/api-spring.md`), en parallèle, sur des fichiers disjoints.

**Ce que la vérification a attrapé** :
- Le `reviewer` : le filtre des préfixes se contournait par `..` ou `%2e%2e`, car il testait l'adresse brute alors que Spring reçoit l'adresse normalisée. Corrigé en décidant sur l'URL finale (`cibleSpring`, `src/server/utils/relais.ts`). Au second tour, l'agent principal ferme lui-même un dernier cas (`%2F..%2F`).
- Le `verifier`, sur la vraie API : cookies sans `Domain` (`Path=/`, `Secure` en production), donc aucune réécriture ; CSRF de bout en bout (403 sans l'en-tête, 401 avec). Et surtout : **pages prérendues vides** alors que le build « réussissait ».

**Erreur de diagnostic, rattrapée par l'utilisateur** : le `verifier` a attribué la panne au nom de la spec `[...path].spec.ts` (renommée, le build repassait). L'agent principal a relayé cette cause et proposé une règle « pas de crochets dans les noms de tests ». L'utilisateur a demandé d'être sûr de la cause exacte. En reproduisant, l'agent n'a plus obtenu la panne avec le même nom : la cause était ailleurs.

**Cause réelle, prouvée** : le plugin Angular d'Analog 2.9.1 partage une compilation entre les builds client et SSR, qui tournent en parallèle. Si le client finit le premier, il la libère, et le SSR embarque des composants non compilés (JIT). Ça arrive sous charge : ce jour-là, le `reviewer` lançait ses tests pendant les builds du `verifier`. Preuves : échec sans crochets sous charge ; échec à chaque fois en ralentissant exprès le SSR ; aucun échec en ralentissant le client.

**Correction validée** (« garde-fou au build ») : `scripts/verifier-prerendu.mjs`, lancé en `postbuild`, fait échouer `npm run build` (donc la CI et l'image Docker) si une page prérendue n'a pas de `<h1>`. Essayé sur un build sain (passe) et un build cassé exprès (code 1). Le piège est consigné dans `tests-analog`. La mise à jour vers Analog 2.9.7 reste à évaluer.

**Mineurs, validés par l'utilisateur** : le journal du relais n'écrit plus la query (un retour OAuth y porte un code) ; la doc de l'API mentionne le refus des adresses qui sortent de `/api/`. En testant le troisième (coupure de Spring pendant le corps) avec un vrai serveur HTTP, l'agent découvre un défaut plus grave que prévu : la connexion du navigateur n'était jamais fermée, il attendait sans fin. Corrigé en la détruisant. Les redirections (`redirect: 'manual'`) attendent l'issue Discord (#35).

**Pour l'oral** :
- Le workflow a payé dès son premier passage : deux défauts que le `dev` n'avait pas vus, trouvés par deux agents indépendants.
- Mais un agent peut se tromper de cause en toute confiance : une expérience à cinq variantes, faite une seule fois, ressemblait à une preuve. Il a fallu l'exigence de l'utilisateur pour reproduire, puis provoquer la panne à coup sûr.
- Lancer en parallèle des agents qui construisent et testent sur la même machine change les conditions. C'est ce qui a révélé le bug, mais aussi ce qui a égaré le diagnostic.
