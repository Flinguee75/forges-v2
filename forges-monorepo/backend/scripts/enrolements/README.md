# Scripts `enrolements`

Scripts métier liés aux flux d'enrôlement organisation, paiement de devis et rappels.

## Script principal

| Script | Rôle | Quand l'utiliser |
|---|---|---|
| `import-groupe.ts` | Enrôlement complet d'une organisation | Cas standard de production |
| `payer-devis.ts` | Confirmation du paiement et activation des vouchers | À réception du virement |
| `rappel-j7.ts` | Email de rappel J-7 | 7 jours avant la session |
| `creer-apprenants-et-devis.ts` | Création/réutilisation d'apprenants depuis CSV + facture PDF personnalisée | Cas final apprenants individuels |

## Scripts d'envoi annexes

| Script | Rôle |
|---|---|
| `envoyer-confirmations-anssi.ts` | Renvoi des confirmations apprenants / organisation |
| `envoyer-devis-anssi.ts` | Envoi ciblé du devis ANSSI |
| `creer-apprenants-et-devis.ts` | Workflow CSV apprenants + facture PDF personnalisée |

## Règle de lecture

- Si tu veux faire le flux standard, commence par `import-groupe.ts`.
- Si tu veux confirmer un paiement, passe par `payer-devis.ts`.
- Si tu veux juste un rappel pratique avant la session, utilise `rappel-j7.ts`.
- Si tu veux créer/réutiliser des apprenants depuis un CSV et leur envoyer une facture PDF personnalisée, utilise `creer-apprenants-et-devis.ts` avec `groupes/apprenants-individuels-final.csv`.

## Doc détaillée

- [creer-apprenants-et-devis.md](./creer-apprenants-et-devis.md)
