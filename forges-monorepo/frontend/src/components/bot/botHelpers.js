const SUPPORTED_BOT_LANGUAGES = ['FR', 'EN', 'ES', 'PT'];

const BOT_COPY = {
  FR: {
    title: 'Conseiller',
    trigger: 'Conseiller',
    openAriaLabel: 'Ouvrir le conseiller',
    closeLabel: 'Fermer le conseiller',
    statusStarting: 'Démarrage de la conversation',
    statusInProgress: 'Conversation en cours',
    statusCompleted: 'Conversation terminée',
    history: 'Historique',
    feedbackContext: 'Contexte du feedback',
    feedbackFormation: 'Formation',
    feedbackSession: 'Session',
    recommendations: 'Recommandations',
    recommendationUnitSingular: 'formation',
    recommendationUnitPlural: 'formations',
    recommendationIntro: 'Voici les formations que le conseiller a retenues pour vous.',
    estimatedCostLabel: 'Coût estimé',
    recommendedPalierLabel: 'Palier recommandé',
    loading: 'Chargement du conseiller...',
    unavailableTitle: 'Conseiller indisponible',
    retry: 'Réessayer',
    close: 'Fermer',
    newConversation: 'Nouvelle conversation',
    viewOffers: 'Voir les offres',
    invalidChoice: 'Choisissez une option proposée.',
    commentNotAllowed: 'Aucun commentaire n’est autorisé pour cette question.',
    commentTooLong: (maxLength) => `Le commentaire ne peut pas dépasser ${maxLength} caractères.`,
    commentPlaceholder: 'Votre commentaire...',
    noRecommendations: 'Aucune recommandation disponible pour le moment.',
    noActiveSession: 'Aucune session active',
    ratingLabelSingular: 'étoile',
    ratingLabelPlural: 'étoiles',
    formationIncluded: 'Inclus abonnement',
    formationPremium: 'Premium',
    formationStandard: 'Standard',
    freeLabel: 'Inclus',
    unknownFlux: 'Conseiller',
  },
  EN: {
    title: 'Advisor',
    trigger: 'Advisor',
    openAriaLabel: 'Open advisor',
    closeLabel: 'Close advisor',
    statusStarting: 'Starting the conversation',
    statusInProgress: 'Conversation in progress',
    statusCompleted: 'Conversation completed',
    history: 'History',
    feedbackContext: 'Feedback context',
    feedbackFormation: 'Training',
    feedbackSession: 'Session',
    recommendations: 'Recommendations',
    recommendationUnitSingular: 'training program',
    recommendationUnitPlural: 'training programs',
    recommendationIntro: 'Here are the training programs selected for you.',
    estimatedCostLabel: 'Estimated cost',
    recommendedPalierLabel: 'Recommended tier',
    loading: 'Loading advisor...',
    unavailableTitle: 'Advisor unavailable',
    retry: 'Retry',
    close: 'Close',
    newConversation: 'New conversation',
    viewOffers: 'View offers',
    invalidChoice: 'Choose one of the proposed options.',
    commentNotAllowed: 'Comments are not allowed for this question.',
    commentTooLong: (maxLength) => `The comment cannot exceed ${maxLength} characters.`,
    commentPlaceholder: 'Your comment...',
    noRecommendations: 'No recommendation available right now.',
    noActiveSession: 'No active session',
    ratingLabelSingular: 'star',
    ratingLabelPlural: 'stars',
    formationIncluded: 'Included in subscription',
    formationPremium: 'Premium',
    formationStandard: 'Standard',
    freeLabel: 'Included',
    unknownFlux: 'Advisor',
  },
  ES: {
    title: 'Asesor',
    trigger: 'Asesor',
    openAriaLabel: 'Abrir asesor',
    closeLabel: 'Cerrar asesor',
    statusStarting: 'Iniciando la conversacion',
    statusInProgress: 'Conversacion en curso',
    statusCompleted: 'Conversacion finalizada',
    history: 'Historial',
    feedbackContext: 'Contexto del feedback',
    feedbackFormation: 'Formacion',
    feedbackSession: 'Sesion',
    recommendations: 'Recomendaciones',
    recommendationUnitSingular: 'formacion',
    recommendationUnitPlural: 'formaciones',
    recommendationIntro: 'Estas son las formaciones seleccionadas para ti.',
    estimatedCostLabel: 'Costo estimado',
    recommendedPalierLabel: 'Palier recomendado',
    loading: 'Cargando asesor...',
    unavailableTitle: 'Asesor no disponible',
    retry: 'Reintentar',
    close: 'Cerrar',
    newConversation: 'Nueva conversacion',
    viewOffers: 'Ver ofertas',
    invalidChoice: 'Elige una de las opciones propuestas.',
    commentNotAllowed: 'No se permiten comentarios para esta pregunta.',
    commentTooLong: (maxLength) => `El comentario no puede superar ${maxLength} caracteres.`,
    commentPlaceholder: 'Tu comentario...',
    noRecommendations: 'No hay recomendaciones disponibles por ahora.',
    noActiveSession: 'No hay una sesion activa',
    ratingLabelSingular: 'estrella',
    ratingLabelPlural: 'estrellas',
    formationIncluded: 'Incluido en la suscripcion',
    formationPremium: 'Premium',
    formationStandard: 'Estandar',
    freeLabel: 'Incluido',
    unknownFlux: 'Asesor',
  },
  PT: {
    title: 'Assistente',
    trigger: 'Assistente',
    openAriaLabel: 'Abrir assistente',
    closeLabel: 'Fechar assistente',
    statusStarting: 'A iniciar a conversa',
    statusInProgress: 'Conversa em curso',
    statusCompleted: 'Conversa concluida',
    history: 'Historico',
    feedbackContext: 'Contexto do feedback',
    feedbackFormation: 'Formacao',
    feedbackSession: 'Sessao',
    recommendations: 'Recomendacoes',
    recommendationUnitSingular: 'formacao',
    recommendationUnitPlural: 'formacoes',
    recommendationIntro: 'Estas sao as formacoes selecionadas para si.',
    estimatedCostLabel: 'Custo estimado',
    recommendedPalierLabel: 'Escala recomendada',
    loading: 'A carregar assistente...',
    unavailableTitle: 'Assistente indisponivel',
    retry: 'Tentar novamente',
    close: 'Fechar',
    newConversation: 'Nova conversa',
    viewOffers: 'Ver ofertas',
    invalidChoice: 'Escolha uma das opcoes propostas.',
    commentNotAllowed: 'Nao sao permitidos comentarios para esta pergunta.',
    commentTooLong: (maxLength) => `O comentario nao pode exceder ${maxLength} caracteres.`,
    commentPlaceholder: 'O seu comentario...',
    noRecommendations: 'Sem recomendacoes disponiveis de momento.',
    noActiveSession: 'Nao ha sessao ativa',
    ratingLabelSingular: 'estrela',
    ratingLabelPlural: 'estrelas',
    formationIncluded: 'Incluido na subscricao',
    formationPremium: 'Premium',
    formationStandard: 'Padrao',
    freeLabel: 'Incluido',
    unknownFlux: 'Assistente',
  },
};

