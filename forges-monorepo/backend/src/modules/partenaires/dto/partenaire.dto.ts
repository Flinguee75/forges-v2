import { z } from 'zod';

// RM-126 : auto-inscription partenaire
export const AutoInscriptionPartenaireSchema = z.object({
  raison_sociale: z.string().min(2),
  type: z.enum(['UNIVERSITE', 'ENTREPRISE_FORMATION', 'ONG', 'INSTITUTION', 'AUTRE']),
  pays: z.string().length(2),
  email_principal: z.string().email().transform(e => e.toLowerCase()),
  password: z.string().min(8),
});

// RM-136 : formulaire soumission formation — 21 champs — SANS type_formation ni pilier
export const SoumettreFormationSchema = z.object({
  intitule: z.string().min(3),
  description_courte: z.string().max(500),
  description_longue: z.string().max(5000).optional(),
  duree_jours: z.number().int().min(1),
  // RM-127 : type_formation ABSENT — assigné par FORGES uniquement
  mode_formation: z.enum(['AVEC_SESSION', 'A_LA_DEMANDE']),
  // RM-127 : pilier_abonnement ABSENT
  langues_disponibles: z.array(z.enum(['FR', 'EN', 'ES', 'PT'])).min(1),
  certification_delivree: z.boolean().default(false),
  organisme_certificateur: z.string().optional(),
  public_cible: z.string().optional(),
  objectifs_pedagogiques: z.array(z.string()).min(1).max(10),
  prerequis: z.string().optional(),
  programme_syllabus: z.string().optional(),
  modalite: z.enum(['PRESENTIEL', 'DISTANCIEL', 'HYBRIDE']).optional(),
  nb_places_max_session: z.number().int().min(1).optional(),
  // RM-129 : prix coûtant soumis par le partenaire
  prix_coutant_propose: z.number().int().min(1, 'Prix coûtant obligatoire en XOF'),
  commentaire_positionnement: z.string().optional(), // RM-127 : suggestion sans valeur contractuelle
  // URL du contenu LMS (formations à la demande uniquement) — chiffrée côté backend
  url_contenu: z.string().url().optional(),
});

// UCS18 — DTO validation par Responsable
export const ValiderFormationSchema = z.object({
  // RM-127 : ces champs EXCLUSIVEMENT assignés par le Responsable FORGES
  type_formation: z.enum(['STANDARD', 'PREMIUM', 'SUR_DEVIS']),
  pilier_abonnement: z.enum(['RETAIL', 'B2B', 'INSTITUTIONNEL', 'TOUS']),
  prix_coutant_valide: z.number().int().min(1),
  commentaire_responsable: z.string().optional(),
});

export const RejeterFormationSchema = z.object({
  // RM-128 : motif obligatoire
  motif: z.string().min(10, 'Motif de rejet obligatoire (minimum 10 caractères)'),
  corrections_suggeres: z.string().optional(),
});

export type AutoInscriptionPartenaireDto = z.infer<typeof AutoInscriptionPartenaireSchema>;
export type SoumettreFormationDto = z.infer<typeof SoumettreFormationSchema>;
export type ValiderFormationDto = z.infer<typeof ValiderFormationSchema>;
