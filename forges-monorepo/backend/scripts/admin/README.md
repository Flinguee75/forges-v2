# Scripts `admin`

Scripts de maintenance, d'initialisation et de seed ciblé.

## Règle simple

- `reset-dev.ts` et `reset-edu.ts` servent à remettre un environnement à zéro.
- `script-orga.ts` sert à créer ou mettre à jour un lot d'organisations depuis un fichier JSON.
- `script_organisations.ts` sert au workflow complet de test pour une organisation avec apprenants, devis et vouchers.

## Scripts disponibles

| Script | Usage | Remarque |
|---|---|---|
| `reset-dev.ts` | Réinitialiser l'environnement `dev` | Destructif |
| `reset-edu.ts` | Réinitialiser l'environnement `edu` | Destructif |
| `script-orga.ts` | Seed simple d'organisations | Prend un fichier JSON en entrée |
| `script_organisations.ts` | Workflow complet de test | Scénario Point Focal / vouchers |

## Conseils

- Toujours lancer un `--dry-run` avant une exécution réelle si le script modifie la base.
- Utiliser `script-orga.ts` pour les ajouts simples.
- Utiliser `script_organisations.ts` uniquement quand on veut rejouer le parcours complet de facturation organisation.