const FLUX_COPY = {
  COMPLETION_PROFIL: {
    label: {
      FR: 'Complétion de profil',
      EN: 'Profile completion',
      ES: 'Completar perfil',
      PT: 'Conclusao do perfil',
    },
    welcome: {
      FR: 'Bonjour, je vois que votre profil est incomplet. Je peux vous aider à le compléter.',
      EN: 'Hello, I can see your profile is incomplete. I can help you complete it.',
      ES: 'Hola, veo que tu perfil esta incompleto. Puedo ayudarte a completarlo.',
      PT: 'Ola, vejo que o seu perfil esta incompleto. Posso ajuda-lo a completa-lo.',
    },
    completion: {
      FR: 'Merci. Votre profil est maintenant à jour.',
      EN: 'Thank you. Your profile is now up to date.',
      ES: 'Gracias. Tu perfil ya esta actualizado.',
      PT: 'Obrigado. O seu perfil ficou atualizado.',
    },
  },
  UPGRADE: {
    label: {
      FR: 'Montée en gamme',
      EN: 'Upgrade',
      ES: 'Mejora',
      PT: 'Atualizacao',
    },
    welcome: {
      FR: 'Bonjour, une offre plus adaptée est disponible. Je peux vous la présenter.',
      EN: 'Hello, a more suitable offer is available. I can show it to you.',
      ES: 'Hola, hay una oferta mas adecuada disponible. Puedo mostrartela.',
      PT: 'Ola, ha uma oferta mais adequada disponivel. Posso apresenta-la.',
    },
    completion: {
      FR: 'Merci pour votre intérêt. Vous pouvez rouvrir le conseiller quand vous le souhaitez.',
      EN: 'Thank you for your interest. You can reopen the advisor whenever you want.',
      ES: 'Gracias por tu interes. Puedes volver a abrir el asesor cuando quieras.',
      PT: 'Obrigado pelo seu interesse. Pode reabrir o assistente quando quiser.',
    },
  },
  ORIENTATION: {
    label: {
      FR: 'Orientation',
      EN: 'Orientation',
      ES: 'Orientacion',
      PT: 'Orientacao',
    },
    welcome: {
      FR: 'Bonjour, je peux vous aider à trouver une formation adaptée à votre besoin.',
      EN: 'Hello, I can help you find a training program that fits your needs.',
      ES: 'Hola, puedo ayudarte a encontrar una formacion adaptada a tu necesidad.',
      PT: 'Ola, posso ajuda-lo a encontrar uma formacao adequada ao seu objetivo.',
    },
    completion: {
      FR: 'Merci. La recommandation a bien été prise en compte.',
      EN: 'Thank you. The recommendation has been recorded.',
      ES: 'Gracias. La recomendacion ha sido registrada.',
      PT: 'Obrigado. A recomendacao foi registada.',
    },
  },
  FEEDBACK: {
    label: {
      FR: 'Feedback',
      EN: 'Feedback',
      ES: 'Comentarios',
      PT: 'Feedback',
    },
    welcome: {
      FR: 'Bonjour, votre retour nous aide à améliorer les formations.',
      EN: 'Hello, your feedback helps us improve the training programs.',
      ES: 'Hola, tu opinion nos ayuda a mejorar las formaciones.',
      PT: 'Ola, o seu feedback ajuda-nos a melhorar as formacoes.',
    },
    completion: {
      FR: 'Merci pour votre retour. Il a bien été enregistré.',
      EN: 'Thank you for your feedback. It has been recorded.',
      ES: 'Gracias por tu opinion. Ha sido registrada.',
      PT: 'Obrigado pelo seu feedback. Foi registado.',
    },
  },
  ENQUETE: {
    label: {
      FR: 'Enquête',
      EN: 'Survey',
      ES: 'Encuesta',
      PT: 'Inquerito',
    },
    welcome: {
      FR: 'Bonjour, je peux préciser votre besoin pour orienter la recherche.',
      EN: 'Hello, I can narrow down your needs to guide the search.',
      ES: 'Hola, puedo precisar tu necesidad para orientar la busqueda.',
      PT: 'Ola, posso afinar a sua necessidade para orientar a pesquisa.',
    },
    completion: {
      FR: 'Merci. Votre demande a bien été enregistrée.',
      EN: 'Thank you. Your request has been recorded.',
      ES: 'Gracias. Tu solicitud ha sido registrada.',
      PT: 'Obrigado. O seu pedido foi registado.',
    },
  },
  IDLE: {
    label: {
      FR: 'Conseil',
      EN: 'Advice',
      ES: 'Asesoramiento',
      PT: 'Conselho',
    },
    welcome: {
      FR: 'Bonjour, comment puis-je vous aider ?',
      EN: 'Hello, how can I help you?',
      ES: 'Hola, como puedo ayudarte?',
      PT: 'Ola, como posso ajuda-lo?',
    },
    completion: {
      FR: 'Merci. À bientôt.',
      EN: 'Thank you. See you soon.',
      ES: 'Gracias. Hasta pronto.',
      PT: 'Obrigado. Ate breve.',
    },
  },
};

