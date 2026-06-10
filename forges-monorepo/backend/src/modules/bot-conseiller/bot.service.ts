import { BotRepository } from './bot.repository';
import { BotEngineService, determinerFluxPrioritaire, OPTIONS_BOT } from './bot-engine.service';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { FEEDBACK_QUESTION_IDS, getFeedbackQuestions } from './feedback.questions';
import { FeedbackEligibilityService, FeedbackTarget } from './feedback-eligibility.service';

const COOLDOWN_UPGRADE_JOURS = 7;   // RM-120
const COOLDOWN_3_REFUS_JOURS = 30;  // RM-120

export class BotService {
  constructor(
    private readonly botRepo: BotRepository,
    private readonly engine: BotEngineService,
    private readonly audit: AuditLogger,
    private readonly feedbackEligibility?: FeedbackEligibilityService,
  ) {}

  // Récupérer la session active de l'utilisateur
  async getSessionActive(utilisateur_id: string) {
    const session = await this.botRepo.findSessionActive(utilisateur_id);
    return session;
  }

  async getSessionById(session_id: string, utilisateur_id: string) {
    const session = await this.botRepo.findSession(session_id);
    if (!session || session.utilisateur_id !== utilisateur_id) {
      throw new Error('SESSION_INVALIDE');
    }
    return session;
  }

  // UCS15 — Démarrer session bot Apprenant (RM-115, RM-116)
  async demarrerSessionApprenant(apprenant_id: string, langue: string) {
    // RM-125 : lecture seule du profil — ZERO modification
    const apprenant = await this.botRepo.getProfilApprenant(apprenant_id);

    // RM-116 : profil incomplet → invite à compléter
    // RM-35 : secteur_activite obligatoire si type_apprenant=PROFESSIONNEL
    // RM-36 : niveau_etude obligatoire si type_apprenant=APPRENANT (déjà vérifié côté API)
    const profilIncomplet =
      (apprenant?.type_apprenant === 'PROFESSIONNEL' && !apprenant?.secteur_activite);

    if (profilIncomplet) {
      return {
        session_id: null,
        flux: 'PROFIL_INCOMPLET',
        message: 'Veuillez compléter votre profil (secteur d\'activité) pour bénéficier de recommandations personnalisées.',
        action_requise: '/apprenant/profil'
      };
    }

    // Évaluer conditions flux
    const feedbackTarget = this.feedbackEligibility
      ? await this.feedbackEligibility.findForApprenant(apprenant_id)
      : null;
    const sessionsSansFeedback = feedbackTarget
      ? [this.legacyTarget(feedbackTarget, apprenant.langue_preferee || langue)]
      : await this.botRepo.findSessionsSansFeedback(apprenant_id);
    const dernierRefus = await this.botRepo.findDernierRefusUpgrade(apprenant_id);
    const joursDepuisRefus = dernierRefus?.dernier_refus_upgrade_le
      ? Math.floor((Date.now() - dernierRefus.dernier_refus_upgrade_le.getTime()) / (24 * 3600 * 1000))
      : null;

    // RM-116 : déterminer flux prioritaire
    const flux = determinerFluxPrioritaire({
      sessions_cloturees_sans_feedback: sessionsSansFeedback.length > 0,
      est_abonne_essentiel: apprenant.abonnement_retail?.offre === 'ESSENTIEL' && apprenant.abonnement_retail?.statut === 'ACTIF',
      formation_premium_souhaitee: false, // déterminé lors de l'orientation
      palier_b2b_plein: false,
      dernier_refus_upgrade_jours: joursDepuisRefus,
      nb_refus_upgrade: dernierRefus?.nb_refus_upgrade || 0,
    });

    const session = await this.botRepo.creerSession({
      utilisateur_id: apprenant_id,
      apprenant_id,
      organisation_id: null,
      type_utilisateur: 'APPRENANT',
      flux_actif: flux,
      langue: apprenant.langue_preferee || langue,
      ...(feedbackTarget && { contexte: this.targetContext(feedbackTarget) }),
    });

    await this.audit.info('BOT_SESSION_DEMARREE', { session_id: session.id, flux, apprenant_id });

    // Retourner la première question selon le flux
    return this.getPremiereQuestion(session.id, flux, sessionsSansFeedback[0]);
  }

