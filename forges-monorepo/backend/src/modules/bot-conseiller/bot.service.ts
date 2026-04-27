import { BotRepository } from './bot.repository';
import { BotEngineService, determinerFluxPrioritaire, OPTIONS_BOT } from './bot-engine.service';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { PrismaClient } from '@prisma/client';

const COOLDOWN_UPGRADE_JOURS = 7;   // RM-120
const COOLDOWN_3_REFUS_JOURS = 30;  // RM-120

export class BotService {
  constructor(
    private readonly botRepo: BotRepository,
    private readonly engine: BotEngineService,
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger
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
    const apprenant = await this.prisma.apprenant.findUnique({
      where: { id: apprenant_id },
      select: {
        type_apprenant: true, secteur_activite: true,
        langue_preferee: true,
        abonnement_retail: { select: { offre: true, statut: true } }
      }
    });

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
    const sessionsSansFeedback = await this.botRepo.findSessionsSansFeedback(apprenant_id);
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
      type_utilisateur: 'APPRENANT',
      flux_actif: flux,
      langue: apprenant.langue_preferee || langue,
    });

    await this.audit.info('BOT_SESSION_DEMARREE', { session_id: session.id, flux, apprenant_id });

    // Retourner la première question selon le flux
    return this.getPremiereQuestion(session.id, flux, sessionsSansFeedback[0]);
  }

  // Démarrer session bot pour Organisation (RM-115)
  async demarrerSessionOrganisation(organisation_id: string, langue: string) {
    // RM-125 : lecture seule — ZERO modification
    const organisation = await this.prisma.organisation.findUnique({
      where: { id: organisation_id },
      select: {
        langue_preferee: true,
      }
    });

    // Récupérer l'abonnement B2B
    const aboB2B = await this.prisma.abonnementB2B.findFirst({
      where: { organisation_id },
      select: {
        palier: true,
        statut: true,
      }
    });

    // Compter les apprenants actifs rattachés
    const nbApprenants = await this.prisma.apprenant.count({
      where: {
        organisation_id,
        statut: 'ACTIF',
      }
    });

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
    const sessionsSansFeedback = await this.botRepo.findSessionsSansFeedback(organisation_id);
    if (sessionsSansFeedback.length > 0) {
      flux = 'FEEDBACK'; // Feedback prioritaire
    }

    const session = await this.botRepo.creerSession({
      utilisateur_id: organisation_id,
      type_utilisateur: 'ORGANISATION',
      flux_actif: flux,
      langue: organisation?.langue_preferee || langue,
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

  // Réponse à une question du bot (RM-118 : valider que la valeur est dans les options)
  async repondre(session_id: string, question_id: number, valeur: any) {
    const session = await this.botRepo.findSession(session_id);
    if (!session || session.statut !== 'EN_COURS') throw new Error('SESSION_INVALIDE');

    // RM-125 : bot ne modifie AUCUNE donnée utilisateur directement
    // RM-118 : valider que la valeur est dans les options autorisées
    const estValide = this.validerReponseQuestion(session.flux_actif, question_id, valeur);
    if (!estValide) throw new Error('REPONSE_HORS_LISTE');

    // Enregistrer dans l'historique
    const historique = [...(session.historique as any[] || []), { question_id, valeur, timestamp: new Date() }];
    await this.botRepo.updateSession(session_id, { historique });

    return this.getSuiteFlux(session, question_id, valeur, historique);
  }

  // Logique de suite selon le flux
  private async getSuiteFlux(session: any, question_id: number, valeur: any, historique: any[]) {
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

  private async handleOrientation(session: any, question_id: number, valeur: any, historique: any[]) {
    if (question_id === 1) { // Objectif
      return { question_id: 2, texte: 'Dans quel secteur travaillez-vous ?', options: OPTIONS_BOT.SECTEUR };
    }
    if (question_id === 2) { // Secteur
      return { question_id: 3, texte: 'Quel est votre niveau actuel ?', options: OPTIONS_BOT.NIVEAU };
    }
    if (question_id === 3) { // Niveau → filtrer catalogue
      const estAbonne = false; // charge depuis profil
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

  private async handleUpgrade(session: any, question_id: number, valeur: any) {
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

  private async handleFeedback(session: any, question_id: number, valeur: any, historique: any[]) {
    const formationId = session.contexte?.formation_id;
    const questions = this.engine.getQuestionsFeedback('', session.langue);
    const derniereQuestion = questions[questions.length - 1];

    if (question_id < derniereQuestion.id) {
      const prochaine = questions[question_id]; // question_id 1-based
      return { question: prochaine };
    }

    // Dernière réponse → enregistrer feedback (RM-122)
    const h = historique;
    const noteGlobale = h.find((r: any) => r.question_id === 1)?.valeur;
    if (!noteGlobale) throw new Error('NOTE_GLOBALE_OBLIGATOIRE');

    await this.botRepo.enregistrerFeedback({
      apprenant_id: session.utilisateur_id,
      formation_id: formationId || '',
      note_globale: noteGlobale,
      note_contenu: h.find((r: any) => r.question_id === 2)?.valeur,
      note_formateur: h.find((r: any) => r.question_id === 3)?.valeur,
      commentaire: h.find((r: any) => r.question_id === 4)?.valeur,
      recommande: h.find((r: any) => r.question_id === 5)?.valeur === 'Oui',
      session_bot_id: session.id,
    });

    await this.audit.info('FEEDBACK_ENREGISTRE', { session_id: session.id, formation_id: formationId });
    await this.botRepo.cloturerSession(session.id, 'TERMINEE');
    return { fin: true, message: 'Merci pour votre retour !' };
  }

  private async handleEnquete(session: any, question_id: number, valeur: any, historique: any[]) {
    if (question_id < 3) {
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
      case 'FEEDBACK':
        return {
          session_id,
          flux: 'FEEDBACK',
          contexte_formation: sessionSansFeedback?.formation?.intitule,
          question: { id: 1, texte: `Comment évaluez-vous globalement "${sessionSansFeedback?.formation?.intitule}" ?`, options: OPTIONS_BOT.NOTE_ETOILES, obligatoire: true }
        };
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

  private validerReponseQuestion(flux: string, question_id: number, valeur: any): boolean {
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
        if ([1, 2, 3].includes(question_id)) return OPTIONS_BOT.NOTE_ETOILES.includes(valeur);
        if (question_id === 4) return typeof valeur === 'string' && valeur.length <= 500; // seul champ texte libre
        if (question_id === 5) return OPTIONS_BOT.RECOMMANDE.includes(valeur as any);
        return false;
      case 'ENQUETE':
        if (question_id === 1) return OPTIONS_BOT.DOMAINE_ENQUETE.includes(valeur as any);
        if (question_id === 2) return OPTIONS_BOT.NIVEAU.includes(valeur as any);
        if (question_id === 3) return OPTIONS_BOT.VOLUME_ENQUETE.includes(valeur as any);
        return false;
      default:
        return false;
    }
  }

  // Abandon session (RM-115)
  async abandonnerSession(session_id: string) {
    await this.botRepo.cloturerSession(session_id, 'ABANDONNEE');
    return { message: 'Session abandonnée. Vous pourrez reprendre à votre prochaine connexion.' };
  }
}