const QUESTION_LIBRARY = {
  completion_action: {
    question: {
      FR: 'Votre profil semble incomplet. Souhaitez-vous le compléter maintenant ?',
      EN: 'Your profile seems incomplete. Would you like to complete it now?',
      ES: 'Tu perfil parece incompleto. Quieres completarlo ahora?',
      PT: 'O seu perfil parece incompleto. Quer completa-lo agora?',
    },
    options: {
      METTRE_A_JOUR: {
        FR: 'Mettre à jour mon profil',
        EN: 'Update my profile',
        ES: 'Actualizar mi perfil',
        PT: 'Atualizar o meu perfil',
      },
      PLUS_TARD: {
        FR: 'Plus tard',
        EN: 'Later',
        ES: 'Mas tarde',
        PT: 'Mais tarde',
      },
    },
  },
  upgrade_offer: {
    question: {
      FR: 'Une offre plus adaptée est disponible. Souhaitez-vous la consulter ?',
      EN: 'A more suitable offer is available. Would you like to view it?',
      ES: 'Hay una oferta mas adecuada disponible. Quieres verla?',
      PT: 'Ha uma oferta mais adequada disponivel. Quer ve-la?',
    },
    options: {
      VOIR_OFFRES: {
        FR: 'Voir les offres',
        EN: 'View offers',
        ES: 'Ver ofertas',
        PT: 'Ver ofertas',
      },
      PLUS_TARD: {
        FR: 'Plus tard',
        EN: 'Later',
        ES: 'Mas tarde',
        PT: 'Mais tarde',
      },
    },
  },
  note_globale: {
    question: {
      FR: 'Quelle note globale donnez-vous à votre expérience ?',
      EN: 'What overall rating would you give your experience?',
      ES: 'Que puntuacion global le das a tu experiencia?',
      PT: 'Que nota global daria a sua experiencia?',
    },
    options: {
      1: { FR: '1', EN: '1', ES: '1', PT: '1' },
      2: { FR: '2', EN: '2', ES: '2', PT: '2' },
      3: { FR: '3', EN: '3', ES: '3', PT: '3' },
      4: { FR: '4', EN: '4', ES: '4', PT: '4' },
      5: { FR: '5', EN: '5', ES: '5', PT: '5' },
    },
  },
  qualite_contenu: {
    question: {
      FR: 'Comment évaluez-vous la qualité du contenu ?',
      EN: 'How would you rate the quality of the content?',
      ES: 'Como evaluas la calidad del contenido?',
      PT: 'Como avalia a qualidade do conteudo?',
    },
    options: {
      1: { FR: '1', EN: '1', ES: '1', PT: '1' },
      2: { FR: '2', EN: '2', ES: '2', PT: '2' },
      3: { FR: '3', EN: '3', ES: '3', PT: '3' },
      4: { FR: '4', EN: '4', ES: '4', PT: '4' },
      5: { FR: '5', EN: '5', ES: '5', PT: '5' },
    },
  },
  qualite_animation: {
    question: {
      FR: 'Comment évaluez-vous la qualité de l’animation ?',
      EN: 'How would you rate the quality of the facilitation?',
      ES: 'Como evaluas la calidad de la dinamizacion?',
      PT: 'Como avalia a qualidade da dinamizacao?',
    },
    options: {
      1: { FR: '1', EN: '1', ES: '1', PT: '1' },
      2: { FR: '2', EN: '2', ES: '2', PT: '2' },
      3: { FR: '3', EN: '3', ES: '3', PT: '3' },
      4: { FR: '4', EN: '4', ES: '4', PT: '4' },
      5: { FR: '5', EN: '5', ES: '5', PT: '5' },
    },
  },
  utilite_professionnelle: {
    question: {
      FR: 'Dans quelle mesure cette formation vous sera utile ?',
      EN: 'How useful will this training be for you?',
      ES: 'En que medida esta formacion te sera util?',
      PT: 'Em que medida esta formacao lhe sera util?',
    },
    options: {
      1: { FR: '1', EN: '1', ES: '1', PT: '1' },
      2: { FR: '2', EN: '2', ES: '2', PT: '2' },
      3: { FR: '3', EN: '3', ES: '3', PT: '3' },
      4: { FR: '4', EN: '4', ES: '4', PT: '4' },
      5: { FR: '5', EN: '5', ES: '5', PT: '5' },
    },
  },
  recommandation: {
    question: {
      FR: 'Recommanderiez-vous cette formation à un collègue ?',
      EN: 'Would you recommend this training to a colleague?',
      ES: 'Recomendarias esta formacion a un colega?',
      PT: 'Recomendaria esta formacao a um colega?',
    },
    options: {
      OUI: { FR: 'Oui', EN: 'Yes', ES: 'Si', PT: 'Sim' },
      NON: { FR: 'Non', EN: 'No', ES: 'No', PT: 'Nao' },
    },
  },
  commentaire_souhait: {
    question: {
      FR: 'Souhaitez-vous ajouter un commentaire libre ?',
      EN: 'Would you like to add a free-form comment?',
      ES: 'Quieres anadir un comentario libre?',
      PT: 'Deseja adicionar um comentario livre?',
    },
    options: {
      AJOUTER_COMMENTAIRE: {
        FR: 'Ajouter un commentaire',
        EN: 'Add a comment',
        ES: 'Anadir un comentario',
        PT: 'Adicionar um comentario',
      },
      PASSER: {
        FR: 'Passer',
        EN: 'Skip',
        ES: 'Saltar',
        PT: 'Ignorar',
      },
    },
  },
  commentaire_feedback: {
    question: {
      FR: 'Vous pouvez ajouter un commentaire optionnel puis confirmer son envoi.',
      EN: 'You can add an optional comment and then confirm sending it.',
      ES: 'Puedes anadir un comentario opcional y luego confirmar el envio.',
      PT: 'Pode adicionar um comentario opcional e depois confirmar o envio.',
    },
    options: {
      ENVOYER: {
        FR: 'Envoyer le commentaire',
        EN: 'Send the comment',
        ES: 'Enviar el comentario',
        PT: 'Enviar o comentario',
      },
      PASSER: {
        FR: 'Passer',
        EN: 'Skip',
        ES: 'Saltar',
        PT: 'Ignorar',
      },
    },
    allow_commentaire: true,
    commentaire_max_length: 500,
  },
  enquete_domaine: {
    question: {
      FR: 'Dans quel domaine cherchez-vous une formation ?',
      EN: 'Which field are you looking for training in?',
      ES: 'En que area buscas una formacion?',
      PT: 'Em que area procura formacao?',
    },
    options: {
      IT: { FR: 'IT', EN: 'IT', ES: 'IT', PT: 'IT' },
      FINANCE: { FR: 'Finance', EN: 'Finance', ES: 'Finanzas', PT: 'Financas' },
      SANTE: { FR: 'Santé', EN: 'Health', ES: 'Salud', PT: 'Saude' },
      DROIT: { FR: 'Droit', EN: 'Law', ES: 'Derecho', PT: 'Direito' },
      MANAGEMENT: { FR: 'Management', EN: 'Management', ES: 'Gestion', PT: 'Gestao' },
      IA: { FR: 'IA', EN: 'AI', ES: 'IA', PT: 'IA' },
      CYBERSECURITE: { FR: 'Cybersécurité', EN: 'Cybersecurity', ES: 'Ciberseguridad', PT: 'Ciberseguranca' },
      AUTRE: { FR: 'Autre', EN: 'Other', ES: 'Otro', PT: 'Outro' },
    },
  },
  enquete_niveau: {
    question: {
      FR: 'Quel niveau ciblez-vous ?',
      EN: 'Which level are you targeting?',
      ES: 'Que nivel buscas?',
      PT: 'Que nivel pretende?',
    },
    options: {
      DEBUTANT: { FR: 'Débutant', EN: 'Beginner', ES: 'Principiante', PT: 'Iniciante' },
      INTERMEDIAIRE: { FR: 'Intermédiaire', EN: 'Intermediate', ES: 'Intermedio', PT: 'Intermedio' },
      AVANCE: { FR: 'Avancé', EN: 'Advanced', ES: 'Avanzado', PT: 'Avancado' },
      EXPERT: { FR: 'Expert', EN: 'Expert', ES: 'Experto', PT: 'Especialista' },
    },
  },
  enquete_volume: {
    question: {
      FR: 'Quel volume de besoin estimez-vous ?',
      EN: 'What volume of need do you estimate?',
      ES: 'Que volumen de necesidad estimas?',
      PT: 'Que volume de necessidade estima?',
    },
    options: {
      '1_5': { FR: '1 à 5 personnes', EN: '1 to 5 people', ES: '1 a 5 personas', PT: '1 a 5 pessoas' },
      '6_20': { FR: '6 à 20 personnes', EN: '6 to 20 people', ES: '6 a 20 personas', PT: '6 a 20 pessoas' },
      '21_50': { FR: '21 à 50 personnes', EN: '21 to 50 people', ES: '21 a 50 personas', PT: '21 a 50 pessoas' },
      '51_PLUS': { FR: '51 personnes et plus', EN: '51 people and above', ES: '51 personas o mas', PT: '51 pessoas ou mais' },
    },
  },
  orientation_objectif: {
    question: {
      FR: 'Quel est votre objectif principal ?',
      EN: 'What is your main objective?',
      ES: 'Cual es tu objetivo principal?',
      PT: 'Qual e o seu principal objetivo?',
    },
    options: {
      MONTER_COMPETENCES: {
        FR: 'Monter en compétences',
        EN: 'Build new skills',
        ES: 'Desarrollar nuevas competencias',
        PT: 'Desenvolver novas competencias',
      },
      OBTENIR_CERTIFICATION: {
        FR: 'Préparer une certification',
        EN: 'Prepare for a certification',
        ES: 'Preparar una certificacion',
        PT: 'Preparar uma certificacao',
      },
      DECOUVRIR_PREMIUM: {
        FR: 'Explorer les parcours Premium',
        EN: 'Explore Premium tracks',
        ES: 'Explorar los recorridos Premium',
        PT: 'Explorar os percursos Premium',
      },
    },
  },
  orientation_secteur: {
    question: {
      FR: 'Dans quel secteur souhaitez-vous vous former ?',
      EN: 'Which sector would you like to train in?',
      ES: 'En que sector quieres formarte?',
      PT: 'Em que setor pretende formar-se?',
    },
    options: {
      IT: { FR: 'IT', EN: 'IT', ES: 'IT', PT: 'IT' },
      FINANCE: { FR: 'Finance', EN: 'Finance', ES: 'Finanzas', PT: 'Financas' },
      SANTE: { FR: 'Santé', EN: 'Health', ES: 'Salud', PT: 'Saude' },
      DROIT: { FR: 'Droit', EN: 'Law', ES: 'Derecho', PT: 'Direito' },
      MANAGEMENT: { FR: 'Management', EN: 'Management', ES: 'Gestion', PT: 'Gestao' },
      IA: { FR: 'IA', EN: 'AI', ES: 'IA', PT: 'IA' },
      CYBERSECURITE: { FR: 'Cybersécurité', EN: 'Cybersecurity', ES: 'Ciberseguridad', PT: 'Ciberseguranca' },
      AUTRE: { FR: 'Autre', EN: 'Other', ES: 'Otro', PT: 'Outro' },
    },
  },
  orientation_niveau: {
    question: {
      FR: 'Quel niveau recherchez-vous ?',
      EN: 'Which level are you looking for?',
      ES: 'Que nivel buscas?',
      PT: 'Que nivel procura?',
    },
    options: {
      DEBUTANT: { FR: 'Débutant', EN: 'Beginner', ES: 'Principiante', PT: 'Iniciante' },
      INTERMEDIAIRE: { FR: 'Intermédiaire', EN: 'Intermediate', ES: 'Intermedio', PT: 'Intermedio' },
      AVANCE: { FR: 'Avancé', EN: 'Advanced', ES: 'Avanzado', PT: 'Avancado' },
      EXPERT: { FR: 'Expert', EN: 'Expert', ES: 'Experto', PT: 'Especialista' },
    },
  },
  organisation_orientation_secteur: {
    question: {
      FR: 'Dans quel secteur se situe le besoin de vos équipes ?',
      EN: 'Which sector best matches your teams’ needs?',
      ES: 'En que sector se situa la necesidad de tus equipos?',
      PT: 'Em que setor se situa a necessidade das suas equipas?',
    },
    options: {
      IT: { FR: 'IT', EN: 'IT', ES: 'IT', PT: 'IT' },
      FINANCE: { FR: 'Finance', EN: 'Finance', ES: 'Finanzas', PT: 'Financas' },
      SANTE: { FR: 'Santé', EN: 'Health', ES: 'Salud', PT: 'Saude' },
      DROIT: { FR: 'Droit', EN: 'Law', ES: 'Derecho', PT: 'Direito' },
      MANAGEMENT: { FR: 'Management', EN: 'Management', ES: 'Gestion', PT: 'Gestao' },
      IA: { FR: 'IA', EN: 'AI', ES: 'IA', PT: 'IA' },
      CYBERSECURITE: { FR: 'Cybersécurité', EN: 'Cybersecurity', ES: 'Ciberseguridad', PT: 'Ciberseguranca' },
      AUTRE: { FR: 'Autre', EN: 'Other', ES: 'Otro', PT: 'Outro' },
    },
  },
  organisation_orientation_niveau: {
    question: {
      FR: 'Quel niveau ciblez-vous pour vos équipes ?',
      EN: 'Which level are you targeting for your teams?',
      ES: 'Que nivel buscas para tus equipos?',
      PT: 'Que nivel pretende para as suas equipas?',
    },
    options: {
      DEBUTANT: { FR: 'Débutant', EN: 'Beginner', ES: 'Principiante', PT: 'Iniciante' },
      INTERMEDIAIRE: { FR: 'Intermédiaire', EN: 'Intermediate', ES: 'Intermedio', PT: 'Intermedio' },
      AVANCE: { FR: 'Avancé', EN: 'Advanced', ES: 'Avanzado', PT: 'Avancado' },
      EXPERT: { FR: 'Expert', EN: 'Expert', ES: 'Experto', PT: 'Especialista' },
    },
  },
  organisation_orientation_volume: {
    question: {
      FR: 'Quel volume de collaborateurs souhaitez-vous former ?',
      EN: 'How many collaborators do you want to train?',
      ES: 'Que volumen de colaboradores quieres formar?',
      PT: 'Que volume de colaboradores pretende formar?',
    },
    options: {
      '1_5': { FR: '1 à 5 personnes', EN: '1 to 5 people', ES: '1 a 5 personas', PT: '1 a 5 pessoas' },
      '6_20': { FR: '6 à 20 personnes', EN: '6 to 20 people', ES: '6 a 20 personas', PT: '6 a 20 pessoas' },
      '21_50': { FR: '21 à 50 personnes', EN: '21 to 50 people', ES: '21 a 50 personas', PT: '21 a 50 pessoas' },
      '51_PLUS': { FR: '51 personnes et plus', EN: '51 people and above', ES: '51 personas o mas', PT: '51 pessoas ou mais' },
    },
  },
  orientation_actions: {
    question: {
      FR: 'Voici les recommandations disponibles selon votre profil. Souhaitez-vous poursuivre ?',
      EN: 'Here are the recommendations available for your profile. Would you like to continue?',
      ES: 'Estas son las recomendaciones disponibles segun tu perfil. Quieres continuar?',
      PT: 'Estas sao as recomendacoes disponiveis para o seu perfil. Deseja continuar?',
    },
    options: {
      VOIR_CATALOGUE: {
        FR: 'Voir le catalogue',
        EN: 'View the catalog',
        ES: 'Ver el catalogo',
        PT: 'Ver o catalogo',
      },
      AUCUNE_NE_CONVIENT: {
        FR: 'Aucune ne convient',
        EN: 'None fit my needs',
        ES: 'Ninguna encaja',
        PT: 'Nenhuma corresponde',
      },
      PLUS_TARD: {
        FR: 'Plus tard',
        EN: 'Later',
        ES: 'Mas tarde',
        PT: 'Mais tarde',
      },
    },
  },
};

