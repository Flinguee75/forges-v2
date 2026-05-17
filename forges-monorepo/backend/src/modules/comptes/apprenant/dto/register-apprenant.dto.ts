import { z } from 'zod';

export const RegisterApprenantSchema = z.object({
  email: z.string().email('Email invalide').transform(e => e.toLowerCase()),
  password: z
    .string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  nom: z.string().min(1, 'Nom obligatoire'),
  prenoms: z.string().min(1, 'Prénom obligatoire'),
  // RM-34 : type_apprenant obligatoire, non modifiable après activation
  type_apprenant: z.enum(['PROFESSIONNEL', 'APPRENANT']),
  // RM-35 : secteur obligatoire si PROFESSIONNEL
  secteur_activite: z.string().optional(),
  // RM-36 : niveau obligatoire si APPRENANT
  niveau_etude: z.string().optional(),
  // RM-48 : pays obligatoires
  pays_residence: z.string().length(2, 'Code ISO 3166-1 requis (2 lettres)'),
  pays_nationalite: z.string().length(2, 'Code ISO 3166-1 requis (2 lettres)'),
  // RM-98 : langue préférée
  langue_preferee: z.enum(['FR', 'EN', 'ES', 'PT']).default('FR'),
  // Liaison optionnelle à une organisation existante
  organisation_id: z.string().uuid().optional(),
  // RM-33 : consentement RGPD obligatoire
  consentement_rgpd: z.literal(true, {
    errorMap: () => ({ message: 'Le consentement RGPD est obligatoire' })
  }),
}).refine(
  data => !(data.type_apprenant === 'PROFESSIONNEL' && !data.secteur_activite),
  { message: 'Secteur obligatoire pour un professionnel', path: ['secteur_activite'] }
).refine(
  data => !(data.type_apprenant === 'APPRENANT' && !data.niveau_etude),
  { message: 'Niveau d\'étude obligatoire pour un apprenant scolarisé', path: ['niveau_etude'] }
);

export type RegisterApprenantDto = z.infer<typeof RegisterApprenantSchema>;
