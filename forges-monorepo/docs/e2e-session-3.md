# E2E Validation — Session 3 (Frontend Harmonisation API)

Checklist manuelle pour valider les endpoints créés/corrigés en Session 3. À exécuter après backend + frontend démarrés localement.

---

## 0. Prérequis

```bash
# Terminal 1 — backend
cd forges-monorepo/backend
npm run dev  # écoute sur :4000 (ou valeur .env PORT)

# Terminal 2 — frontend
cd forges-monorepo/frontend
npm run dev  # écoute sur :5173
```

Vérifier que la DB PostgreSQL est seedée avec au moins :
- 1 utilisateur RESPONSABLE (ex: responsable@forges-dev.ci / Test@FORGES2026!)
- 1 utilisateur AGENT (ex: agent@forges-dev.ci / Test@FORGES2026!)
- 1 utilisateur APPRENANT (ex: apprenant@forges-dev.ci / Test@FORGES2026!)
- 1 `FormationPartenaire` en `EN_ATTENTE_VALIDATION`
- 1 `Partenaire` avec des `CommissionPartenaire` en statut `EN_ATTENTE`

---

## 1. Scénario RESPONSABLE — Validation formations (UCS18)

### Via UI

1. Login comme RESPONSABLE → redirige vers `/backoffice/dashboard`
2. Naviguer vers `/backoffice/formations-partenaires`
   - ✓ Liste des formations `EN_ATTENTE_VALIDATION` affichée
   - ✓ Colonnes : Titre, Partenaire, Type partenaire, Date soumission, Délai, Statut, Actions
   - ✓ Badge "J+5 dépassé" si soumission > 5 jours
3. Cliquer **Valider** sur une formation
   - ✓ Redirige vers `/backoffice/formations-partenaires/:id/valider`
   - ✓ Formulaire : type_formation, pilier_abonnement, prix_coutant
4. Choisir `STANDARD`, `RETAIL`, saisir prix → **Valider et publier**
   - ✓ Toast "Formation validée avec succès"
   - ✓ Retour à la liste, formation sort (statut ACTIVE)
5. Cliquer **Rejeter** sur une autre formation → saisir motif ≥ 10 car → confirmer
   - ✓ Toast "Formation rejetée avec succès"
6. Cliquer **Suspendre** sur une formation ACTIVE → motif ≥ 5 car
   - ✓ Toast "Formation suspendue avec succès"

### Vérification Network tab

| Action | Méthode | URL attendue | Status |
|---|---|---|---|
| Liste | GET | `/api/responsable/validations` | 200 |
| Détail | GET | `/api/responsable/validations/:id` | 200 |
| Valider | PUT | `/api/responsable/validations/:id/valider` | 200 |
| Rejeter | PUT | `/api/responsable/validations/:id/rejeter` | 200 |
| Suspendre | PUT | `/api/responsable/validations/:id/suspendre` | 200 |
| Réactiver | PUT | `/api/responsable/validations/:id/reactiver` | 200 |

### Via curl (alternative)

```bash
TOKEN="<JWT du RESPONSABLE>"
BASE="http://localhost:4000/api"

# Liste
curl -H "Authorization: Bearer $TOKEN" $BASE/responsable/validations

# Détail
curl -H "Authorization: Bearer $TOKEN" $BASE/responsable/validations/<fp_id>

# Valider
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type_formation":"STANDARD","pilier_abonnement":"RETAIL","prix_coutant_valide":100000}' \
  $BASE/responsable/validations/<fp_id>/valider

# Rejeter
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"motif":"Contenu incomplet, manque objectifs pédagogiques détaillés."}' \
  $BASE/responsable/validations/<fp_id>/rejeter

# Suspendre
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"motif_suspension":"Test E2E"}' \
  $BASE/responsable/validations/<fp_id>/suspendre

# Réactiver
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  $BASE/responsable/validations/<fp_id>/reactiver
```

**Critère PASS** : toutes les requêtes renvoient 200 + UI réagit correctement.

---

## 2. Scénario AGENT — Reversements partenaires (RM-138)

### Via UI

1. Login comme AGENT → redirige vers `/backoffice/dashboard`
2. Naviguer vers `/backoffice/reversements-partenaires`
   - ✓ Liste des partenaires avec commissions EN_ATTENTE
   - ✓ Colonnes : Partenaire, Nb commissions, Montant total (XOF net, sans commission_forges_pct)
3. Cliquer **Effectuer reversement** → saisir référence → confirmer
   - ✓ Toast "Reversement validé avec succès"
   - ✓ Partenaire disparaît de la liste

### Vérification Network tab

