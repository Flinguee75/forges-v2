import { z } from 'zod';

const BaseDevisSchema = z.object({
  formation_id: z.string().min(1),
  session_id: z.string().min(1),
  tarif_unitaire_xof: z.number().int().min(1),
  notes_admin: z.string().max(1000).optional(),
});

const DevisOrganisationSchema = BaseDevisSchema.extend({
  organisation_id: z.string().min(1),
  nb_places: z.number().int().min(1),
  destinataire_nom: z.undefined(),
  destinataire_email: z.undefined(),
  destinataire_organisation: z.undefined(),
});

const DevisApprenantSchema = BaseDevisSchema.extend({
  organisation_id: z.undefined(),
  nb_places: z.number().int().min(1).optional(),
  destinataire_nom: z.string().min(1),
  destinataire_email: z.string().email(),
  destinataire_organisation: z.string().optional(),
});

export const CreerDevisSchema = z.union([DevisOrganisationSchema, DevisApprenantSchema]);

export const AnnulerDevisSchema = z.object({
  notes_admin: z.string().max(1000).optional(),
});

export const PayerDevisSchema = z.object({
  notes_admin: z.string().max(1000).optional(),
});

export type CreerDevisDto = z.infer<typeof CreerDevisSchema>;
export type AnnulerDevisDto = z.infer<typeof AnnulerDevisSchema>;
export type PayerDevisDto = z.infer<typeof PayerDevisSchema>;
