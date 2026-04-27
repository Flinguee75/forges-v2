jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

import { hash } from 'bcrypt';
import { ImportCSVService } from '../import-csv.service';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('ImportCSVService', () => {
  let service: ImportCSVService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: jest.Mocked<EmailService>;

  beforeEach(() => {
    prisma = createPrismaMock();
    mockAudit = { info: jest.fn(), warning: jest.fn(), error: jest.fn() } as any;
    mockEmail = { sendTempPassword: jest.fn() } as any;
    (hash as jest.MockedFunction<typeof hash>).mockResolvedValue('hashed-password' as never);
    service = new ImportCSVService(prisma, mockAudit, mockEmail);
  });

  it('retourne un import vide si le CSV ne contient pas de données', async () => {
    mockAudit.info.mockResolvedValue(undefined);

    await expect(service.importerBeneficiaires('email,nom,prenoms', 'org-01', 'user-01')).resolves.toEqual({
      succes: 0,
      erreurs: 0,
      doublons: 0,
      rapport: [],
    });
  });

  it('gère les champs obligatoires manquants, les doublons et les succès', async () => {
    const csv = [
      'email,nom,prenoms,pays',
      ',Doe,Jane,CI',
      'duplicate@test.ci,Doe,Jane,CI',
      'new@test.ci,Doe,John,CI',
    ].join('\n');

    prisma.apprenant.findUnique
      .mockResolvedValueOnce({ id: 'existing-01' } as any)
      .mockResolvedValueOnce(null);
    prisma.apprenant.create.mockResolvedValue({ id: 'app-01' } as any);
    mockEmail.sendTempPassword.mockResolvedValue(undefined);
    mockAudit.info.mockResolvedValue(undefined);

    const result = await service.importerBeneficiaires(csv, 'org-01', 'user-01');

    expect(result.succes).toBe(1);
    expect(result.erreurs).toBe(1);
    expect(result.doublons).toBe(1);
    expect(prisma.apprenant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'new@test.ci',
        organisation_id: 'org-01',
        statut: 'ACTIF',
      }),
    });
    expect(mockEmail.sendTempPassword).toHaveBeenCalledWith('new@test.ci', expect.any(String), 'FR');
  });

  it('remonte les erreurs de création ligne par ligne et journalise le récapitulatif', async () => {
    const csv = [
      'email,nom,prenoms,pays',
      'broken@test.ci,Doe,Jane,CI',
    ].join('\n');

    prisma.apprenant.findUnique.mockResolvedValue(null);
    prisma.apprenant.create.mockRejectedValue(new Error('CREATE_FAILED'));
    mockAudit.info.mockResolvedValue(undefined);

    const result = await service.importerBeneficiaires(csv, 'org-01', 'user-01');

    expect(result).toEqual({
      succes: 0,
      erreurs: 1,
      doublons: 0,
      rapport: [
        { ligne: 2, email: 'broken@test.ci', statut: 'ERREUR', message: 'CREATE_FAILED' },
      ],
    });
    expect(mockAudit.info).toHaveBeenCalledWith('IMPORT_CSV_BENEFICIAIRES', {
      organisation_id: 'org-01',
      nb_lignes: 1,
      succes: 0,
      erreurs: 1,
      doublons: 0,
      user_id: 'user-01',
    });
  });
});