function normalizeLanguageCode(language) {
  if (!language || typeof language !== 'string') {
    return null;
  }

  const candidate = language.trim().toUpperCase().split(/[-_]/)[0];
  return SUPPORTED_BOT_LANGUAGES.includes(candidate) ? candidate : null;
}

export function resolveBotLanguage(language, { allowBrowserFallback = false } = {}) {
  const normalized = normalizeLanguageCode(language);
  if (normalized) {
    return normalized;
  }

  if (allowBrowserFallback && typeof navigator !== 'undefined') {
    const browserLanguage = normalizeLanguageCode(
      navigator.language || navigator.languages?.[0] || ''
    );
    if (browserLanguage) {
      return browserLanguage;
    }
  }

  return 'FR';
}

export function getBotCopy(language) {
  return BOT_COPY[resolveBotLanguage(language)] || BOT_COPY.FR;
}

export function buildBotValidationError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 400;
  return error;
}

export function formatFcfa(amountInCentimes) {
  const normalizedAmount = Number(amountInCentimes || 0);
  return `${Math.round(normalizedAmount / 100).toLocaleString('fr-FR')} FCFA`;
}

function resolveLocalizedValue(value, language) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return typeof value === 'string' ? value : null;
  }

  const normalizedLanguage = resolveBotLanguage(language);
  const lower = normalizedLanguage.toLowerCase();

  const direct = value[normalizedLanguage]
    ?? value[lower]
    ?? value[normalizedLanguage.toUpperCase()]
    ?? value.default;

  if (typeof direct === 'string') {
    return direct;
  }

  if (direct && typeof direct === 'object') {
    return direct.question
      || direct.label
      || direct.text
      || direct.value
      || null;
  }

  const fallback = value.question
    || value.label
    || value.text
    || value.value;

  if (typeof fallback === 'string') {
    return fallback;
  }

  for (const code of SUPPORTED_BOT_LANGUAGES) {
    if (typeof value[code] === 'string') {
      return value[code];
    }

    if (value[code] && typeof value[code] === 'object') {
      const nested = value[code].question
        || value[code].label
        || value[code].text
        || value[code].value;
      if (typeof nested === 'string') {
        return nested;
      }
    }
  }

  return null;
}

