import { z } from 'zod';

export const UpdateProfilApporteurSchema = z.object({
  nom: z.string().min(2).optional(),
  email: z.string().email().transform((value) => value.toLowerCase()).optional(),
  telephone: z.string().min(6).optional(),
  pays: z.string().length(2).optional(),
});

export const RegisterApporteurSchema = z.object({
  nom: z.string().min(2),
  email: z.string().email().transform((value) => value.toLowerCase()),
  telephone: z.string().min(6).optional(),
  adresse: z.string().optional(),
  password: z.string().min(8),
  type: z.enum(['INDIVIDU', 'ORGANISATION']).default('INDIVIDU'),
  langue_preferee: z.enum(['FR', 'EN', 'ES', 'PT']).default('FR'),
  consentement_rgpd: z.boolean().optional(),
}).passthrough();

export type UpdateProfilApporteurDto = z.infer<typeof UpdateProfilApporteurSchema>;
export type RegisterApporteurDto = z.infer<typeof RegisterApporteurSchema>;
