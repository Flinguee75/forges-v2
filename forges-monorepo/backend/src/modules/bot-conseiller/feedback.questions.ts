export const FEEDBACK_QUESTION_IDS = {
  NOTE_GLOBALE: 'feedback_note_globale',
  NOTE_CONTENU: 'feedback_note_contenu',
  NOTE_FORMATEUR: 'feedback_note_formateur',
  COMMENTAIRE: 'feedback_commentaire',
  RECOMMANDE: 'feedback_recommande',
} as const;

const COPY = {
  FR: {
    global: 'Quelle note globale donnez-vous à cette formation ?',
    content: 'Quelle note donnez-vous au contenu pédagogique ?',
    trainer: 'Quelle note donnez-vous au formateur ou à l’organisation ?',
    comment: 'Souhaitez-vous ajouter un commentaire ?',
    recommend: 'Recommanderiez-vous cette formation ?',
  },
  EN: {
    global: 'What overall rating would you give this training?',
    content: 'How would you rate the training content?',
    trainer: 'How would you rate the trainer or organization?',
    comment: 'Would you like to add a comment?',
    recommend: 'Would you recommend this training?',
  },
  ES: {
    global: 'Que puntuacion global daria a esta formacion?',
    content: 'Como calificaria el contenido de la formacion?',
    trainer: 'Como calificaria al formador o a la organizacion?',
    comment: 'Desea anadir un comentario?',
    recommend: 'Recomendaria esta formacion?',
  },
  PT: {
    global: 'Que avaliacao global daria a esta formacao?',
    content: 'Como avaliaria o conteudo da formacao?',
    trainer: 'Como avaliaria o formador ou a organizacao?',
    comment: 'Gostaria de adicionar um comentario?',
    recommend: 'Recomendaria esta formacao?',
  },
} as const;

function options(values: readonly string[]) {
  return values.map(value => ({ value, label: value }));
}

export function getFeedbackQuestions(langue = 'FR', modeFormation = 'AVEC_SESSION') {
  const copy = COPY[langue as keyof typeof COPY] || COPY.FR;
  const questions = [
    {
      id: FEEDBACK_QUESTION_IDS.NOTE_GLOBALE,
      question: copy.global,
      options: options(['1', '2', '3', '4', '5']),
      required: true,
      allow_commentaire: false,
      commentaire_max_length: null,
    },
    {
      id: FEEDBACK_QUESTION_IDS.NOTE_CONTENU,
      question: copy.content,
      options: options(['1', '2', '3', '4', '5', 'PASSER']),
      required: false,
      allow_commentaire: false,
      commentaire_max_length: null,
    },
    ...(modeFormation === 'AVEC_SESSION' ? [{
      id: FEEDBACK_QUESTION_IDS.NOTE_FORMATEUR,
      question: copy.trainer,
      options: options(['1', '2', '3', '4', '5', 'PASSER']),
      required: false,
      allow_commentaire: false,
      commentaire_max_length: null,
    }] : []),
    {
      id: FEEDBACK_QUESTION_IDS.COMMENTAIRE,
      question: copy.comment,
      options: options(['ENVOYER', 'PASSER']),
      required: false,
      allow_commentaire: true,
      commentaire_max_length: 500,
    },
    {
      id: FEEDBACK_QUESTION_IDS.RECOMMANDE,
      question: copy.recommend,
      options: options(['OUI', 'NON']),
      required: true,
      allow_commentaire: false,
      commentaire_max_length: null,
    },
  ];
  return questions;
}