const QUESTION_LIBRARY_ALIASES = {
  feedback_note_globale: 'note_globale',
  feedback_note_contenu: 'qualite_contenu',
  feedback_note_formateur: 'qualite_animation',
  feedback_commentaire: 'commentaire_feedback',
  feedback_recommande: 'recommandation',
};

function getQuestionFromLibrary(questionId, language) {
  const libraryId = QUESTION_LIBRARY_ALIASES[questionId] || questionId;
  const entry = QUESTION_LIBRARY[libraryId];
  if (!entry) {
    return null;
  }

  const normalizedLanguage = resolveBotLanguage(language);

  return {
    id: questionId,
    question: resolveLocalizedValue(entry.question, normalizedLanguage),
    options: Object.entries(entry.options || {}).map(([value, label]) => ({
      value,
      label: resolveLocalizedValue(label, normalizedLanguage) || value,
    })),
    allow_commentaire: Boolean(entry.allow_commentaire),
    commentaire_max_length: entry.commentaire_max_length || null,
  };
}

function normalizeQuestionOptions(options, language, questionId) {
  const normalizedLanguage = resolveBotLanguage(language);

  if (Array.isArray(options)) {
    return options
      .filter(Boolean)
      .map((option) => {
        const value = option.value ?? option.id ?? option.code ?? option.key ?? option.label ?? option;
        const libraryLabel = getQuestionFromLibrary(questionId, normalizedLanguage)?.options
          ?.find((item) => item.value === value)?.label;
        const payloadLabel =
          resolveLocalizedValue(option.label, normalizedLanguage)
          || resolveLocalizedValue(option.libelle, normalizedLanguage)
          || resolveLocalizedValue(option.text, normalizedLanguage);

        return {
          ...option,
          value: String(value),
          label:
            ((normalizedLanguage !== 'FR' && libraryLabel) ? libraryLabel : null)
            || payloadLabel
            || libraryLabel
            || String(value),
        };
      });
  }

  if (options && typeof options === 'object') {
    return Object.entries(options).map(([value, label]) => ({
      value: String(value),
      label:
        ((normalizedLanguage !== 'FR')
          ? getQuestionFromLibrary(questionId, normalizedLanguage)?.options?.find((item) => item.value === String(value))?.label
          : null)
        || resolveLocalizedValue(label, normalizedLanguage)
        || getQuestionFromLibrary(questionId, normalizedLanguage)?.options?.find((item) => item.value === String(value))?.label
        || String(label),
    }));
  }

  return [];
}

