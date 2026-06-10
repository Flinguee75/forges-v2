export type BotPublicStatus = 'ACTIVE' | 'TERMINEE' | 'ABANDONNEE';

export interface BotQuestionView {
  id: string;
  question: string;
  options: Array<{ value: string; label: string }>;
  required: boolean;
  allow_commentaire: boolean;
  commentaire_max_length: number | null;
}

export interface BotSessionView {
  id: string;
  flux_actif: string;
  statut: BotPublicStatus;
  langue: string;
  current_question: BotQuestionView | null;
  historique: {
    steps: unknown[];
    metadata: Record<string, unknown>;
  };
  recommendations: unknown[];
}
