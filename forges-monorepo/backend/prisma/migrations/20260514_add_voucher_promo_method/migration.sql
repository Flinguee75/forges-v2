-- Allow voucher promo payments to be stored explicitly in the payment channel enum.
ALTER TYPE "MethodePaiement" ADD VALUE IF NOT EXISTS 'VOUCHER_PROMO';
