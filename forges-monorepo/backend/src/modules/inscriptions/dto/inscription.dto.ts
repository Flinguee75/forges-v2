import { z } from 'zod';
export const InscriptionSessionSchema = z.object({
  session_id: z.string().uuid(),
  source_financement: z.enum(['RETAIL', 'B2B', 'INSTITUTIONNEL', 'ABONNEMENT', 'VOUCHER']),
  voucher_code: z.string().uuid().optional(),
  code_apporteur: z.string().uuid().optional(),
}).refine(data => !(data.code_apporteur && data.voucher_code), { message: 'Non cumulable' });
