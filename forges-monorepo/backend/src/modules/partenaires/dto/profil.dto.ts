import { z } from 'zod';

export const UpdateProfilPartenaireSchema = z.object({
  raison_sociale: z.string().min(2).optional(),
  email_principal: z.string().email().transform((value) => value.toLowerCase()).optional(),
  pays: z.string().length(2).optional(),
  type: z.enum(['UNIVERSITE', 'ENTREPRISE_FORMATION', 'ONG', 'INSTITUTION', 'AUTRE']).optional(),
  site_web: z.string().url().optional().nullable(),
  telephone: z.string().max(30).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  logo_url: z.string().max(200000).optional().nullable(),
});

export type UpdateProfilPartenaireDto = z.infer<typeof UpdateProfilPartenaireSchema>;