  // Démarrer session bot pour Organisation (RM-115)
  async demarrerSessionOrganisation(organisation_id: string, langue: string) {
    // RM-125 : lecture seule — ZERO modification
    const organisation = await this.botRepo.getProfilOrganisation(organisation_id);
    const aboB2B = await this.botRepo.getAbonnementB2B(organisation_id);
    const nbApprenants = await this.botRepo.countApprenantsActifsOrganisation(organisation_id);

    let flux: 'UPGRADE' | 'FEEDBACK' | 'IDLE' = 'IDLE';

    // RM-121 : cooldown 7 jours après refus upgrade
    const dernierRefus = await this.botRepo.findDernierRefusUpgrade(organisation_id);
    const joursDepuisRefus = dernierRefus?.dernier_refus_upgrade_le
      ? Math.floor((Date.now() - dernierRefus.dernier_refus_upgrade_le.getTime()) / (24 * 3600 * 1000))
      : null;
    const cooldownActif = joursDepuisRefus !== null && joursDepuisRefus < COOLDOWN_UPGRADE_JOURS;

    // RM-115 : déclenchement auto si palier B2B >80%
    if (aboB2B && aboB2B.statut === 'ACTIF' && !cooldownActif) {
      const palier = aboB2B.palier;
      let capaciteMax = 0;

      // Déterminer la capacité max selon le palier
      if (palier === 'STARTER') capaciteMax = 20;
      else if (palier === 'BUSINESS') capaciteMax = 100;
      else if (palier === 'ENTERPRISE') capaciteMax = 500;

      if (capaciteMax > 0) {
        const tauxRemplissage = (nbApprenants / capaciteMax) * 100;

        // RM-116 : si >80%, proposer upgrade
        if (tauxRemplissage > 80) {
          flux = 'UPGRADE';
        }
      }
    }

    // Vérifier s'il y a des sessions clôturées sans feedback (organisations peuvent aussi donner du feedback)
    const feedbackTarget = this.feedbackEligibility
      ? await this.feedbackEligibility.findForOrganisation(organisation_id)
      : null;
    const sessionsSansFeedback = feedbackTarget
      ? [this.legacyTarget(feedbackTarget, organisation?.langue_preferee || langue)]
      : [];
    if (feedbackTarget || sessionsSansFeedback.length > 0) {
      flux = 'FEEDBACK'; // Feedback prioritaire
    }

    const session = await this.botRepo.creerSession({
      utilisateur_id: organisation_id,
      apprenant_id: null,
      organisation_id,
      type_utilisateur: 'ORGANISATION',
      flux_actif: flux,
      langue: organisation?.langue_preferee || langue,
      ...(feedbackTarget && { contexte: this.targetContext(feedbackTarget) }),
    });

    await this.audit.info('BOT_SESSION_ORGANISATION_DEMARREE', {
      session_id: session.id,
      organisation_id,
      flux,
      nb_apprenants: nbApprenants,
      palier: aboB2B?.palier,
    });

    // Retourner la première question selon le flux
    if (flux === 'UPGRADE') {
      return this.getPremiereQuestionUpgradeOrganisation(session.id, aboB2B?.palier);
    } else if (flux === 'FEEDBACK') {
      return this.getPremiereQuestion(session.id, flux, sessionsSansFeedback[0]);
    }

    return {
      session_id: session.id,
      flux: 'IDLE',
      message: 'Session bot organisation créée. Que puis-je faire pour vous aujourd\'hui ?',
    };
  }

  private targetContext(target: FeedbackTarget) {
    return {
      formation_id: target.formationId,
      session_id: target.sessionId,
      mode_formation: target.modeFormation,
      formation_intitule: target.formationIntitule,
    };
  }

  private legacyTarget(target: FeedbackTarget, langue: string) {
    return {
      langue,
      formation: {
        id: target.formationId,
        intitule: target.formationIntitule,
        mode_formation: target.modeFormation,
      },
      session_id: target.sessionId,
    };
  }

  // Première question pour l'upgrade Organisation
  private getPremiereQuestionUpgradeOrganisation(session_id: string, palier_actuel?: string) {
    const palierSuivant = palier_actuel === 'STARTER' ? 'BUSINESS' : 'ENTERPRISE';
    const capaciteSuivante = palierSuivant === 'BUSINESS' ? 100 : 500;

    return {
      session_id,
      flux: 'UPGRADE',
      question: `Votre abonnement ${palier_actuel} arrive à saturation. Souhaitez-vous passer au palier ${palierSuivant} pour former jusqu'à ${capaciteSuivante} collaborateurs ?`,
      options: ['Oui, je souhaite upgrader', 'Non, pas maintenant', 'En savoir plus'],
      question_id: 1,
    };
  }

