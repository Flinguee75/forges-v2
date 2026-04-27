import { z } from 'zod';

export const ValidateVoucherSchema = z.object({
  code: z.string().min(1),
  formation_id: z.string().min(1),
  apprenant_id: z.string().min(1).optional(),
});

export type ValidateVoucherDto = z.infer<typeof ValidateVoucherSchema>;