function normalizeQuestion(question, language) {
  if (!question || typeof question !== 'object') {
    return null;
  }

  const normalizedLanguage = resolveBotLanguage(language);
  const questionId = question.id || question.question_id || question.key || null;
  const libraryQuestion = questionId ? getQuestionFromLibrary(questionId, normalizedLanguage) : null;
  const payloadQuestion =
    resolveLocalizedValue(question.question, normalizedLanguage)
    || resolveLocalizedValue(question.title, normalizedLanguage)
    || resolveLocalizedValue(question.label, normalizedLanguage);
  const normalizedOptions = normalizeQuestionOptions(
    question.options || question.question_options || libraryQuestion?.options || [],
    normalizedLanguage,
    questionId
  );

  return {
    ...question,
    id: questionId,
    question:
      ((normalizedLanguage !== 'FR' && libraryQuestion?.question) ? libraryQuestion.question : null)
      || payloadQuestion
      || libraryQuestion?.question
      || question.question
      || questionId
      || 'Question',
    options: normalizedOptions,
    allow_commentaire: Boolean(
      question.allow_commentaire
      ?? question.allowCommentaire
      ?? libraryQuestion?.allow_commentaire
      ?? false
    ),
    commentaire_max_length:
      question.commentaire_max_length
      ?? question.commentaireMaxLength
      ?? libraryQuestion?.commentaire_max_length
      ?? null,
    recommendations: Array.isArray(question.recommendations) ? question.recommendations : undefined,
  };
}