  // Normalise un question_id présenté ("orientation_1", "enquete_2") vers sa forme interne (1, 2, …)
  private normalizeQuestionId(flux: string, question_id: number | string): number | string {
    if (typeof question_id === 'number') return question_id;
    const prefix = flux.toLowerCase() + '_';
    if (question_id.startsWith(prefix)) {
      const num = parseInt(question_id.slice(prefix.length), 10);
      if (!isNaN(num)) return num;
    }
    return question_id;
  }

  // Réponse à une question du bot (RM-118 : valider que la valeur est dans les options)
  async repondre(
    session_id: string,
    question_id: number | string,
    valeur: any,
    commentaire: string | null = null,
    utilisateurId?: string,
  ) {
    const session = await this.botRepo.findSession(session_id);
    if (
      !session ||
      session.statut !== 'EN_COURS' ||
      (utilisateurId && session.utilisateur_id !== utilisateurId)
    ) throw new Error('SESSION_INVALIDE');
    if (commentaire && commentaire.length > 500) throw new Error('COMMENTAIRE_TROP_LONG');

    const normalized_question_id = session.flux_actif === 'FEEDBACK'
      ? question_id
      : this.normalizeQuestionId(session.flux_actif, question_id);

    // RM-125 : bot ne modifie AUCUNE donnée utilisateur directement
    // RM-118 : valider que la valeur est dans les options autorisées
    const estValide = this.validerReponseQuestion(session.flux_actif, normalized_question_id, valeur);
    if (!estValide) throw new Error('REPONSE_HORS_LISTE');

    // Enregistrer dans l'historique
    const normalizedQuestionId = session.flux_actif === 'FEEDBACK'
      ? this.normalizeFeedbackQuestionId(question_id)
      : normalized_question_id;
    const historique = [...(session.historique as any[] || []), {
      question_id: normalizedQuestionId,
      valeur,
      ...(commentaire !== null && { commentaire }),
      timestamp: new Date(),
    }];
    await this.botRepo.updateSession(session_id, { historique });

    return this.getSuiteFlux(session, normalizedQuestionId, valeur, historique);
  }

  // Logique de suite selon le flux
  private async getSuiteFlux(session: any, question_id: number | string, valeur: any, historique: any[]) {
    switch (session.flux_actif) {

      case 'ORIENTATION':
        return this.handleOrientation(session, question_id, valeur, historique);

      case 'UPGRADE':
        return this.handleUpgrade(session, question_id, valeur);

      case 'FEEDBACK':
        return this.handleFeedback(session, question_id, valeur, historique);

      case 'ENQUETE':
        return this.handleEnquete(session, question_id, valeur, historique);

      default:
        return { fin: true };
    }
  }

  private orientationSessionView(session: any, historique: any[], question: any) {
    return {
      id: session.id,
      flux_actif: 'ORIENTATION',
      statut: session.statut,
      langue: session.langue,
      current_question: question,
      historique: { steps: historique, metadata: {} },
    };
  }

  private async handleOrientation(session: any, question_id: number | string, valeur: any, historique: any[]) {
    if (question_id === 1) { // Objectif
      return this.orientationSessionView(session, historique, {
        id: 2, question: 'Dans quel secteur travaillez-vous ?', options: OPTIONS_BOT.SECTEUR,
      });
    }
    if (question_id === 2) { // Secteur
      return this.orientationSessionView(session, historique, {
        id: 3, question: 'Quel est votre niveau actuel ?', options: OPTIONS_BOT.NIVEAU,
      });
    }
    if (question_id === 3) { // Niveau → filtrer catalogue
      const estAbonne = false;
      const formations = await this.engine.fluxOrientation(
        { secteur: historique.find(h => h.question_id === 2)?.valeur },
        session.langue,
        estAbonne
      );

      if (formations.length === 0) {
        // RM-123 : 0 résultat → flux Enquête
        await this.botRepo.updateSession(session.id, { flux_actif: 'ENQUETE' });
        const questions = this.engine.getQuestionsEnquete();
        return { flux: 'ENQUETE', question: questions[0], nb_questions: 3 };
      }

      await this.botRepo.cloturerSession(session.id, 'TERMINEE');
      return { fin: true, flux: 'ORIENTATION', formations, message: `${formations.length} formation(s) correspondent à votre profil.` };
    }
  }

