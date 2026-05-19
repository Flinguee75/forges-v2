import { AdminService } from '../admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockEmail: any;

  beforeEach(() => {
    mockPrisma = {
      apprenant: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      organisation: { findUnique: jest.fn().mockResolvedValue(null) },
      partenaire: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      apporteur: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      dossier: { count: jest.fn() },
    };
    mockAudit = { info: jest.fn(), warning: jest.fn() };
    mockEmail = {
      sendTempPassword: jest.fn(),
      sendTempPasswordBackoffice: jest.fn(),
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
      mockEmail.sendTempPasswordBackoffice.mockResolvedValue(undefined);

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
      expect(mockEmail.sendTempPasswordBackoffice).toHaveBeenCalledWith(
        'admin@test.ci',
        'Jane',
        expect.any(String),
        'ADMIN'
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
        where: {
          statut: { not: 'INACTIF' },
          role: { notIn: ['ADMIN', 'SUPERVISEUR', 'RESPONSABLE', 'AGENT', 'GESTIONNAIRE'] },
        },
        select: { id: true, email: true, nom: true, prenoms: true, role: true, statut: true, created_at: true },
        skip: 0,
        take: 20,
        orderBy: { created_at: 'desc' },
      });
    });
  });

  describe('AdminService — Apporteurs backoffice (RM-141/142)', () => {
    const apporteurFixture = {
      id: 'apt-1',
      nom: 'Traore',
      type: 'INDIVIDU',
      email: 'traore@test.ci',
      pays: null,
      code_apporteur: 'uuid-perm',
      taux_commission_pct: 5,
      statut: 'ACTIF',
      date_inscription: new Date('2026-01-01'),
      _count: { commissions: 3 },
      voucher: null,
      commissions: [],
    };

    beforeEach(() => {
      mockPrisma.apporteur.findMany = jest.fn();
      mockPrisma.apporteur.count = jest.fn();
      mockPrisma.apporteur.update = jest.fn();
      mockPrisma.apporteur.findUnique.mockResolvedValue(null);
      service = new AdminService(mockPrisma, mockAudit, mockEmail);
    });

    describe('listApporteurs', () => {
      it('retourne la liste paginée avec commissions_count et meta', async () => {
        mockPrisma.apporteur.findMany.mockResolvedValue([apporteurFixture]);
        mockPrisma.apporteur.count.mockResolvedValue(1);

        const result = await service.listApporteurs(1, 20);

        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toMatchObject({
          id: 'apt-1',
          nom: 'Traore',
          commissions_count: 3,
          voucher: null,
        });
        expect(result.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
      });

      it('appelle findMany sans filtre quand search est absent', async () => {
        mockPrisma.apporteur.findMany.mockResolvedValue([]);
        mockPrisma.apporteur.count.mockResolvedValue(0);

        await service.listApporteurs(1, 20);

        expect(mockPrisma.apporteur.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: {} })
        );
        expect(mockPrisma.apporteur.count).toHaveBeenCalledWith({ where: {} });
      });

      it('appelle findMany avec filtre OR insensible à la casse quand search est fourni', async () => {
        mockPrisma.apporteur.findMany.mockResolvedValue([]);
        mockPrisma.apporteur.count.mockResolvedValue(0);

        await service.listApporteurs(1, 20, 'traore');

        const expectedWhere = {
          OR: [
            { nom: { contains: 'traore', mode: 'insensitive' } },
            { email: { contains: 'traore', mode: 'insensitive' } },
            { code_apporteur: { contains: 'traore', mode: 'insensitive' } },
          ],
        };
        expect(mockPrisma.apporteur.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: expectedWhere })
        );
        expect(mockPrisma.apporteur.count).toHaveBeenCalledWith({ where: expectedWhere });
      });

      it('calcule le skip correct pour la page 2', async () => {
        mockPrisma.apporteur.findMany.mockResolvedValue([]);
        mockPrisma.apporteur.count.mockResolvedValue(25);

        const result = await service.listApporteurs(2, 10);

        expect(mockPrisma.apporteur.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 10, take: 10 })
        );
        expect(result.meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
      });

      it('retourne totalPages = 1 quand total est 0', async () => {
        mockPrisma.apporteur.findMany.mockResolvedValue([]);
        mockPrisma.apporteur.count.mockResolvedValue(0);

        const result = await service.listApporteurs();

        expect(result.meta.totalPages).toBe(1);
      });
    });

    describe('getApporteurById', () => {
      it('retourne l\'apporteur quand il existe', async () => {
        mockPrisma.apporteur.findUnique.mockResolvedValue(apporteurFixture);

        const result = await service.getApporteurById('apt-1');

        expect(result).toEqual(apporteurFixture);
        expect(mockPrisma.apporteur.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: 'apt-1' } })
        );
      });

      it('lève APPORTEUR_NOT_FOUND si l\'apporteur est introuvable', async () => {
        mockPrisma.apporteur.findUnique.mockResolvedValue(null);

        await expect(service.getApporteurById('inexistant')).rejects.toThrow('APPORTEUR_NOT_FOUND');
      });

      it('inclut les commissions et le voucher dans la requête', async () => {
        mockPrisma.apporteur.findUnique.mockResolvedValue(apporteurFixture);

        await service.getApporteurById('apt-1');

        expect(mockPrisma.apporteur.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.objectContaining({
              commissions: expect.any(Object),
              voucher: expect.any(Object),
            }),
          })
        );
      });
    });

    describe('approveApporteur', () => {
      it('met à jour le statut à ACTIF et logue l\'audit', async () => {
        const updated = { ...apporteurFixture, statut: 'ACTIF' };
        mockPrisma.apporteur.findUnique.mockResolvedValue(apporteurFixture);
        mockPrisma.apporteur.update.mockResolvedValue(updated);
        mockAudit.info.mockResolvedValue(undefined);

        const result = await service.approveApporteur('apt-1', 'admin-id');

        expect(result).toEqual(updated);
        expect(mockPrisma.apporteur.update).toHaveBeenCalledWith({
          where: { id: 'apt-1' },
          data: { statut: 'ACTIF' },
        });
        expect(mockAudit.info).toHaveBeenCalledWith('APPORTEUR_APPROUVE', {
          apporteur_id: 'apt-1',
          admin_id: 'admin-id',
        });
      });

      it('lève APPORTEUR_NOT_FOUND si l\'apporteur est introuvable', async () => {
        mockPrisma.apporteur.findUnique.mockResolvedValue(null);

        await expect(service.approveApporteur('inexistant', 'admin-id')).rejects.toThrow('APPORTEUR_NOT_FOUND');
        expect(mockPrisma.apporteur.update).not.toHaveBeenCalled();
      });

      it('n\'appelle pas l\'audit en cas d\'apporteur introuvable', async () => {
        mockPrisma.apporteur.findUnique.mockResolvedValue(null);

        await expect(service.approveApporteur('inexistant', 'admin-id')).rejects.toThrow();
        expect(mockAudit.info).not.toHaveBeenCalled();
      });
    });
  });
});