function resolveStepValue(step) {
  return step?.value
    ?? step?.valeur
    ?? step?.answer
    ?? step?.response
    ?? step?.reponse
    ?? step?.answerValue
    ?? step?.answer_value
    ?? null;
}

function normalizeHistoryStep(step, language, questionMap) {
  if (!step || typeof step !== 'object') {
    return null;
  }

  const questionId = step.question_id || step.questionId || null;
  const questionDefinition = (questionId && questionMap.get(questionId)) || getQuestionFromLibrary(questionId, language);
  const normalizedLanguage = resolveBotLanguage(language);
  const resolvedValue = resolveStepValue(step);
  const answerLabel =
    ((normalizedLanguage !== 'FR' && questionDefinition)
      ? getQuestionOptionLabel(questionDefinition, resolvedValue, normalizedLanguage)
      : null)
    || step.answer_label
    || step.answerLabel
    || getQuestionOptionLabel(questionDefinition, resolvedValue, normalizedLanguage)
    || resolvedValue
    || 'Réponse';

  return {
    ...step,
    question_id: questionId,
    value: resolvedValue,
    question:
      ((normalizedLanguage !== 'FR' && questionDefinition?.question) ? questionDefinition.question : null)
      || resolveLocalizedValue(step.question, normalizedLanguage)
      || questionDefinition?.question
      || questionId
      || 'Question',
    question_options: Array.isArray(step.question_options)
      ? step.question_options
      : Array.isArray(questionDefinition?.options)
        ? questionDefinition.options
        : [],
    answer_label: answerLabel,
    commentaire: step.commentaire || step.comment || '',
    answered_at: step.answered_at || step.answeredAt || null,
  };
}

export function normalizeBotSession(session, language = 'FR') {
  if (!session || typeof session !== 'object') {
    return null;
  }
  if (session.data && typeof session.data === 'object') {
    return normalizeBotSession(session.data, language);
  }

  const normalizedLanguage = resolveBotLanguage(language);
  const historique = session.historique && typeof session.historique === 'object'
    ? session.historique
    : {};
  const questions = Array.isArray(historique.questions)
    ? historique.questions.map((question) => normalizeQuestion(question, normalizedLanguage)).filter(Boolean)
    : [];
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const steps = Array.isArray(historique.steps)
    ? historique.steps.map((step) => normalizeHistoryStep(step, normalizedLanguage, questionMap)).filter(Boolean)
    : [];
  const timelineSource = Array.isArray(historique.timeline) && historique.timeline.length > 0
    ? historique.timeline
    : steps;
  const timeline = timelineSource
    .map((step) => normalizeHistoryStep(step, normalizedLanguage, questionMap))
    .filter(Boolean);

  return {
    ...session,
    current_question: normalizeQuestion(session.current_question, normalizedLanguage),
    recommendations: Array.isArray(session.recommendations) ? session.recommendations : [],
    historique: {
      current_question_id: historique.current_question_id || null,
      answers: historique.answers || {},
      steps,
      timeline,
      questions,
      metadata: historique.metadata && typeof historique.metadata === 'object' ? historique.metadata : {},
      result: historique.result || null,
    },
  };
}

