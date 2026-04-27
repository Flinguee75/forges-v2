import { BotRepository } from '../bot.repository';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('BotRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: BotRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new BotRepository(prisma);
  });

  it('gère les sessions conversation bot', async () => {
    prisma.conversationBot.create.mockResolvedValue({ id: 'session-01' });
    prisma.conversationBot.findUnique.mockResolvedValue({ id: 'session-01' });
    prisma.conversationBot.update.mockResolvedValue({ id: 'session-01', statut: 'TERMINEE' });
    prisma.conversationBot.findFirst.mockResolvedValue({ dernier_refus_upgrade_le: new Date(), nb_refus_upgrade: 2 } as any);

    await expect(repository.creerSession({
      utilisateur_id: 'app-01',
      type_utilisateur: 'APPRENANT',
      flux_actif: 'ORIENTATION',
      langue: 'FR',
    })).resolves.toEqual({ id: 'session-01' });
    await expect(repository.findSession('session-01')).resolves.toEqual({ id: 'session-01' });
    await expect(repository.updateSession('session-01', { historique: [] })).resolves.toEqual({ id: 'session-01', statut: 'TERMINEE' });
    await expect(repository.cloturerSession('session-01', 'TERMINEE')).resolves.toEqual({ id: 'session-01', statut: 'TERMINEE' });
    await expect(repository.findDernierRefusUpgrade('app-01')).resolves.toEqual(expect.objectContaining({ nb_refus_upgrade: 2 }));
  });

  describe('findSessionActive', () => {
    it('retourne la session active de l\'utilisateur', async () => {
      const mockSession = { id: 'session-01', utilisateur_id: 'app-01', statut: 'EN_COURS' };
      prisma.conversationBot.findFirst.mockResolvedValue(mockSession as any);

      const result = await repository.findSessionActive('app-01');

      expect(prisma.conversationBot.findFirst).toHaveBeenCalledWith({
        where: {
          utilisateur_id: 'app-01',
          statut: 'EN_COURS'
        },
        orderBy: { date_debut: 'desc' }
      });
      expect(result).toEqual(mockSession);
    });

    it('retourne null si aucune session active', async () => {
      prisma.conversationBot.findFirst.mockResolvedValue(null);

      const result = await repository.findSessionActive('app-01');

      expect(result).toBeNull();
    });
  });

  it('vérifie l existence d un feedback et trouve les sessions sans feedback', async () => {
    prisma.feedbackFormation.count.mockResolvedValue(1);
    prisma.feedbackFormation.findMany.mockResolvedValue([{ formation_id: 'formation-02' }] as any);
    prisma.dossier.findMany.mockResolvedValue([{ id: 'dossier-01' }] as any);

    await expect(repository.feedbackExiste('app-01', 'formation-01')).resolves.toBe(true);
    await expect(repository.findSessionsSansFeedback('app-01')).resolves.toEqual([{ id: 'dossier-01' }]);
  });

  it('enregistre un feedback et une enquête avec incrément de fréquence', async () => {
    prisma.feedbackFormation.create.mockResolvedValue({ id: 'feedback-01' });
    prisma.enqueteCatalogue.findFirst.mockResolvedValueOnce({ id: 'enquete-01' } as any).mockResolvedValueOnce(null);
    prisma.enqueteCatalogue.update.mockResolvedValue({ id: 'enquete-01', frequence_demande: 2 } as any);
    prisma.enqueteCatalogue.create.mockResolvedValue({ id: 'enquete-02', frequence_demande: 1 } as any);

    await expect(repository.enregistrerFeedback({
      apprenant_id: 'app-01',
      formation_id: 'formation-01',
      note_globale: 5,
      recommande: true,
      session_bot_id: 'session-01',
    })).resolves.toEqual({ id: 'feedback-01' });

    await expect(repository.enregistrerEnquete({
      utilisateur_id: 'app-01',
      type_utilisateur: 'APPRENANT',
      domaine: 'IT',
      niveau: 'Débutant',
      volume: '1-5',
      session_bot_id: 'session-01',
    })).resolves.toEqual({ id: 'enquete-01', frequence_demande: 2 });

    await expect(repository.enregistrerEnquete({
      utilisateur_id: 'app-01',
      type_utilisateur: 'APPRENANT',
      domaine: 'Finance',
      niveau: 'Débutant',
      volume: '1-5',
      session_bot_id: 'session-01',
    })).resolves.toEqual({ id: 'enquete-02', frequence_demande: 1 });
  });

  it('filtre les formations du catalogue bot', async () => {
    prisma.formation.findMany.mockResolvedValue([{ id: 'formation-01' }] as any);

    await expect(repository.filtrerFormations({
      type_formation: ['STANDARD'],
      langue: 'FR',
      inclus_abonnement: true,
      limit: 3,
    })).resolves.toEqual([{ id: 'formation-01' }]);

    expect(prisma.formation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        statut: 'ACTIVE',
        type_formation: { in: ['STANDARD'] },
        langues_disponibles: { has: 'FR' },
        inclus_abonnement: true,
      }),
      take: 3,
    }));
  });
});