  private async handleUpgrade(session: any, question_id: number | string, valeur: any) {
    if (question_id === 1) { // Accepter/refuser
      if (valeur === 'Non') {
        // RM-120 : enregistrer refus
        const dernierRefus = await this.botRepo.findDernierRefusUpgrade(session.utilisateur_id);
        const nbRefus = (dernierRefus?.nb_refus_upgrade || 0) + 1;
        
        // RM-121 : cooldown 7 jours avant reproposition
        await this.botRepo.updateSession(session.id, {
          dernier_refus_upgrade_le: new Date(),
          nb_refus_upgrade: nbRefus
        });
        
        await this.botRepo.cloturerSession(session.id, 'TERMINEE');
        return { fin: true, message: 'Refus enregistré. Nous ne vous proposerons pas d\'upgrade avant 7 jours.' };
      }
      // Accepter → redirection UCS11.1
      await this.botRepo.cloturerSession(session.id, 'TERMINEE');
      return { fin: true, action: 'REDIRECT_UPGRADE', url: '/apprenant/abonnements/upgrade' };
    }
  }

  private async handleFeedback(session: any, question_id: number | string, valeur: any, historique: any[]) {
    const contexte = session.contexte || {};
    const questions = getFeedbackQuestions(session.langue, contexte.mode_formation);
    const currentIndex = questions.findIndex(question => question.id === question_id);

    if (currentIndex < questions.length - 1) {
      return this.feedbackSessionView(session, historique, questions[currentIndex + 1]);
    }

    const find = (id: string) => historique.find((item: any) => item.question_id === id);
    const noteGlobale = find(FEEDBACK_QUESTION_IDS.NOTE_GLOBALE)?.valeur;
    if (!noteGlobale) throw new Error('NOTE_GLOBALE_OBLIGATOIRE');
    const noteContenu = find(FEEDBACK_QUESTION_IDS.NOTE_CONTENU)?.valeur;
    const noteFormateur = find(FEEDBACK_QUESTION_IDS.NOTE_FORMATEUR)?.valeur;
    const commentaireStep = find(FEEDBACK_QUESTION_IDS.COMMENTAIRE);

    try {
      await this.botRepo.enregistrerFeedback({
        apprenant_id: session.type_utilisateur === 'APPRENANT' ? session.utilisateur_id : null,
        organisation_id: session.type_utilisateur === 'ORGANISATION' ? session.utilisateur_id : null,
        formation_id: contexte.formation_id,
        session_id: contexte.session_id || null,
        canal: 'BOT',
        note_globale: Number(noteGlobale),
        note_contenu: noteContenu && noteContenu !== 'PASSER' ? Number(noteContenu) : null,
        note_formateur: noteFormateur && noteFormateur !== 'PASSER' ? Number(noteFormateur) : null,
        commentaire_libre: commentaireStep?.commentaire || null,
        recommande: ['OUI', 'Oui'].includes(
          find(FEEDBACK_QUESTION_IDS.RECOMMANDE)?.valeur,
        ),
        session_bot_id: session.id,
      } as any);
    } catch (error: any) {
      if (error?.code === 'P2002') throw new Error('FEEDBACK_DEJA_COLLECTE');
      throw error;
    }

    await this.audit.info('FEEDBACK_COLLECTE', {
      session_id: session.id,
      formation_id: contexte.formation_id,
      type_utilisateur: session.type_utilisateur,
    });
    await this.botRepo.cloturerSession(session.id, 'TERMINEE');
    return this.feedbackSessionView({ ...session, statut: 'TERMINEE' }, historique, null);
  }

  private feedbackSessionView(session: any, historique: any[], question: any) {
    return {
      id: session.id,
      flux_actif: 'FEEDBACK',
      statut: session.statut,
      langue: session.langue,
      current_question: question,
      historique: {
        steps: historique,
        metadata: { feedback: session.contexte || {} },
      },
    };
  }

  private async handleEnquete(session: any, question_id: number | string, valeur: any, historique: any[]) {
    if (typeof question_id === 'number' && question_id < 3) {
      const questions = this.engine.getQuestionsEnquete();
      return { question: questions[question_id] }; // 0-based index
    }

    // 3ème réponse → enregistrer enquête (RM-123, RM-124)
    const h = historique;
    await this.botRepo.enregistrerEnquete({
      utilisateur_id: session.utilisateur_id,
      type_utilisateur: session.type_utilisateur,
      domaine: h.find((r: any) => r.question_id === 1)?.valeur || '',
      niveau: h.find((r: any) => r.question_id === 2)?.valeur || '',
      volume: h.find((r: any) => r.question_id === 3)?.valeur || valeur,
      session_bot_id: session.id,
    });

    await this.audit.info('ENQUETE_ENREGISTREE', { session_id: session.id });
    await this.botRepo.cloturerSession(session.id, 'TERMINEE');
    return {
      fin: true,
      message: 'Votre besoin a été enregistré. Nous vous notifierons dès qu\'une formation correspondante sera disponible.',
    };
  }