export function getFluxLabel(flux, language = 'FR') {
  const normalizedLanguage = resolveBotLanguage(language);
  const localizedLabel = FLUX_COPY[flux]?.label?.[normalizedLanguage];
  if (localizedLabel) {
    return localizedLabel;
  }

  if (flux && typeof flux === 'string') {
    const normalized = flux.replace(/_/g, ' ').toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return getBotCopy(normalizedLanguage).unknownFlux;
}

export function getFluxWelcomeMessage(flux, language = 'FR') {
  const normalizedLanguage = resolveBotLanguage(language);
  return FLUX_COPY[flux]?.welcome?.[normalizedLanguage]
    || FLUX_COPY.IDLE.welcome[normalizedLanguage]
    || getBotCopy(normalizedLanguage).statusStarting;
}

export function getFluxCompletionMessage(flux, language = 'FR') {
  const normalizedLanguage = resolveBotLanguage(language);
  return FLUX_COPY[flux]?.completion?.[normalizedLanguage]
    || FLUX_COPY.IDLE.completion[normalizedLanguage]
    || getBotCopy(normalizedLanguage).statusCompleted;
}

export function getQuestionDefinition(questionId, language = 'FR') {
  return getQuestionFromLibrary(questionId, language);
}

export function resolveQuestionLabel(question, language = 'FR') {
  if (!question || typeof question !== 'object') {
    return 'Question';
  }

  const normalizedLanguage = resolveBotLanguage(language);
  const libraryQuestion = question.id ? getQuestionFromLibrary(question.id, normalizedLanguage) : null;

  return resolveLocalizedValue(question.question, normalizedLanguage)
    || resolveLocalizedValue(question.title, normalizedLanguage)
    || resolveLocalizedValue(question.label, normalizedLanguage)
    || question.question
    || question.title
    || question.label
    || libraryQuestion?.question
    || question.id
    || 'Question';
}

export function getQuestionOptionLabel(question, value, language = 'FR') {
  if (value === null || typeof value === 'undefined') {
    return 'Réponse';
  }

  const normalizedLanguage = resolveBotLanguage(language);
  const options = Array.isArray(question?.options)
    ? question.options
    : normalizeQuestionOptions(question?.options, normalizedLanguage, question?.id);
  const stringValue = String(value);
  const option = options.find((item) => String(item.value) === stringValue);

  if (option?.label) {
    return option.label;
  }

  const libraryQuestion = question?.id ? getQuestionFromLibrary(question.id, normalizedLanguage) : null;
  const libraryOption = libraryQuestion?.options?.find((item) => String(item.value) === stringValue);
  if (libraryOption?.label) {
    return libraryOption.label;
  }

  return stringValue;
}

export function isAllowedBotValue(question, value) {
  const options = Array.isArray(question?.options) ? question.options : [];
  return options.some((option) => String(option.value) === String(value));
}

export function getQuestionCommentLength(question) {
  return question?.commentaire_max_length || 500;
}

export function canUseQuestionComment(question) {
  return Boolean(question?.allow_commentaire);
}

export function getSessionRecommendations(session) {
  return session?.recommendations
    || session?.current_question?.recommendations
    || session?.historique?.result?.recommendations
    || session?.historique?.metadata?.orientation?.recommendations
    || [];
}

export function getConversationHistoryEntries(session, language = 'FR') {
  const normalizedLanguage = resolveBotLanguage(language);
  const questionMap = new Map(
    (Array.isArray(session?.historique?.questions) ? session.historique.questions : [])
      .map((question) => normalizeQuestion(question, normalizedLanguage))
      .filter(Boolean)
      .map((question) => [question.id, question])
  );

  const timeline = Array.isArray(session?.historique?.timeline) ? session.historique.timeline : [];

  if (timeline.length > 0) {
    return timeline.map((step, index) => {
      const questionId = step.question_id || step.questionId || null;
      const questionDefinition = (questionId && questionMap.get(questionId)) || getQuestionFromLibrary(questionId, normalizedLanguage);
      const resolvedValue = resolveStepValue(step);

      return {
        id: `${questionId || 'timeline'}-${step.answered_at || step.answeredAt || index}`,
        questionId,
        questionLabel: ((normalizedLanguage !== 'FR' && questionDefinition?.question) ? questionDefinition.question : null)
          || resolveLocalizedValue(step.question, normalizedLanguage)
          || questionDefinition?.question
          || questionId
          || `Question ${index + 1}`,
        answerLabel: ((normalizedLanguage !== 'FR' && questionDefinition)
          ? getQuestionOptionLabel(questionDefinition, resolvedValue, normalizedLanguage)
          : null)
          || step.answer_label
          || step.answerLabel
          || getQuestionOptionLabel(questionDefinition, resolvedValue, normalizedLanguage),
        commentaire: step.commentaire || step.comment || '',
        answeredAt: step.answered_at || step.answeredAt || null,
      };
    });
  }

  const steps = Array.isArray(session?.historique?.steps) ? session.historique.steps : [];

  return steps.map((step, index) => {
    const questionId = step.question_id || step.questionId || null;
    const questionDefinition = (questionId && questionMap.get(questionId)) || getQuestionFromLibrary(questionId, normalizedLanguage);
    const resolvedValue = resolveStepValue(step);
    const questionLabel = ((normalizedLanguage !== 'FR' && questionDefinition?.question) ? questionDefinition.question : null)
      || resolveLocalizedValue(step.question, normalizedLanguage)
      || questionDefinition?.question
      || questionId
      || `Question ${index + 1}`;
    const answerLabel = ((normalizedLanguage !== 'FR' && questionDefinition)
      ? getQuestionOptionLabel(questionDefinition, resolvedValue, normalizedLanguage)
      : null)
      || step.answer_label
      || step.answerLabel
      || getQuestionOptionLabel(questionDefinition, resolvedValue, normalizedLanguage);

    return {
      id: `${questionId || 'step'}-${step.answered_at || step.answeredAt || index}`,
      questionId,
      questionLabel,
      answerLabel,
      commentaire: step.commentaire || step.comment || '',
      answeredAt: step.answered_at || step.answeredAt || null,
    };
  });
}
