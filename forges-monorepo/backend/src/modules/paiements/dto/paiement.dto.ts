import { z } from 'zod';

export const InitierPaiementSchema = z.object({
  dossier_id: z.string().min(1),
  methode: z.enum(['MOBILE_MONEY', 'CARTE', 'VIREMENT', 'VOUCHER_ORG']),
  numero_mobile: z.string().optional(), // Pour Mobile Money
});

export const InitierPaiementNgserSchema = z.object({
  dossier_id: z.string().min(1),
});

export const WebhookPaiementSchema = z.object({
  transaction_id: z.string().min(1),
  dossier_id: z.string().min(1),
  statut: z.enum(['SUCCESS', 'FAILED']),
  montant: z.number().int().min(0),
  // Signature HMAC pour authentification webhook
  signature: z.string().optional(),
});

export type InitierPaiementDto = z.infer<typeof InitierPaiementSchema>;
export type InitierPaiementNgserDto = z.infer<typeof InitierPaiementNgserSchema>;
export type WebhookPaiementDto = z.infer<typeof WebhookPaiementSchema>;
