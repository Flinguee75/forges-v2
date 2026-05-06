Plan Phase 3 — Newman Baseline + NGSER Mode Réel                                                                                                              
                                                        
 Context

 Phase 3 de la fiabilisation v4.9. Les 13 tests E2E paiement NGSER passent (13/13).
 Étape suivante : valider le contrat API complet via Newman, puis basculer NGSER en mode réel
 pour prouver que l'intégration sandbox fonctionne end-to-end.

 L'utilisateur confirme que les credentials sandbox NGSER sont déjà dans .env et que
 la connexion avec l'API réelle est opérationnelle. Il suffit de passer NGSER_MOCK_MODE=false.

 ---
 Étape 1 — Newman Baseline (mode mock, seed validation)

 Seed à utiliser : seed_for_test.js (pas seed.e2e.ts — Newman nécessite les IDs stables de validation)

 # Dans forges-monorepo/backend
 node seed_for_test.js --reset && node seed_for_test.js --check

 Commande Newman :
 npx newman run tests/forges-v4.8-complete.postman_collection.json \
   --environment tests/forges-v4.8-complete.postman_environment.json \
   --reporters cli,htmlextra \
   --reporter-htmlextra-export newman-baseline-phase3.html

 Objectif : 53 requêtes, 159 assertions, 0 échec.

 Fichiers clés :
 - forges-monorepo/backend/tests/forges-v4.8-complete.postman_collection.json
 - forges-monorepo/backend/tests/forges-v4.8-complete.postman_environment.json

 ---
 Étape 2 — Basculer NGSER en mode réel

 Fichier : forges-monorepo/backend/.env

 Changement unique :
 # Avant
 NGSER_MOCK_MODE=true

 # Après
 NGSER_MOCK_MODE=false

 Toutes les autres variables sont déjà correctes :
 - NGSER_BASE_URL=https://securetest.crossroad-africa.net/
 - NGSER_AUTH_TOKEN → présent
 - NGSER_OPERATION_TOKEN_PAIEMENT → présent

 Redémarrer le backend après le changement. Vérifier dans les logs qu'il n'y a pas d'erreur
 NGSER_CREDENTIALS_MISSING au démarrage.

 ---
 Étape 3 — Tester initiation paiement NGSER réel

 Re-seeder avec seed.e2e.ts (comptes dédiés aux tests paiement) puis initier un paiement :

 # Re-seed E2E
 npm run prisma:seed:e2e

 # Login + inscription + initiation paiement (via curl ou test ciblé)

 Vérification clé : Le payment_url retourné ne doit PAS contenir mock-ngser.forges.ci
 — il doit pointer sur securetest.crossroad-africa.net (URL réelle NGSER sandbox).

 # Le payment_url doit ressembler à :
 # https://securetest.crossroad-africa.net/pay?token=...
 # ET NON : https://mock-ngser.forges.ci/pay?order=...

 ---
 Étape 4 — Tester IPN et réconciliation en mode réel

 IPN : Dépend du webhook URL public.
 - Si NGSER_NOTIFICATION_URL pointe sur localhost → NGSER ne peut pas rappeler → simuler l'IPN manuellement via curl sur /api/webhooks/paiement avec les vrais
  champs NGSER.
 - Si ngrok ou staging public → NGSER peut envoyer l'IPN automatiquement.

 Réconciliation en mode réel :
 # Déclencher manuellement (endpoint protégé ADMIN/AGENT)
 POST /api/admin/scheduler/reconciliation-ngser
 En mode réel, le scheduler appelle POST /v3/check-status sur NGSER sandbox.
 Vérifier dans les logs : RECONCILIATION_REELLE (pas RECONCILIATION_MOCK).

 ---
 Fichiers modifiés

 ┌──────────────────────────────┬───────────────────────┐
 │           Fichier            │     Modification      │
 ├──────────────────────────────┼───────────────────────┤
 │ forges-monorepo/backend/.env │ NGSER_MOCK_MODE=false │
 └──────────────────────────────┴───────────────────────┘

 Aucun changement de code — uniquement configuration.

 ---
 Vérification end-to-end

 1. Newman : 53/53 requêtes, 159/159 assertions, 0 échec → rapport HTML généré
 2. Backend démarre sans erreur NGSER_CREDENTIALS_MISSING
 3. POST /api/paiements/initier retourne payment_url NGSER réel (pas mock)
 4. Scheduler réconciliation loggue RECONCILIATION_REELLE
 5. Mettre à jour checklist Phase 3 dans docs/implementation-4.9/plan_prod_4.9.md