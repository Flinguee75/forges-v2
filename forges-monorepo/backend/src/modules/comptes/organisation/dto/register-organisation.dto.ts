import { z } from 'zod';

export const RegisterOrganisationSchema = z.object({
  raison_sociale: z.string().min(2, 'Raison sociale obligatoire'),
  type: z.enum(['ENTREPRISE', 'ASSOCIATION', 'GOUVERNEMENT', 'UNIVERSITE', 'ONG', 'AUTRE']),
  sous_types: z.array(z.string()).optional(), // RM-46 : multi-sous-types Gouvernement
  identifiant_legal: z.string().optional(),
  // RM-47 : libellé adaptatif selon type (géré côté frontend)
  contact_referent: z.string().min(2, 'Contact référent obligatoire'),
  // RM-48 : pays obligatoire
  pays: z.string().length(2, 'Code ISO 3166-1 requis'),
  langue_preferee: z.enum(['FR', 'EN', 'ES', 'PT']).default('FR'),
  email: z.string().email().transform(e => e.toLowerCase()),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  consentement_rgpd: z.literal(true, {
    errorMap: () => ({ message: 'Consentement RGPD obligatoire' })
  }),
})
// Correction PLAN_CORRECTION_WAVE4 #9 : RM-46 validation sous_types requis pour GOUVERNEMENT
.refine(
  (data) => data.type !== 'GOUVERNEMENT' || (data.sous_types && data.sous_types.length > 0),
  { message: 'sous_types requis pour type GOUVERNEMENT', path: ['sous_types'] }
);

export type RegisterOrganisationDto = z.infer<typeof RegisterOrganisationSchema>;
