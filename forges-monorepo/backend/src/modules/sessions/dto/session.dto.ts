import { z } from 'zod';

export const CreateSessionSchema = z.object({
  formation_id: z.string().min(1),
  date_ouverture: z.string().datetime(),
  date_cloture: z.string().datetime(),
  date_debut: z.string().datetime(),
  date_fin: z.string().datetime(),
  capacite: z.number().int().min(1, 'Capacité minimum 1'),
}).refine(
  // RM-16 : ordre chronologique obligatoire (ouverture ≤ clôture ≤ début ≤ fin)
  data => new Date(data.date_ouverture) <= new Date(data.date_cloture),
  { message: 'date_ouverture doit être avant ou égale à date_cloture (RM-16)', path: ['date_ouverture'] }
).refine(
  data => new Date(data.date_cloture) <= new Date(data.date_debut),
  { message: 'date_cloture doit être avant ou égale à date_debut (RM-16)', path: ['date_cloture'] }
).refine(
  data => new Date(data.date_debut) <= new Date(data.date_fin),
  { message: 'date_debut doit être avant ou égale à date_fin (RM-16)', path: ['date_debut'] }
);

// RM-25 : planification annuelle en masse
export const PlanificationAnnuelleSchema = z.object({
  formation_id: z.string().uuid(),
  premiere_date_ouverture: z.string().datetime(),
  frequence_semaines: z.number().int().min(1).max(52),
  nb_sessions: z.number().int().min(1).max(52),
  duree_inscription_jours: z.number().int().min(1).default(30),
  duree_session_jours: z.number().int().min(1),
  capacite: z.number().int().min(1),
});

export type CreateSessionDto = z.infer<typeof CreateSessionSchema>;
export type PlanificationAnnuelleDto = z.infer<typeof PlanificationAnnuelleSchema>;
