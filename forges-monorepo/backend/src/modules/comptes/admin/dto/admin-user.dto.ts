import { z } from 'zod';

export const CreateUserDto = z.object({
  email: z.string().email().transform(e => e.toLowerCase()),
  role: z.enum(['ADMIN', 'SUPERVISEUR', 'RESPONSABLE', 'AGENT', 'GESTIONNAIRE']),
  nom: z.string().min(1),
  prenoms: z.string().min(1),
});

export const UpdateUserStatusDto = z.object({
  statut: z.enum(['ACTIF', 'INACTIF', 'SUSPENDU']),
});

// RM-126 : invitation Partenaire Flux A
export const InvitePartenaireDto = z.object({
  email: z.string().email().transform(e => e.toLowerCase()),
  raison_sociale: z.string().min(2),
  type: z.enum(['UNIVERSITE', 'ENTREPRISE_FORMATION', 'ONG', 'INSTITUTION', 'AUTRE']),
  commission_forges_pct: z.number().min(0).max(100).default(30),
});

// RM-141 : création Apporteur
export const CreateApporteurDto = z.object({
  nom: z.string().min(1),
  email: z.string().email().transform(e => e.toLowerCase()),
  type: z.enum(['INDIVIDU', 'ORGANISATION']),
  taux_commission_pct: z.number().min(0).max(100),
});

export type CreateUserDtoType = z.infer<typeof CreateUserDto>;
export type InvitePartenaireDtoType = z.infer<typeof InvitePartenaireDto>;
export type CreateApporteurDtoType = z.infer<typeof CreateApporteurDto>;
