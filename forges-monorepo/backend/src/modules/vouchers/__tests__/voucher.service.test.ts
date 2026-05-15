import { PrismaClient } from '@prisma/client';
import { VoucherRepository } from '../voucher.repository';
import { VoucherService } from '../voucher.service';
import { AuditLogger } from '../../../shared/audit/audit.logger';

describe('VoucherService', () => {
  let service: VoucherService;
  let mockRepo: jest.Mocked<VoucherRepository>;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockEmail: { sendVouchersOrganisation: jest.Mock };

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as any;

    mockAudit = {
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    } as any;

    mockPrisma = {
      organisation: {
        findUnique: jest.fn(),
      },
      devis: {
        findUnique: jest.fn(),
      },
      formation: {
        findUnique: jest.fn(),
      },
      voucherApporteur: {
        findUnique: jest.fn(),
      },
      voucherOrganisation: {
        findUnique: jest.fn(),
      },
      apporteur: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      dossier: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      paiement: {
        findFirst: jest.fn(),
      },
    } as any;

    mockEmail = {
      sendVouchersOrganisation: jest.fn().mockResolvedValue(undefined),
    };

    service = new VoucherService(mockRepo, mockAudit, mockPrisma, mockEmail as any);
  });

  it('valide un voucher promotionnel brouillon', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'voucher-01',
      type: 'PROMOTIONNEL',
      statut: 'BROUILLON',
    } as any);
    mockRepo.update.mockResolvedValue({
      id: 'voucher-01',
      type: 'PROMOTIONNEL',
      statut: 'ACTIF',
    } as any);

    await expect(service.validateVoucherPromotionnel('voucher-01', 'superviseur-01')).resolves.toEqual(expect.objectContaining({
      id: 'voucher-01',
      statut: 'ACTIF',
    }));

    expect(mockRepo.update).toHaveBeenCalledWith('voucher-01', expect.objectContaining({
      statut: 'ACTIF',
      valide_par: 'superviseur-01',
    }));
    expect(mockAudit.info).toHaveBeenCalledWith('VOUCHER_PROMOTIONNEL_VALIDE', {
      voucher_id: 'voucher-01',
      superviseur_id: 'superviseur-01',
    });
  });

  it('refuse un voucher promotionnel brouillon', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'voucher-02',
      type: 'PROMOTIONNEL',
      statut: 'BROUILLON',
    } as any);
    mockRepo.update.mockResolvedValue({
      id: 'voucher-02',
      type: 'PROMOTIONNEL',
      statut: 'REFUSE',
    } as any);

    await expect(service.rejectVoucherPromotionnel('voucher-02', 'superviseur-01', 'Motif')).resolves.toEqual(expect.objectContaining({
      id: 'voucher-02',
      statut: 'REFUSE',
    }));

    expect(mockRepo.update).toHaveBeenCalledWith('voucher-02', expect.objectContaining({
      statut: 'REFUSE',
      valide_par: 'superviseur-01',
      motif_refus: 'Motif',
    }));
    expect(mockAudit.info).toHaveBeenCalledWith('VOUCHER_PROMOTIONNEL_REFUSE', {
      voucher_id: 'voucher-02',
      superviseur_id: 'superviseur-01',
      motif: 'Motif',
    });
  });

  it('calcule une réduction promotionnelle pour un voucher montant', async () => {
    (mockPrisma.voucherOrganisation.findUnique as jest.Mock).mockResolvedValue({
      id: 'voucher-03',
      formation_id: 'formation-01',
      statut: 'ACTIF',
      quota_utilise: 0,
      quota_max: 5,
      date_expiration: new Date(Date.now() + 86_400_000),
      type: 'PROMOTIONNEL',
      type_valeur: 'MONTANT',
      valeur: 15000,
      formation: { cout_catalogue: 100000 },
    } as any);

    await expect(service.validateVoucher('CODE-1', 'formation-01', 'app-01')).resolves.toEqual(expect.objectContaining({
      voucher_id: 'voucher-03',
      montant_reduit: 85000,
      quota_restant: 5,
    }));
  });

  it('rejette le cumul voucher et code apporteur', async () => {
    (mockPrisma.apporteur.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.apporteur.findFirst as jest.Mock).mockResolvedValue({ id: 'apporteur-01', statut: 'ACTIF' } as any);
    (mockPrisma.paiement.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.dossier.findUnique as jest.Mock).mockResolvedValue({
      voucher_code: 'voucher-01',
      paiement: { code_apporteur_id: null },
    } as any);
    (mockPrisma.voucherApporteur.findUnique as jest.Mock).mockResolvedValue({
      id: 'voucher-01',
      apporteur: { id: 'apporteur-01', statut: 'ACTIF' },
    } as any);

    await expect(
      service.checkApporteurCode('CODE-1', { dossier_id: 'dossier-01' })
    ).rejects.toThrow('VOUCHER_CUMUL_INTERDIT');
  });

  it('liait un voucher manuel a un devis valide de la meme organisation et formation', async () => {
    (mockPrisma.devis.findUnique as jest.Mock).mockResolvedValue({
      id: 'devis-01',
      organisation_id: 'org-01',
      formation_id: 'formation-01',
      statut: 'CREE',
    } as any);
    (mockPrisma.organisation.findUnique as jest.Mock).mockResolvedValue({
      id: 'org-01',
      raison_sociale: 'Org Test',
      email: 'org@test.ci',
      langue_preferee: 'FR',
      statut: 'ACTIF',
    } as any);
    (mockPrisma.formation.findUnique as jest.Mock).mockResolvedValue({
      id: 'formation-01',
      intitule: 'Formation Test',
    } as any);
    (mockRepo.create as jest.Mock).mockResolvedValue({
      id: 'voucher-04',
      code: 'V-04',
      organisation_id: 'org-01',
      formation_id: 'formation-01',
      devis_id: 'devis-01',
    } as any);

    await expect(service.createVoucher({
      formation_id: 'formation-01',
      devis_id: 'devis-01',
      valeur: 10000,
      type_valeur: 'MONTANT',
      quota_max: 1,
      date_expiration: new Date(Date.now() + 86_400_000),
    }, 'admin-01')).resolves.toEqual(expect.objectContaining({
      devis_id: 'devis-01',
    }));

    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      devis_id: 'devis-01',
    }));
    expect(mockPrisma.organisation.findUnique).toHaveBeenCalledWith({
      where: { id: 'org-01' },
    });
    expect(mockEmail.sendVouchersOrganisation).not.toHaveBeenCalled();
  });

  it('envoie un mail pour un voucher manuel sans devis', async () => {
    (mockPrisma.organisation.findUnique as jest.Mock).mockResolvedValue({
      id: 'org-01',
      raison_sociale: 'Org Test',
      email: 'org@test.ci',
      langue_preferee: 'FR',
      statut: 'ACTIF',
    } as any);
    (mockPrisma.formation.findUnique as jest.Mock).mockResolvedValue({
      id: 'formation-01',
      intitule: 'Formation Test',
    } as any);
    (mockRepo.create as jest.Mock).mockResolvedValue({
      id: 'voucher-05',
      code: 'V-05',
      organisation_id: 'org-01',
      formation_id: 'formation-01',
      devis_id: null,
    } as any);

    await service.createVoucher({
      formation_id: 'formation-01',
      valeur: 10000,
      type_valeur: 'MONTANT',
      quota_max: 1,
      date_expiration: new Date(Date.now() + 86_400_000),
    }, 'admin-01');

    expect(mockEmail.sendVouchersOrganisation).toHaveBeenCalledWith(
      'org@test.ci',
      ['V-05'],
      'Formation Test',
      'Org Test'
    );
  });

  describe('getUtilisateurs', () => {
    it('retourne la liste des apprenants ayant utilisé le voucher', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'voucher-01', code: 'CODE-ORG-01', type: 'ORGANISATION' } as any);
      (mockPrisma.dossier.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'dossier-01',
          statut: 'PAYE',
          created_at: new Date('2026-05-01'),
          apprenant: { id: 'app-01', nom: 'DOGBA', prenoms: 'Benjamin', email: 'dogba@test.ci' },
        },
        {
          id: 'dossier-02',
          statut: 'RETENU',
          created_at: new Date('2026-05-02'),
          apprenant: { id: 'app-02', nom: 'DJE', prenoms: 'Hiba', email: 'dje@test.ci' },
        },
      ]);

      const result = await service.getUtilisateurs('voucher-01');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        dossier_id: 'dossier-01',
        statut: 'PAYE',
        date_utilisation: new Date('2026-05-01'),
        apprenant: { id: 'app-01', nom: 'DOGBA', prenoms: 'Benjamin', email: 'dogba@test.ci' },
      });
      expect(mockPrisma.dossier.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { OR: [{ voucher_organisation_id: 'voucher-01' }, { voucher_code: 'CODE-ORG-01' }] },
      }));
    });

    it('lève VOUCHER_NOT_FOUND si le voucher n\'existe pas', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.getUtilisateurs('inexistant')).rejects.toThrow('VOUCHER_NOT_FOUND');
    });

    it('retourne une liste vide si aucun dossier n\'utilise le voucher', async () => {
      mockRepo.findById.mockResolvedValue({ id: 'voucher-01', code: 'CODE-ORG-01', type: 'ORGANISATION' } as any);
      (mockPrisma.dossier.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getUtilisateurs('voucher-01');
      expect(result).toEqual([]);
    });
  });
});
