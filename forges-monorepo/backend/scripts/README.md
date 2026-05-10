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
3. Tu veux rejouer le scénario complet organisation + apprenants + devis + vouchers: `scripts/enrolements/import-groupe.ts`.
4. Tu veux confirmer un paiement et activer les vouchers: `scripts/enrolements/payer-devis.ts`.
5. Tu veux envoyer un rappel J-7: `scripts/enrolements/rappel-j7.ts`.

## Scripts repères

| Besoin | Script |
|---|---|
| Reset environnement dev | `scripts/admin/reset-dev.ts` |
| Reset environnement edu | `scripts/admin/reset-edu.ts` |
| Seed simple d'organisations | `scripts/admin/script-orga.ts` |
| Workflow complet d'enrôlement test | `scripts/admin/script_organisations_point_focal.ts` |
| Workflow standard d'organisation | `scripts/enrolements/import-groupe.ts` |
| Paiement d'un devis organisation | `scripts/enrolements/payer-devis.ts` |
| Rappel J-7 | `scripts/enrolements/rappel-j7.ts` |

## Commande standard

```bash
node -r ts-node/register/transpile-only scripts/<chemin-du-script>.ts
```

Ajouter `--dry-run` quand le script le supporte.