| Action | Méthode | URL attendue | Status |
|---|---|---|---|
| Liste | GET | `/api/agent/reversements/partenaires` | 200 |
| Effectuer | POST | `/api/agent/reversements/:partenaireId/effectuer` | 200 |

### Via curl

```bash
TOKEN="<JWT AGENT>"
BASE="http://localhost:4000/api"

curl -H "Authorization: Bearer $TOKEN" $BASE/agent/reversements/partenaires

curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"preuve_virement":"REF-20260420-001","date_execution":"2026-04-20T10:00:00Z"}' \
  $BASE/agent/reversements/<partenaire_id>/effectuer
```

**Critère PASS** : l'endpoint n'expose JAMAIS `commission_forges_pct` ni `prix_catalogue` (RM-130).

---

## 3. Scénario APPRENANT — Inscription à une session + Dossier

### Via UI

1. Login comme APPRENANT
2. Naviguer vers `/catalogue`
   - ✓ Liste des formations PUBLIEE
   - ✓ Badge "Inclus" si formation `inclus_abonnement=true`
   - ✓ Badge "Premium" si `type_formation=PREMIUM`
3. Cliquer sur une formation → détail → **Accéder maintenant** (A_LA_DEMANDE) ou **Voir les sessions**
4. Pour une formation AVEC_SESSION : cliquer sur session → **S'inscrire**
   - ✓ Dossier créé, toast succès

### Vérification Network tab

| Action | Méthode | URL attendue | Status |
|---|---|---|---|
| Catalogue | GET | `/api/formations` | 200 |
| Détail | GET | `/api/formations/:id` | 200 |
| Accéder (A_LA_DEMANDE) | POST | `/api/formations/:id/acceder` | 200 ou 201 |
| Inscription session | POST | `/api/sessions/:id/inscrire` | 201 |

---

## 4. Scénario RESPONSABLE — Décision dossier (RM-05, UCS08)

### Via UI

1. Login RESPONSABLE
2. Naviguer vers `/backoffice/dossiers/:id/decision`
   - ✓ Détail dossier chargé (GET `/dossiers/:id`)
   - ✓ Boutons visibles selon statut
3. **Retenir** (dossier EN_ATTENTE_VERIFICATION, Premium+Retail)
   - ✓ POST `/dossiers/:id/retenir` → 200
   - ✓ Toast "Dossier retenu avec succès"
4. **Refuser** (autre dossier) → motif ≥ 5 car
   - ✓ PUT `/dossiers/:id/refuser` → 200
5. **Traiter exception** (dossier EXCEPTION) → décision RETENU ou REFUSE
   - ✓ PUT `/dossiers/:id/exception` → 200

### Via curl

```bash
TOKEN="<JWT RESPONSABLE>"
BASE="http://localhost:4000/api"

curl -H "Authorization: Bearer $TOKEN" $BASE/dossiers/<dossier_id>

curl -X POST -H "Authorization: Bearer $TOKEN" \
  $BASE/dossiers/<dossier_id>/retenir

curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"motif_refus":"Dossier incomplet"}' \
  $BASE/dossiers/<dossier_id>/refuser

curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"decision":"RETENU"}' \
  $BASE/dossiers/<dossier_id>/exception
```

---

## 5. Checklist régression — Routes modifiées/supprimées

- [ ] `/api/profil` (GET/PUT) retourne **404** (route supprimée)
- [ ] `/api/partenaires/responsable/*` retourne **404** (migré vers `/api/responsable/*`)
- [ ] `/api/partenaires/agent/*` retourne **404** (migré vers `/api/agent/*`)

```bash
curl -I -H "Authorization: Bearer $TOKEN" $BASE/profil
# Attendu: HTTP/1.1 404 Not Found

curl -I -H "Authorization: Bearer $TOKEN" $BASE/partenaires/responsable/formations-partenaires
# Attendu: HTTP/1.1 404 Not Found
```

---

## 6. Critères de réussite globaux

- ✅ Tous les scénarios 1-4 exécutés sans erreur console
- ✅ Aucune requête 404/500 inattendue dans Network tab
- ✅ Aucune donnée confidentielle exposée (commission_forges_pct, prix_catalogue) côté AGENT/partenaire UI
- ✅ Emails envoyés (vérifier console backend : `[EmailService]` logs)
- ✅ Audit logs écrits (vérifier `audit.log` si AuditLogger fichier, sinon console)

---

## 7. En cas d'échec

Si un scénario échoue, fournir :
1. URL de la requête qui a échoué
2. Status code + body de la réponse
3. Logs backend pertinents (stack trace)
4. Screenshot ou message d'erreur UI
