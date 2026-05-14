# Scripts Backend FORGES

Répertoire des scripts manuels, de seed et d'enrôlement.

## Lire d'abord

- `admin/` = initialisation, correction, seed ciblé.
- `enrolements/` = flux métier d'organisation, devis, paiements, rappels.
- Un seul script par besoin: ne mélange pas les scripts de seed simple avec les scripts de workflow complet.
- Commencer par `--dry-run` dès que le script touche à la base.

## Arbre de décision rapide

1. Tu veux remettre un environnement à zéro: `scripts/admin/reset-dev.ts` ou `scripts/admin/reset-edu.ts`.
2. Tu veux créer ou corriger des organisations sans flux métier: `scripts/admin/script-orga.ts`.
3. Tu veux rejouer le scénario complet organisation + apprenants + devis + vouchers + emails: `scripts/admin/script_organisations_point_focal.ts`.
4. Tu veux rejouer le scénario complet standard d'organisation: `scripts/enrolements/import-groupe.ts`.
5. Tu veux confirmer un paiement et activer les vouchers: `scripts/enrolements/payer-devis.ts`.
6. Tu veux envoyer un rappel J-7: `scripts/enrolements/rappel-j7.ts`.
7. Tu veux créer/réutiliser des apprenants depuis un CSV et leur envoyer une facture PDF personnalisée: `scripts/enrolements/creer-apprenants-et-devis.ts`.
8. Tu veux faire la même chose pour un lot d'étudiants avec un CSV dédié: `scripts/enrolements/creer-apprenants-etudiants.ts`.
9. Tu veux tester l'envoi du reçu PDF de paiement vers un dossier confirmé: `scripts/test-recu-email.ts`.

## Scripts repères

| Besoin | Script |
|---|---|
| Reset environnement dev | `scripts/admin/reset-dev.ts` |
| Reset environnement edu | `scripts/admin/reset-edu.ts` |
| Seed simple d'organisations | `scripts/admin/script-orga.ts` |
| Workflow complet d'enrôlement test + emails | `scripts/admin/script_organisations_point_focal.ts` |
| Workflow standard d'organisation | `scripts/enrolements/import-groupe.ts` |
| Paiement d'un devis organisation | `scripts/enrolements/payer-devis.ts` |
| Rappel J-7 | `scripts/enrolements/rappel-j7.ts` |
| Workflow CSV apprenants + facture PDF personnalisée | `scripts/enrolements/creer-apprenants-et-devis.ts` |
| Workflow CSV apprenants étudiants + facture PDF personnalisée | `scripts/enrolements/creer-apprenants-etudiants.ts` |
| Test reçu PDF paiement par email | `scripts/test-recu-email.ts` |

## Commande standard

```bash
node -r ts-node/register/transpile-only scripts/<chemin-du-script>.ts
```

Ajouter `--dry-run` quand le script le supporte.

Pour le reçu de paiement:

```bash
EMAIL_TEST_OVERRIDE=you@example.com \
node -r ts-node/register/transpile-only scripts/test-recu-email.ts --dossier <dossier_id>
```
