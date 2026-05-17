# Scripts `enrolements`

Scripts métier liés aux flux d'enrôlement organisation, paiement de devis et rappels.

## Script principal

| Script | Rôle | Quand l'utiliser |
|---|---|---|
| `import-groupe.ts` | Enrôlement complet d'une organisation | Cas standard de production |
| `payer-devis.ts` | Confirmation du paiement et activation des vouchers | À réception du virement |
| `rappel-j7.ts` | Email de rappel J-7 | 7 jours avant la session |
| `creer-apprenants-et-devis.ts` | Création/réutilisation d'apprenants depuis CSV + facture PDF personnalisée | Cas final apprenants individuels |
| `creer-apprenants-etudiants.ts` | Création/réutilisation d'apprenants étudiants depuis CSV + facture PDF personnalisée | Cas lot étudiants |
| `creer-apprenants-avec-voucher.ts` | Enrôlement CSV d'apprenants existants avec voucher optionnel | Cas CSV apprenants + voucher promo (formation/session requis) |

## Scripts d'envoi annexes

| Script | Rôle |
|---|---|
| `envoyer-confirmations-anssi.ts` | Renvoi des confirmations apprenants / organisation |
| `envoyer-devis-anssi.ts` | Envoi ciblé du devis ANSSI |
| `creer-apprenants-et-devis.ts` | Workflow CSV apprenants + facture PDF personnalisée |
| `creer-apprenants-etudiants.ts` | Workflow CSV apprenants étudiants + facture PDF personnalisée |

## Règle de lecture

- Si tu veux faire le flux standard, commence par `import-groupe.ts`.
- Si tu veux confirmer un paiement, passe par `payer-devis.ts`.
- Si tu veux juste un rappel pratique avant la session, utilise `rappel-j7.ts`.
- Si tu veux créer/réutiliser des apprenants depuis un CSV et leur envoyer une facture PDF personnalisée, utilise `creer-apprenants-et-devis.ts` avec `groupes/apprenants-individuels-final.csv`.
- Si tu veux faire la même chose pour le lot étudiants, utilise `creer-apprenants-etudiants.ts` avec `groupes/apprenants_etudiants.csv`.
- Pour un test rapide sur 3 lignes, utilise `groupes/apprenants_etudiants_test.csv`.
- Si tu veux enrôler des apprenants déjà créés depuis un CSV avec une colonne `voucher`, utilise `creer-apprenants-avec-voucher.ts` en passant `--formation` et `--session`.

## Doc détaillée

- [creer-apprenants-et-devis.md](./creer-apprenants-et-devis.md)
- [creer-apprenants-etudiants.md](./creer-apprenants-etudiants.md)
