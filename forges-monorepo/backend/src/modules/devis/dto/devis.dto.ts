import { z } from 'zod';

export const CreerDevisSchema = z.object({
  organisation_id: z.string().uuid(),
  formation_id: z.string().min(1),
  session_id: z.string().uuid(),
  nb_places: z.number().int().min(1),
  tarif_unitaire_xof: z.number().int().min(1),
  notes_admin: z.string().max(1000).optional(),
});

export const AnnulerDevisSchema = z.object({
  notes_admin: z.string().max(1000).optional(),
});

export const PayerDevisSchema = z.object({
  notes_admin: z.string().max(1000).optional(),
});

export type CreerDevisDto = z.infer<typeof CreerDevisSchema>;
export type AnnulerDevisDto = z.infer<typeof AnnulerDevisSchema>;
export type PayerDevisDto = z.infer<typeof PayerDevisSchema>;
