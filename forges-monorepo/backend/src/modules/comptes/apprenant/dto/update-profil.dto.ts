import { z } from 'zod';

// DTO pour la mise à jour du profil Apprenant (UCS02)
export const UpdateProfilSchema = z.object({
  nom: z.string().min(1).max(100).optional(),
  prenoms: z.string().min(1).max(100).optional(),
  type_apprenant: z.enum(['PROFESSIONNEL', 'APPRENANT']).optional(),
  secteur_activite: z.string().max(100).optional(),
  niveau_etude: z.string().max(100).optional(),
  pays_residence: z.string().length(2).optional(),  // RM-48 : code ISO 2 lettres
  pays_nationalite: z.string().length(2).optional(), // RM-48 : code ISO 2 lettres
  langue_preferee: z.enum(['FR', 'EN', 'ES', 'PT']).optional(),  // RM-97
});

export type UpdateProfilDto = z.infer<typeof UpdateProfilSchema>;
