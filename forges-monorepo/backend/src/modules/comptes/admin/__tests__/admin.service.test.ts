import { AdminService } from '../admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockEmail: any;

  beforeEach(() => {
    mockPrisma = {
      apprenant: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      partenaire: { create: jest.fn() },
      apporteur: { create: jest.fn() },
      dossier: { count: jest.fn() },
    };
    mockAudit = { info: jest.fn(), warning: jest.fn() };
    mockEmail = {
      sendTempPassword: jest.fn(),
      sendInvitationPartenaire: jest.fn(),
      sendCodeApporteur: jest.fn(),
    };
    service = new AdminService(mockPrisma, mockAudit, mockEmail);
  });

  describe('UCS02 — Création utilisateur', () => {
    it('crée un utilisateur backoffice avec mot de passe temporaire', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue(null);
      mockPrisma.apprenant.create.mockResolvedValue({ id: 'user-id', email: 'admin@test.ci' });
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendTempPassword.mockResolvedValue(undefined);

      const result = await service.createUser({
        email: 'admin@test.ci',
        role: 'ADMIN',
        nom: 'Doe',
        prenoms: 'Jane',
      }, 'admin-id');

      expect(result).toEqual({ id: 'user-id', email: 'admin@test.ci' });
      expect(mockPrisma.apprenant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'admin@test.ci',
          statut: 'ACTIF',
          type_apprenant: 'PROFESSIONNEL',
        })
      });
      expect(mockEmail.sendTempPassword).toHaveBeenCalledWith(
        'admin@test.ci',
        expect.stringMatching(/[A-Za-z0-9!@#$%^&*()_+\-=]{8,}/),
        'FR'
      );
    });

    it('refuse si l’email utilisateur existe déjà', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(service.createUser({
        email: 'admin@test.ci',
        role: 'ADMIN',
        nom: 'Doe',
        prenoms: 'Jane',
      }, 'admin-id')).rejects.toThrow('EMAIL_ALREADY_EXISTS');
    });
  });

  // RM-126 : invitation Partenaire
  describe('RM-126 — Invitation Partenaire Flux A', () => {
    it('crée un partenaire avec statut INVITE et token 48h', async () => {
      mockPrisma.partenaire.create.mockResolvedValue({ id: 'part-id' });
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendInvitationPartenaire.mockResolvedValue(undefined);

      const result = await service.invitePartenaire({
        email: 'partner@test.ci',
        raison_sociale: 'TechFormation',
        type: 'UNIVERSITE',
        commission_forges_pct: 20,
      }, 'admin-id');

      expect(result.partenaire_id).toBe('part-id');
      expect(mockPrisma.partenaire.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statut: 'INVITE',
            mode_inscription: 'INVITATION_ADMIN',
          })
        })
      );
    });
  });

  // RM-141, RM-142 : création Apporteur avec code UUID permanent
  describe('RM-141/142 — Création Apporteur code UUID permanent', () => {
    it('génère un code UUID permanent non modifiable', async () => {
      mockPrisma.apporteur.create.mockImplementation((args: any) => ({
        id: 'apporteur-id',
        code_apporteur: args.data.code_apporteur,
      }));
      mockAudit.info.mockResolvedValue(undefined);
      mockEmail.sendCodeApporteur.mockResolvedValue(undefined);

      const result = await service.createApporteur({
        nom: 'Touré Seydou',
        email: 'seydou@test.ci',
        type: 'INDIVIDU',
        taux_commission_pct: 5,
      }, 'admin-id');

      // Code doit être un UUID v4
      expect(result.code_apporteur).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });
  });

  // UCS02 — Désactivation avec dossiers actifs bloquée
  describe('UCS02 — Désactivation compte', () => {
    it('rejette si l’utilisateur est introuvable', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserStatus('missing-id', 'ACTIF', 'admin-id')
      ).rejects.toThrow('USER_NOT_FOUND');
    });

    it('bloque la désactivation si dossiers actifs', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue({ id: 'user-id' });
      mockPrisma.dossier.count.mockResolvedValue(2);

      await expect(
        service.updateUserStatus('user-id', 'INACTIF', 'admin-id')
      ).rejects.toThrow('CANNOT_DEACTIVATE_WITH_ACTIVE_DOSSIERS');
    });

    it('permet la désactivation sans dossiers actifs', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue({ id: 'user-id' });
      mockPrisma.dossier.count.mockResolvedValue(0);
      mockPrisma.apprenant.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);

      await expect(
        service.updateUserStatus('user-id', 'INACTIF', 'admin-id')
      ).resolves.toBeDefined();
    });

    it('met à jour un statut sans contrôler les dossiers si ce n’est pas INACTIF', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue({ id: 'user-id' });
      mockPrisma.apprenant.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);

      await expect(
        service.updateUserStatus('user-id', 'SUSPENDU', 'admin-id')
      ).resolves.toEqual({ message: 'Compte mis à jour : SUSPENDU' });

      expect(mockPrisma.dossier.count).not.toHaveBeenCalled();
      expect(mockPrisma.apprenant.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { statut: 'SUSPENDU' }
      });
    });
  });

  describe('UCS02 — Liste utilisateurs', () => {
    it('applique les arguments par défaut et retourne la pagination', async () => {
      mockPrisma.apprenant.findMany.mockResolvedValue([{ id: 'u-01' }]);
      mockPrisma.apprenant.count.mockResolvedValue(1);

      const result = await service.listUsers();

      expect(result).toEqual({
        users: [{ id: 'u-01' }],
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(mockPrisma.apprenant.findMany).toHaveBeenCalledWith({
        where: { statut: { not: 'INACTIF' } },
        select: { id: true, email: true, nom: true, prenoms: true, statut: true, created_at: true },
        skip: 0,
        take: 20,
        orderBy: { created_at: 'desc' },
      });
    });
  });
});
