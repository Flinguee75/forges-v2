import { BotService } from '../bot.service';
import { BotEngineService, determinerFluxPrioritaire, OPTIONS_BOT } from '../bot-engine.service';
import { BotRepository } from '../bot.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';

describe('BotService (MOD-14 — 100% règles métier)', () => {
  let service: BotService;
  let mockRepo: jest.Mocked<BotRepository>;
  let mockEngine: jest.Mocked<BotEngineService>;
  let mockAudit: jest.Mocked<AuditLogger>;

  const sessionEnCours = {
    id: 'sess-01',
    utilisateur_id: 'a-01',
    type_utilisateur: 'APPRENANT',
    flux_actif: 'ORIENTATION',
    langue: 'FR',
    statut: 'EN_COURS',
    historique: [],
    dernier_refus_upgrade_le: null,
    nb_refus_upgrade: 0,
    contexte: null,
  };

  beforeEach(() => {
    mockRepo = {
      creerSession: jest.fn(),
      findSession: jest.fn(),
      findSessionActive: jest.fn(),
      updateSession: jest.fn(),
      cloturerSession: jest.fn(),
      findDernierRefusUpgrade: jest.fn(),
      feedbackExiste: jest.fn(),
      findSessionsSansFeedback: jest.fn(),
      enregistrerFeedback: jest.fn(),
      enregistrerEnquete: jest.fn(),
      filtrerFormations: jest.fn(),
      getProfilApprenant: jest.fn(),
      getProfilOrganisation: jest.fn(),
      getAbonnementB2B: jest.fn(),
      countApprenantsActifsOrganisation: jest.fn(),
    } as any;

    mockEngine = {
      validerReponse: jest.fn(),
      fluxOrientation: jest.fn(),
      genererArgumentaireUpgrade: jest.fn(),
      getQuestionsFeedback: jest.fn(),
      getQuestionsEnquete: jest.fn(),
    } as any;

    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;

    service = new BotService(mockRepo, mockEngine, mockAudit);

    mockEngine.getQuestionsFeedback.mockReturnValue([
      { id: 1, texte: 'Note globale', options: OPTIONS_BOT.NOTE_ETOILES, obligatoire: true },
      { id: 2, texte: 'Contenu', options: OPTIONS_BOT.NOTE_ETOILES, obligatoire: false },
      { id: 3, texte: 'Formateur', options: OPTIONS_BOT.NOTE_ETOILES, obligatoire: false },
      { id: 4, texte: 'Commentaire', type: 'TEXTE_LIBRE', max_length: 500, obligatoire: false },
      { id: 5, texte: 'Recommander ?', options: OPTIONS_BOT.RECOMMANDE, obligatoire: true },
    ] as any);
    mockEngine.getQuestionsEnquete.mockReturnValue([
      { id: 1, texte: 'Domaine ?', options: OPTIONS_BOT.DOMAINE_ENQUETE, obligatoire: true },
      { id: 2, texte: 'Niveau ?', options: OPTIONS_BOT.NIVEAU, obligatoire: true },
      { id: 3, texte: 'Volume ?', options: OPTIONS_BOT.VOLUME_ENQUETE, obligatoire: true },
    ] as any);
  });

  // Tests de la méthode getSessionActive
  describe('getSessionActive', () => {
    it('retourne la session active de l\'utilisateur', async () => {
      const mockSession = { id: 'sess-01', statut: 'EN_COURS', utilisateur_id: 'app-01' };
      mockRepo.findSessionActive.mockResolvedValue(mockSession as any);

      const result = await service.getSessionActive('app-01');

      expect(mockRepo.findSessionActive).toHaveBeenCalledWith('app-01');
      expect(result).toEqual(mockSession);
    });

    it('retourne null si aucune session active', async () => {
      mockRepo.findSessionActive.mockResolvedValue(null);

      const result = await service.getSessionActive('app-01');

      expect(mockRepo.findSessionActive).toHaveBeenCalledWith('app-01');
      expect(result).toBeNull();
    });

    it('propage les erreurs du repository', async () => {
      const error = new Error('Database error');
      mockRepo.findSessionActive.mockRejectedValue(error);

      await expect(service.getSessionActive('app-01')).rejects.toThrow('Database error');
    });
  });

  // RM-116 : profil incomplet → invite à compléter
  describe('RM-116 — Profil incomplet bloque le bot', () => {
    it('retourne PROFIL_INCOMPLET si secteur manquant', async () => {
      mockRepo.getProfilApprenant.mockResolvedValue({
        type_apprenant: 'PROFESSIONNEL',
        secteur_activite: null,
        langue_preferee: 'FR',
        abonnement_retail: null
      });

      const result = await service.demarrerSessionApprenant('a-01', 'FR');
      expect(result.flux).toBe('PROFIL_INCOMPLET');
      if ('action_requise' in result) {
        expect(result.action_requise).toBeDefined();
      } else {
        fail('action_requise should be returned when flux is PROFIL_INCOMPLET');
      }
    });
  });

  // RM-118 : questions fermées uniquement — valeur hors liste rejetée
  describe('RM-118 — Questions fermées uniquement', () => {
    it('rejette une valeur hors liste pour le flux ORIENTATION', async () => {
      mockRepo.findSession.mockResolvedValue(sessionEnCours as any);
      mockRepo.updateSession.mockResolvedValue({} as any);

      await expect(
        service.repondre('sess-01', 1, 'Réponse libre non autorisée')
      ).rejects.toThrow('REPONSE_HORS_LISTE');
    });

    it('accepte une valeur dans les options autorisées', async () => {
      mockRepo.findSession.mockResolvedValue(sessionEnCours as any);
      mockRepo.updateSession.mockResolvedValue({} as any);
      mockEngine.fluxOrientation.mockResolvedValue([]);
      mockRepo.updateSession.mockResolvedValue({} as any);
      mockRepo.cloturerSession.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);
      // Q1 ORIENTATION = OPTIONS_BOT.OBJECTIF[0]
      await expect(
        service.repondre('sess-01', 1, OPTIONS_BOT.OBJECTIF[0])
      ).resolves.toBeDefined();
    });
  });

  // RM-119/120 : flux upgrade et cooldown
  describe('RM-119/120 — Déclenchement et cooldown upgrade', () => {
    it('déclenche flux UPGRADE si abonné Essentiel + formation Premium', () => {
      const flux = determinerFluxPrioritaire({
        sessions_cloturees_sans_feedback: false,
        est_abonne_essentiel: true,
        formation_premium_souhaitee: true,
        palier_b2b_plein: false,
        dernier_refus_upgrade_jours: null,
        nb_refus_upgrade: 0,
      });
      expect(flux).toBe('UPGRADE');
    });

    it('saute UPGRADE si refus < 7j (RM-120)', () => {
      const flux = determinerFluxPrioritaire({
        sessions_cloturees_sans_feedback: false,
        est_abonne_essentiel: true,
        formation_premium_souhaitee: true,
        palier_b2b_plein: false,
        dernier_refus_upgrade_jours: 3, // < 7j
        nb_refus_upgrade: 1,
      });
      expect(flux).toBe('ORIENTATION'); // pas UPGRADE
    });

    it('cooldown 30j après 3 refus consécutifs (RM-120)', () => {
      const flux = determinerFluxPrioritaire({
        sessions_cloturees_sans_feedback: false,
        est_abonne_essentiel: true,
        formation_premium_souhaitee: true,
        palier_b2b_plein: false,
        dernier_refus_upgrade_jours: 10, // > 7j mais < 30j
        nb_refus_upgrade: 3, // 3 refus → cooldown 30j
      });
      expect(flux).toBe('ORIENTATION'); // bloqué 30j
    });
  });

  // RM-121 : feedback prioritaire sur upgrade
  describe('RM-121 — Flux Feedback prioritaire', () => {
    it('déclenche FEEDBACK si session clôturée sans feedback', () => {
      const flux = determinerFluxPrioritaire({
        sessions_cloturees_sans_feedback: true,
        est_abonne_essentiel: true,
        formation_premium_souhaitee: true,
        palier_b2b_plein: false,
        dernier_refus_upgrade_jours: null,
        nb_refus_upgrade: 0,
      });
      expect(flux).toBe('FEEDBACK'); // Feedback prioritaire même si upgrade éligible
    });
  });

  // RM-122 : note globale obligatoire
  describe('RM-122 — Note globale obligatoire dans le feedback', () => {
    it('rejette soumission feedback sans note globale', async () => {
      const sessionFeedback = {
        ...sessionEnCours,
        flux_actif: 'FEEDBACK',
        historique: [
          { question_id: 2, valeur: 4 }, // contenu
          { question_id: 3, valeur: 5 }, // formateur
          { question_id: 5, valeur: 'Oui' }
          // question_id 1 (note globale) ABSENT
        ]
      };
      mockRepo.findSession.mockResolvedValue(sessionFeedback as any);
      mockRepo.updateSession.mockResolvedValue({} as any);

      await expect(
        service.repondre('sess-01', 5, 'Oui')
      ).rejects.toThrow('NOTE_GLOBALE_OBLIGATOIRE');
    });
  });

  // RM-123/124 : enquête catalogue 3 questions fermées
  describe('RM-123/124 — Enquête catalogue', () => {
    it('propose flux ENQUETE si 0 formation trouvée', async () => {
      mockRepo.findSession.mockResolvedValue(sessionEnCours as any);
      mockRepo.updateSession.mockResolvedValue({} as any);
      mockEngine.fluxOrientation.mockResolvedValue([]); // 0 résultat → enquête
      mockRepo.cloturerSession.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);
      mockEngine.getQuestionsEnquete.mockReturnValue([
        { id: 1, texte: 'Domaine ?', options: OPTIONS_BOT.DOMAINE_ENQUETE, obligatoire: true }
      ]);

      // Q3 du flux ORIENTATION → 0 formation → ENQUETE
      const sessionQ3 = {
        ...sessionEnCours,
        historique: [
          { question_id: 1, valeur: OPTIONS_BOT.OBJECTIF[0] },
          { question_id: 2, valeur: OPTIONS_BOT.SECTEUR[0] },
        ]
      };
      mockRepo.findSession.mockResolvedValue(sessionQ3 as any);

      const result = await service.repondre('sess-01', 3, OPTIONS_BOT.NIVEAU[0]);
      expect((result as any)?.flux).toBe('ENQUETE');
    });

    it('valide les 3 questions fermées de l\'enquête', () => {
      const engine = new BotEngineService(mockRepo, {} as any);
      const questions = engine.getQuestionsEnquete();
      expect(questions).toHaveLength(3);
      questions.forEach(q => {
        expect(q.options).toBeDefined();
        expect(Array.isArray(q.options)).toBe(true);
        expect(q.obligatoire).toBe(true);
      });
    });
  });

  // RM-125 : bot 100% règles métier — zéro appel externe
  describe('RM-125 — Bot 100% règles métier, zéro LLM', () => {
    it('ne contient aucune référence à un LLM ou API externe', () => {
      const serviceCode = BotService.toString();
      const engineCode = BotEngineService.toString();

      const mots_interdits = ['openai', 'anthropic', 'gemini', 'llm', 'gpt', 'claude', 'fetch(', 'axios.', 'http.get'];
      mots_interdits.forEach(mot => {
        expect(serviceCode.toLowerCase()).not.toContain(mot);
        expect(engineCode.toLowerCase()).not.toContain(mot);
      });
    });

    it('toutes les interactions sont tracées (MT-01)', async () => {
      mockRepo.getProfilApprenant.mockResolvedValue({
        type_apprenant: 'PROFESSIONNEL',
        secteur_activite: 'Finance',
        langue_preferee: 'FR',
        abonnement_retail: null,
      });
      mockRepo.findSessionsSansFeedback.mockResolvedValue([]);
      mockRepo.findDernierRefusUpgrade.mockResolvedValue(null);
      mockRepo.creerSession.mockResolvedValue({ id: 'sess-new', flux_actif: 'ORIENTATION' } as any);
      mockAudit.info.mockResolvedValue(undefined);

      await service.demarrerSessionApprenant('a-01', 'FR');
      expect(mockAudit.info).toHaveBeenCalledWith(
        'BOT_SESSION_DEMARREE',
        expect.objectContaining({ session_id: 'sess-new' })
      );
    });
  });
});
