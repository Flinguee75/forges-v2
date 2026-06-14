import { z } from 'zod';

export const CreateFormationSchema = z.object({
  intitule: z.string().min(3, 'Intitulé obligatoire'),
  description_courte: z.string().max(500, 'Max 500 caractères'),
  description_longue: z.string().max(5000).optional(),
  duree_jours: z.number().int().min(1),
  cout_catalogue: z.number().int().min(0, 'Tarif en centimes XOF'),
  // RM-86 : type_formation assigné par FORGES — ABSENT du DTO création externe
  // Présent uniquement pour les formations internes FORGES (Admin/Responsable)
  type_formation: z.enum(['STANDARD', 'PREMIUM', 'SUR_DEVIS']).optional(),
  // RM-91 : mode_formation obligatoire
  mode_formation: z.enum(['PRESENTIEL', 'EN_LIGNE', 'A_LA_DEMANDE', 'AVEC_SESSION']),
  lieu: z.string().optional(),
  pilier_abonnement: z.enum(['RETAIL', 'B2B', 'INSTITUTIONNEL', 'TOUS']).optional(),
  langues_disponibles: z.array(z.enum(['FR', 'EN', 'ES', 'PT'])).min(1),
  certification_delivree: z.boolean().default(false),
  public_cible: z.string().optional(),
  objectifs_pedagogiques: z.array(z.string()).max(10).optional(),
  competences_acquises: z.array(z.string().max(80)).max(20).optional(),
  outils: z.array(z.string().max(80)).max(20).optional(),
  chapitres: z.array(z.object({
    ordre: z.number().int().min(1),
    titre: z.string().min(1).max(200),
    duree: z.string().max(20).optional(),
  })).max(50).optional(),
  prerequis: z.string().optional(),
  // RM-92 : durée accès formations à la demande (défaut 365j)
  duree_acces_jours: z.number().int().min(1).default(365),
  // URL du contenu LMS (formations à la demande uniquement) — chiffrée côté backend
  url_contenu: z.string().url().optional(),
  image_url: z.string().url().optional(),
});

// RM-127 : DTO assignation type — Responsable FORGES uniquement
export const AssignerTypeFormationSchema = z.object({
  type_formation: z.enum(['STANDARD', 'PREMIUM', 'SUR_DEVIS']),
  pilier_abonnement: z.enum(['RETAIL', 'B2B', 'INSTITUTIONNEL', 'TOUS']),
});

export const LierPartenaireSchema = z.object({
  partenaire_id: z.string().min(1, 'Partenaire obligatoire'),
  prix_coutant_soumis: z.number().int().min(0, 'Prix coûtant invalide').optional(),
});

export const UpdateFormationSchema = CreateFormationSchema.partial().omit({
  type_formation: true, // RM-86 : non modifiable via update standard
}).extend({
  url_contenu: z.string().url().optional(),
  lieu: z.string().optional(),
  image_url: z.string().url().optional().nullable(),
});

export type CreateFormationDto = z.infer<typeof CreateFormationSchema>;
export type AssignerTypeFormationDto = z.infer<typeof AssignerTypeFormationSchema>;
export type LierPartenaireDto = z.infer<typeof LierPartenaireSchema>;
export type UpdateFormationDto = z.infer<typeof UpdateFormationSchema>;
