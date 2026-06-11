import { BotService } from '../bot.service';
import { BotEngineService } from '../bot-engine.service';

describe('BotService — demarrerSessionApprenant', () => {
  const mockRepo = {
    findSessionActive: jest.fn().mockResolvedValue(null),
    findSessionsSansFeedback: jest.fn().mockResolvedValue([]),
    findDernierRefusUpgrade: jest.fn().mockResolvedValue(null),
    creerSession: jest.fn().mockResolvedValue({ id: 'sess1' }),
    updateSession: jest.fn(),
    getProfilApprenant: jest.fn().mockResolvedValue({
      type_apprenant: 'PROFESSIONNEL',
      secteur_activite: 'IT',
      langue_preferee: 'FR',
      abonnement_retail: null,
    }),
    getProfilOrganisation: jest.fn(),
    getAbonnementB2B: jest.fn(),
    countApprenantsActifsOrganisation: jest.fn(),
  } as any;

  const mockEngine = new BotEngineService(mockRepo, {} as any);
  const mockAudit = { info: jest.fn().mockResolvedValue(undefined) } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo.findSessionsSansFeedback.mockResolvedValue([]);
    mockRepo.findDernierRefusUpgrade.mockResolvedValue(null);
    mockRepo.creerSession.mockResolvedValue({ id: 'sess1' });
    mockRepo.getProfilApprenant.mockResolvedValue({
      type_apprenant: 'PROFESSIONNEL',
      secteur_activite: 'IT',
      langue_preferee: 'FR',
      abonnement_retail: null,
    });
  });

  it('creates a session without PrismaClient in constructor', async () => {
    const service = new BotService(mockRepo, mockEngine, mockAudit);
    const result = await service.demarrerSessionApprenant('a1', 'FR');

    expect(mockRepo.getProfilApprenant).toHaveBeenCalledWith('a1');
    expect(mockRepo.creerSession).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty('session_id');
  });

  it('returns PROFIL_INCOMPLET when secteur_activite missing for PROFESSIONNEL', async () => {
    mockRepo.getProfilApprenant.mockResolvedValueOnce({
      type_apprenant: 'PROFESSIONNEL',
      secteur_activite: null,
      langue_preferee: 'FR',
      abonnement_retail: null,
    });

    const service = new BotService(mockRepo, mockEngine, mockAudit);
    const result = await service.demarrerSessionApprenant('a1', 'FR');

    expect(result.flux).toBe('PROFIL_INCOMPLET');
    expect(mockRepo.creerSession).not.toHaveBeenCalled();
  });
});

describe('BotService — demarrerSessionOrganisation', () => {
  const mockRepo = {
    findSessionsSansFeedback: jest.fn().mockResolvedValue([]),
    findDernierRefusUpgrade: jest.fn().mockResolvedValue(null),
    creerSession: jest.fn().mockResolvedValue({ id: 'sess2' }),
    getProfilApprenant: jest.fn(),
    getProfilOrganisation: jest.fn().mockResolvedValue({ langue_preferee: 'FR' }),
    getAbonnementB2B: jest.fn().mockResolvedValue(null),
    countApprenantsActifsOrganisation: jest.fn().mockResolvedValue(5),
  } as any;

  const mockEngine = new BotEngineService(mockRepo, {} as any);
  const mockAudit = { info: jest.fn().mockResolvedValue(undefined) } as any;

  it('creates a session for organisation with a conseil menu when no triggers', async () => {
    const service = new BotService(mockRepo, mockEngine, mockAudit);
    const result = await service.demarrerSessionOrganisation('o1', 'FR');

    expect(mockRepo.getProfilOrganisation).toHaveBeenCalledWith('o1');
    expect(mockRepo.getAbonnementB2B).toHaveBeenCalledWith('o1');
    expect(mockRepo.countApprenantsActifsOrganisation).toHaveBeenCalledWith('o1');
    expect(result.flux).toBe('CONSEIL');
    expect((result as any).question).toEqual(expect.objectContaining({
      id: 1,
      options: expect.arrayContaining(['Abonnement', 'Employés', 'Vouchers', 'Paiements', 'Autre']),
    }));
  });
});
