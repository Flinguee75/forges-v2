import { BotQuestionView, BotSessionView } from './bot.types';
import { getFeedbackQuestions } from './feedback.questions';
import { OPTIONS_BOT } from './bot-engine.service';

const ORIENTATION_QUESTIONS = [
  { id: 1, question: 'Quel est votre objectif de formation ?', options: OPTIONS_BOT.OBJECTIF },
  { id: 2, question: 'Dans quel secteur travaillez-vous ?', options: OPTIONS_BOT.SECTEUR },
  { id: 3, question: 'Quel est votre niveau actuel ?', options: OPTIONS_BOT.NIVEAU },
];

const FEEDBACK_QUESTION_IDS = [
  'feedback_note_globale',
  'feedback_note_contenu',
  'feedback_note_formateur',
  'feedback_commentaire',
  'feedback_recommande',
];

function questionId(flux: string, id: unknown): string {
  if (typeof id === 'string') return id;
  if (flux === 'FEEDBACK' && typeof id === 'number') {
    return FEEDBACK_QUESTION_IDS[id - 1] || `feedback_${id}`;
  }
  return `${flux.toLowerCase()}_${String(id ?? 'question')}`;
}

function presentQuestion(flux: string, question: any): BotQuestionView | null {
  if (!question) return null;
  const options = Array.isArray(question.options)
    ? question.options.map((option: any) => {
        if (option && typeof option === 'object') {
          return {
            value: String(option.value),
            label: String(option.label ?? option.value),
          };
        }
        return { value: String(option), label: String(option) };
      })
    : [];

  return {
    id: questionId(flux, question.id ?? question.question_id),
    question: String(question.question ?? question.texte ?? ''),
    options,
    required: Boolean(question.required ?? question.obligatoire),
    allow_commentaire: Boolean(question.allow_commentaire),
    commentaire_max_length:
      question.commentaire_max_length ?? question.max_length ?? null,
  };
}

export function presentBotSession(result: any): BotSessionView {
  const flux = result.flux_actif ?? result.flux ?? 'IDLE';
  const internalStatus = result.statut ?? (result.fin ? 'TERMINEE' : 'EN_COURS');
  const status =
    internalStatus === 'EN_COURS' ? 'ACTIVE' :
    internalStatus === 'TERMINEE' ? 'TERMINEE' :
    internalStatus === 'ABANDONNEE' ? 'ABANDONNEE' :
    internalStatus;

  const historySteps = Array.isArray(result.historique)
    ? result.historique
    : result.historique?.steps ?? [];
  let currentQuestion = result.current_question ?? result.question ?? null;
  if (!currentQuestion && flux === 'FEEDBACK' && status === 'ACTIVE') {
    const answered = new Set(historySteps.map((step: any) => step.question_id));
    currentQuestion = getFeedbackQuestions(
      result.langue,
      result.contexte?.mode_formation,
    ).find(question => !answered.has(question.id)) ?? null;
  }
  if (!currentQuestion && flux === 'ORIENTATION' && status === 'ACTIVE') {
    currentQuestion = ORIENTATION_QUESTIONS[historySteps.length] ?? null;
  }

  return {
    id: result.id ?? result.session_id,
    flux_actif: flux,
    statut: status,
    langue: result.langue ?? 'FR',
    current_question: presentQuestion(flux, currentQuestion),
    historique: result.historique && !Array.isArray(result.historique)
      ? result.historique
      : {
          steps: historySteps,
          metadata: result.metadata ?? {
            ...(result.contexte && { feedback: result.contexte }),
            ...(result.contexte_formation && !result.contexte && {
              feedback: { formation_intitule: result.contexte_formation },
            }),
          },
        },
    recommendations: result.recommendations ?? result.formations ?? [],
  };
}
