import { z } from 'zod';

// Flux A : commande vouchers Organisation
export const CommanderVouchersOrgSchema = z.object({
  formation_id: z.string().uuid(),
  nb_places: z.number().int().min(1, 'Minimum 1 place'),
  montant_unitaire: z.number().int().min(0, 'Montant en centimes XOF'),
  // RM-40 : date_expiration obligatoire
  date_expiration: z.string().datetime(),
});

// Flux B : création voucher promotionnel (Agent Comptable)
export const CreateVoucherPromoSchema = z.object({
  formation_id: z.string().uuid(),
  // RM-42 : valeur = montant fixe ou pourcentage
  valeur: z.number().int().min(1),
  type_valeur: z.enum(['MONTANT', 'POURCENTAGE']),
  // RM-40 : quota_max >= 1 obligatoire
  quota_max: z.number().int().min(1, 'Quota minimum 1'),
  // RM-40 : date_expiration obligatoire
  date_expiration: z.string().datetime(),
}).refine(
  data => !(data.type_valeur === 'POURCENTAGE' && data.valeur > 100),
  { message: 'Pourcentage ne peut pas dépasser 100', path: ['valeur'] }
);

export const RefuserVoucherSchema = z.object({
  motif: z.string().min(10, 'Motif obligatoire (min 10 caractères)'),
});

export type CommanderVouchersOrgDto = z.infer<typeof CommanderVouchersOrgSchema>;
export type CreateVoucherPromoDto = z.infer<typeof CreateVoucherPromoSchema>;
