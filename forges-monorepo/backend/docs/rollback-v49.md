# Procedure Rollback v4.9 vers v4.8

## Contexte

Cette procedure couvre la migration `20260429_add_devis_ngser_v49`, appliquee au-dessus de la baseline `0_init_v48_baseline`.

La migration v4.9 ajoute :
- enum `StatutDevis` ;
- table `devis` ;
- champs NGSER sur `Paiement` ;
- index uniques `Paiement_transaction_id_key` et `Paiement_order_ngser_key` ;
- defaut `Partenaire.commission_forges_pct = 30`.

## Methode recommandee : restaurer le backup J1

Utiliser cette methode si la v4.9 doit etre retiree completement, donnees incluses.

```bash
pm2 stop forges-backend

# Adapter le chemin au backup valide J1.
psql "$DATABASE_URL" < /tmp/forges-v48-baseline-YYYYMMDD-HHMMSS.sql

npx prisma migrate status
pm2 restart forges-backend
```

## Methode alternative : rollback SQL manuel

Utiliser seulement si les donnees v4.8 creees apres migration doivent etre conservees. Cette methode supprime les donnees v4.9 (`devis`, champs NGSER).

```sql
BEGIN;

DROP INDEX IF EXISTS "Paiement_order_ngser_key";
DROP INDEX IF EXISTS "Paiement_transaction_id_key";

DROP TABLE IF EXISTS "devis" CASCADE;
DROP TYPE IF EXISTS "StatutDevis";

ALTER TABLE "Paiement" DROP COLUMN IF EXISTS "provider";
ALTER TABLE "Paiement" DROP COLUMN IF EXISTS "payment_token_ngser";
ALTER TABLE "Paiement" DROP COLUMN IF EXISTS "order_ngser";
ALTER TABLE "Paiement" DROP COLUMN IF EXISTS "montant_initie";
ALTER TABLE "Paiement" DROP COLUMN IF EXISTS "wallet_ngser";
ALTER TABLE "Paiement" DROP COLUMN IF EXISTS "code_ngser";
ALTER TABLE "Paiement" DROP COLUMN IF EXISTS "status_ngser";
ALTER TABLE "Paiement" DROP COLUMN IF EXISTS "ngser_payload_last";
ALTER TABLE "Paiement" DROP COLUMN IF EXISTS "reconciled_at";

ALTER TABLE "Partenaire" ALTER COLUMN "commission_forges_pct" SET DEFAULT 20;

DELETE FROM "_prisma_migrations"
WHERE "migration_name" = '20260429_add_devis_ngser_v49';

COMMIT;
```

## Verification apres rollback

```bash
npx prisma migrate status
npm run build
npm test -- --runInBand
```

## Notes operationnelles

- Ne pas rollbacker la baseline `0_init_v48_baseline` : elle represente l'etat v4.8 deja existant.
- Faire un backup juste avant rollback manuel.
- Verifier l'absence de processus qui ecrit dans `Paiement` pendant le rollback.
