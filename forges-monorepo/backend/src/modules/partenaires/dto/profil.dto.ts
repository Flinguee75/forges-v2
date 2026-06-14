import { z } from 'zod';

export const UpdateProfilPartenaireSchema = z.object({
  raison_sociale: z.string().min(2).optional(),
  email_principal: z.string().email().transform((value) => value.toLowerCase()).optional(),
  pays: z.string().length(2).optional(),
  logo_url: z.string().max(200000).optional().nullable(),
});

export type UpdateProfilPartenaireDto = z.infer<typeof UpdateProfilPartenaireSchema>;
