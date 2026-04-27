import { RapportService } from '../rapport.service';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('RapportService', () => {
  let service: RapportService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let mockAudit: jest.Mocked<AuditLogger>;

  beforeEach(() => {
    prisma = createPrismaMock();
    mockAudit = { info: jest.fn(), warning: jest.fn(), error: jest.fn() } as any;
    service = new RapportService(prisma, mockAudit);
  });

  it('génère un rapport bailleur avec agrégats et bénéficiaires', async () => {
    prisma.organisation.findUnique.mockResolvedValue({
      raison_sociale: 'ORG TEST',
      contact_referent: 'Referent',
      pays: 'CI',
    } as any);
    prisma.dossier.findMany.mockResolvedValue([
      {
        statut: 'PAYE',
        created_at: new Date('2026-01-05'),
        apprenant: { prenoms: 'Jane', nom: 'Doe', email: 'jane@test.ci' },
        formation: { intitule: 'Formation 1' },
        paiement: { confirmed_at: new Date('2026-01-06') },
      },
      {
        statut: 'RETENU',
        created_at: new Date('2026-01-07'),
        apprenant: { prenoms: 'John', nom: 'Doe', email: 'john@test.ci' },
        formation: { intitule: 'Formation 2' },
        paiement: null,
      },
    ] as any);
    prisma.dossier.groupBy.mockResolvedValue([
      { statut: 'PAYE', _count: 1 },
      { statut: 'RETENU', _count: 1 },
      { statut: 'EN_ATTENTE_VERIFICATION', _count: 0 },
    ] as any);
    mockAudit.info.mockResolvedValue(undefined);

    const result = await service.genererRapportBailleur('org-01', {
      debut: new Date('2026-01-01'),
      fin: new Date('2026-01-31'),
      formation_id: 'formation-01',
    });

    expect(result).toMatchObject({
      organisation: {
        raison_sociale: 'ORG TEST',
        contact_referent: 'Referent',
        pays: 'CI',
      },
      statistiques: {
        total_beneficiaires: 2,
        paies: 1,
        en_cours: 1,
        en_attente: 0,
        taux_completion: 50,
      },
    });
    expect(mockAudit.info).toHaveBeenCalledWith('RAPPORT_PDF_GENERE', {
      organisation_id: 'org-01',
      nb_beneficiaires: 2,
    });
  });

  it('retourne un taux de completion nul sans dossier', async () => {
    prisma.organisation.findUnique.mockResolvedValue({ raison_sociale: 'ORG TEST' } as any);
    prisma.dossier.findMany.mockResolvedValue([]);
    prisma.dossier.groupBy.mockResolvedValue([]);
    mockAudit.info.mockResolvedValue(undefined);

    const result = await service.genererRapportBailleur('org-01');

    expect(result).toMatchObject({
      statistiques: {
        total_beneficiaires: 0,
        taux_completion: 0,
      },
    });
  });
});
