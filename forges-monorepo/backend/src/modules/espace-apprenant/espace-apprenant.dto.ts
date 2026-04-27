import { z } from 'zod';

export const UpdateProgressionFormationDemandeSchema = z.object({
  progression: z.number().int().min(0).max(100),
});
