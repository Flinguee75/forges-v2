import { z } from 'zod';

const baseVoucherSchema = z.object({
  formation_id: z.string().min(1),
  devis_id: z.string().min(1).optional(),
  valeur: z.coerce.number().int().positive(),
  type_valeur: z.enum(['MONTANT', 'POURCENTAGE']),
  quota_max: z.coerce.number().int().positive(),
  date_expiration: z.coerce.date(),
});

// organisation_id comes from JWT token (req.user.userId), not from body
export const CreateVoucherSchema = baseVoucherSchema;

export const CreateVoucherPromotionnelSchema = baseVoucherSchema;

export const ListVouchersQuerySchema = z.object({
  type: z.enum(['ORGANISATION', 'PROMOTIONNEL']).optional(),
  statut: z.enum(['BROUILLON', 'ACTIF', 'EPUISE', 'EXPIRE', 'REFUSE']).optional(),
  formation_id: z.string().min(1).optional(),
  organisation_id: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const VoucherIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type CreateVoucherDto = z.infer<typeof CreateVoucherSchema>;
export type CreateVoucherPromotionnelDto = z.infer<typeof CreateVoucherPromotionnelSchema>;
export type ListVouchersQueryDto = z.infer<typeof ListVouchersQuerySchema>;
export type VoucherIdParamsDto = z.infer<typeof VoucherIdParamsSchema>;