  private getPremiereQuestion(session_id: string, flux: string, sessionSansFeedback?: any) {
    switch (flux) {
      case 'FEEDBACK': {
        const questions = getFeedbackQuestions(
          sessionSansFeedback?.langue || 'FR',
          sessionSansFeedback?.formation?.mode_formation || 'AVEC_SESSION',
        );
        return {
          session_id,
          flux: 'FEEDBACK',
          langue: sessionSansFeedback?.langue || 'FR',
          contexte_formation: sessionSansFeedback?.formation?.intitule,
          question: questions[0],
        };
      }
      case 'UPGRADE':
        return {
          session_id,
          flux: 'UPGRADE',
          argumentaire: this.engine.genererArgumentaireUpgrade('ESSENTIEL', 'PREMIUM'),
          question: { id: 1, texte: 'Souhaitez-vous passer à l\'offre Premium ?', options: ['Oui', 'Non'], obligatoire: true }
        };
      default: // ORIENTATION
        return {
          session_id,
          flux: 'ORIENTATION',
          question: { id: 1, texte: 'Quel est votre objectif de formation ?', options: OPTIONS_BOT.OBJECTIF, obligatoire: true }
        };
    }
  }

  private validerReponseQuestion(flux: string, question_id: number | string, valeur: any): boolean {
    // RM-118 : toutes les valeurs doivent être dans les listes autorisées
    switch (flux) {
      case 'ORIENTATION':
        if (question_id === 1) return OPTIONS_BOT.OBJECTIF.includes(valeur as any);
        if (question_id === 2) return OPTIONS_BOT.SECTEUR.includes(valeur as any);
        if (question_id === 3) return OPTIONS_BOT.NIVEAU.includes(valeur as any);
        return false;
      case 'UPGRADE':
        return ['Oui', 'Non'].includes(valeur);
      case 'FEEDBACK':
        return this.validerReponseFeedback(question_id, valeur);
      case 'ENQUETE':
        if (question_id === 1) return OPTIONS_BOT.DOMAINE_ENQUETE.includes(valeur as any);
        if (question_id === 2) return OPTIONS_BOT.NIVEAU.includes(valeur as any);
        if (question_id === 3) return OPTIONS_BOT.VOLUME_ENQUETE.includes(valeur as any);
        return false;
      default:
        return false;
    }
  }

  private validerReponseFeedback(questionId: number | string, valeur: any): boolean {
    const id = this.normalizeFeedbackQuestionId(questionId);
    if (id === FEEDBACK_QUESTION_IDS.NOTE_GLOBALE) {
      return ['1', '2', '3', '4', '5'].includes(String(valeur));
    }
    if ([FEEDBACK_QUESTION_IDS.NOTE_CONTENU, FEEDBACK_QUESTION_IDS.NOTE_FORMATEUR].includes(id as any)) {
      return ['1', '2', '3', '4', '5', 'PASSER'].includes(String(valeur));
    }
    if (id === FEEDBACK_QUESTION_IDS.COMMENTAIRE) {
      return ['ENVOYER', 'PASSER'].includes(String(valeur));
    }
    if (id === FEEDBACK_QUESTION_IDS.RECOMMANDE) {
      return ['OUI', 'NON', 'Oui', 'Non'].includes(String(valeur));
    }
    return false;
  }

  private normalizeFeedbackQuestionId(questionId: number | string): string {
    const legacyIds: Record<number, string> = {
      1: FEEDBACK_QUESTION_IDS.NOTE_GLOBALE,
      2: FEEDBACK_QUESTION_IDS.NOTE_CONTENU,
      3: FEEDBACK_QUESTION_IDS.NOTE_FORMATEUR,
      4: FEEDBACK_QUESTION_IDS.COMMENTAIRE,
      5: FEEDBACK_QUESTION_IDS.RECOMMANDE,
    };
    return typeof questionId === 'number' ? legacyIds[questionId] : questionId;
  }

  // Abandon session (RM-115)
  async abandonnerSession(session_id: string) {
    await this.botRepo.cloturerSession(session_id, 'ABANDONNEE');
    return { message: 'Session abandonnée. Vous pourrez reprendre à votre prochaine connexion.' };
  }
}
