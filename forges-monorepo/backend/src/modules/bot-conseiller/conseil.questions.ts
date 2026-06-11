export const CONSEIL_MENU_OPTIONS = ['Abonnement', 'Employés', 'Vouchers', 'Paiements', 'Autre'];
export const CONSEIL_MOTIF_OPTIONS = ['Technique', 'Paiements', 'Employés', 'Vouchers', 'Autre'];
export const CONSEIL_CONFIRMATION_OPTIONS = ['ENVOYER', 'ANNULER'];

export const CONSEIL_QUESTIONS = [
  {
    id: 1,
    texte: 'De quoi avez-vous besoin ?',
    options: CONSEIL_MENU_OPTIONS,
    obligatoire: true,
  },
  {
    id: 2,
    texte: 'Quel est le motif de votre demande ?',
    options: CONSEIL_MOTIF_OPTIONS,
    obligatoire: true,
  },
  {
    id: 3,
    texte: `Vous pouvez ajouter un commentaire puis confirmer l'envoi.`,
    options: CONSEIL_CONFIRMATION_OPTIONS,
    allow_commentaire: true,
    commentaire_max_length: 500,
    obligatoire: true,
  },
];
