import { SessionService } from '../session.service';
import { SessionRepository } from '../session.repository';
import { FormationRepository } from '../../formations/formation.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

describe('SessionService', () => {
  let service: SessionService;
  let mockSessionRepo: jest.Mocked<SessionRepository>;
  let mockFormationRepo: jest.Mocked<FormationRepository>;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: jest.Mocked<EmailService>;

  const formationAvecSession = {
    id: 'f-01',
    mode_formation: 'AVEC_SESSION',
    statut: 'ACTIVE',
  };

  const formationDemande = {
    id: 'f-02',
    mode_formation: 'A_LA_DEMANDE',
    statut: 'ACTIVE',
  };

  const validDto = {
    formation_id: 'f-01',
    date_ouverture: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString(),
    date_cloture: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
    date_debut: new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString(),
    date_fin: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    capacite: 20,
  };

  beforeEach(() => {
    mockSessionRepo = {
      findById: jest.fn(),
      findByFormation: jest.fn(),
      findDisponibles: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatut: jest.fn(),
      decrementerPlaces: jest.fn(),
      hasInscrits: jest.fn(),
      findChevauchements: jest.fn(),
      findSessionsATransitionner: jest.fn(),
      findSessionsAArchiver: jest.fn(),
    } as any;

    mockFormationRepo = {
      findById: jest.fn(),
      calculerInclus: jest.fn(),
    } as any;

    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;
    mockEmail = { sendNotification: jest.fn() } as any;

    service = new SessionService(mockSessionRepo, mockFormationRepo, mockAudit, mockEmail);
  });

  // RM-16 : cohérence chronologique
  describe('RM-16 — Cohérence chronologique des 4 dates', () => {
    it('rejette si date_cloture après date_debut', async () => {
      mockFormationRepo.findById.mockResolvedValue(formationAvecSession as any);
      mockSessionRepo.findChevauchements.mockResolvedValue([]);

      const dtoInvalide = {
        ...validDto,
        date_cloture: new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString(), // après date_debut
      };

      // La validation Zod bloque avant le service
      const { CreateSessionSchema } = require('../dto/session.dto');
      expect(() => CreateSessionSchema.parse(dtoInvalide)).toThrow();
    });

    it('accepte les 4 dates dans le bon ordre', async () => {
      mockFormationRepo.findById.mockResolvedValue(formationAvecSession as any);
      mockSessionRepo.findChevauchements.mockResolvedValue([]);
      mockSessionRepo.create.mockResolvedValue({ id: 's-01', ...validDto } as any);
      mockAudit.info.mockResolvedValue(undefined);

      await expect(service.create(validDto, 'user-01')).resolves.toBeDefined();
    });
  });

  // RM-17 : non-chevauchement
  describe('RM-17 — Non-chevauchement des sessions', () => {
    it('bloque si chevauchement détecté', async () => {
      mockFormationRepo.findById.mockResolvedValue(formationAvecSession as any);
      mockSessionRepo.findChevauchements.mockResolvedValue([{ id: 's-existing' }] as any);

      await expect(service.create(validDto, 'user-01')).rejects.toThrow('SESSION_OVERLAP');
    });

    it('accepte si aucun chevauchement', async () => {
      mockFormationRepo.findById.mockResolvedValue(formationAvecSession as any);
      mockSessionRepo.findChevauchements.mockResolvedValue([]);
      mockSessionRepo.create.mockResolvedValue({ id: 's-01' } as any);
      mockAudit.info.mockResolvedValue(undefined);

      await expect(service.create(validDto, 'user-01')).resolves.toBeDefined();
    });
  });

  // RM-20 : transitions automatiques scheduler
  describe('RM-20 — Transitions automatiques de statut', () => {
    it('transite PLANIFIEE → A_VENIR si date_ouverture dépassée', async () => {
      const sessionPlanifiee = {
        id: 's-01',
        statut: 'PLANIFIEE',
        date_ouverture: new Date(Date.now() - 1000), // passée
        date_cloture: new Date(Date.now() + 24 * 3600 * 1000),
        date_debut: new Date(Date.now() + 48 * 3600 * 1000),
        date_fin: new Date(Date.now() + 72 * 3600 * 1000),
      };

      mockSessionRepo.findSessionsATransitionner.mockResolvedValue([sessionPlanifiee] as any);
      mockSessionRepo.updateStatut.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      const count = await service.transitionnerStatuts();
      expect(count).toBe(1);
      expect(mockSessionRepo.updateStatut).toHaveBeenCalledWith('s-01', 'A_VENIR');
    });

    it('transite EN_COURS → CLOTUREE si date_fin dépassée', async () => {
      const sessionEnCours = {
        id: 's-02',
        statut: 'EN_COURS',
        date_ouverture: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        date_cloture: new Date(Date.now() - 20 * 24 * 3600 * 1000),
        date_debut: new Date(Date.now() - 15 * 24 * 3600 * 1000),
        date_fin: new Date(Date.now() - 1000), // passée
      };

      mockSessionRepo.findSessionsATransitionner.mockResolvedValue([sessionEnCours] as any);
      mockSessionRepo.updateStatut.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      const count = await service.transitionnerStatuts();
      expect(count).toBe(1);
      expect(mockSessionRepo.updateStatut).toHaveBeenCalledWith('s-02', 'CLOTUREE');
    });
  });

  // RM-21 : archivage sessions clôturées > 90j
  describe('RM-21 — Archivage sessions clôturées depuis > 90j', () => {
    it('archive les sessions éligibles', async () => {
      mockSessionRepo.findSessionsAArchiver.mockResolvedValue([
        { id: 's-old-01' }, { id: 's-old-02' }
      ] as any);
      mockSessionRepo.updateStatut.mockResolvedValue({} as any);
      mockAudit.info.mockResolvedValue(undefined);

      const count = await service.archiverSessionsAnciennnes();
      expect(count).toBe(2);
      expect(mockSessionRepo.updateStatut).toHaveBeenCalledTimes(2);
    });
  });

  // RM-24 : notification si inscrits lors d'une modification
  describe('RM-24 — Signal notification si inscrits', () => {
    it('retourne notification_requise=true si inscrits', async () => {
      const session = {
        id: 's-01',
        formation_id: 'f-01',
        statut: 'INSCRIPTIONS_OUVERTES',
        date_ouverture: new Date(Date.now() - 5 * 24 * 3600 * 1000),
        date_cloture: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        date_debut: new Date(Date.now() + 10 * 24 * 3600 * 1000),
        date_fin: new Date(Date.now() + 20 * 24 * 3600 * 1000),
      };

      mockSessionRepo.findById.mockResolvedValue(session as any);
      mockSessionRepo.hasInscrits.mockResolvedValue(true);
      mockSessionRepo.findChevauchements.mockResolvedValue([]);
      mockSessionRepo.update.mockResolvedValue(session as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.update('s-01', {}, 'user-01');
      expect(result.notification_requise).toBe(true);
    });
  });

  // RM-25 : planification annuelle
  describe('RM-25 — Planification annuelle en masse', () => {
    it('crée N sessions sans chevauchement', async () => {
      mockFormationRepo.findById.mockResolvedValue(formationAvecSession as any);
      mockSessionRepo.findChevauchements.mockResolvedValue([]);
      mockSessionRepo.create.mockResolvedValue({ id: 's-new' } as any);
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.planifierAnnuelle({
        formation_id: 'f-01',
        premiere_date_ouverture: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        frequence_semaines: 4,
        nb_sessions: 3,
        duree_inscription_jours: 14,
        duree_session_jours: 5,
        capacite: 20,
      }, 'user-01');

      expect(result.sessions_creees).toBe(3);
    });
  });

  // RM-96 : pas de session pour formations à la demande
  describe('RM-96 — Session impossible sur formation à la demande', () => {
    it('bloque la création de session sur formation à la demande', async () => {
      mockFormationRepo.findById.mockResolvedValue(formationDemande as any);

      await expect(
        service.create({ ...validDto, formation_id: 'f-02' }, 'user-01')
      ).rejects.toThrow('SESSION_IMPOSSIBLE_FORMATION_DEMANDE');
    });
  });
});
