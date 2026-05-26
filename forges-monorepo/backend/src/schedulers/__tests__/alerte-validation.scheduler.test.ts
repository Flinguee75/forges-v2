jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({ stop: jest.fn() })),
}));

const mockFormationPartenaireFindMany = jest.fn();
const mockApprenantFindUnique = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    formationPartenaire: { findMany: mockFormationPartenaireFindMany },
    apprenant: { findUnique: mockApprenantFindUnique },
  })),
}));

const mockSendJ5 = jest.fn();
const mockSendJ10 = jest.fn();
jest.mock('../../shared/email/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendAlerteValidationJ5: mockSendJ5,
    sendAlerteValidationJ10: mockSendJ10,
  })),
}));

const mockAuditInfo = jest.fn();
const mockAuditWarning = jest.fn();
const mockAuditError = jest.fn();
jest.mock('../../shared/audit/audit.logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({
    info: mockAuditInfo,
    warning: mockAuditWarning,
    error: mockAuditError,
  })),
}));

import { AlerteValidationScheduler } from '../alerte-validation.scheduler';

describe('AlerteValidationScheduler', () => {
  let scheduler: AlerteValidationScheduler;
  const NOW = new Date('2026-06-15T08:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendJ5.mockResolvedValue(undefined);
    mockSendJ10.mockResolvedValue(undefined);
    mockAuditInfo.mockResolvedValue(undefined);
    mockAuditWarning.mockResolvedValue(undefined);
    mockAuditError.mockResolvedValue(undefined);
    mockApprenantFindUnique.mockResolvedValue({ email: 'responsable@test.ci' });
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    const mockPrismaInstance = {
      formationPartenaire: { findMany: mockFormationPartenaireFindMany },
      apprenant: { findUnique: mockApprenantFindUnique },
    } as any;
    const mockEmailInstance = {
      sendAlerteValidationJ5: mockSendJ5,
      sendAlerteValidationJ10: mockSendJ10,
    } as any;
    const mockAuditInstance = {
      info: mockAuditInfo,
      warning: mockAuditWarning,
      error: mockAuditError,
    } as any;
    scheduler = new AlerteValidationScheduler(mockPrismaInstance, mockEmailInstance, mockAuditInstance);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('envoie alerte J+5 double destinataire (responsable + admin)', async () => {
    const dateSoumission = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
    mockFormationPartenaireFindMany.mockResolvedValue([
      {
        id: 'fp-1',
        date_soumission: dateSoumission,
        responsable_validateur_id: 'resp-1',
        partenaire_id: 'part-1',
        partenaire: { raison_sociale: 'ACME' },
        formation: { intitule: 'Formation X' },
      },
    ]);

    await scheduler.executeNow();

    expect(mockSendJ5).toHaveBeenCalledTimes(1);
    expect(mockSendJ10).not.toHaveBeenCalled();
    expect(mockAuditWarning).toHaveBeenCalledWith(
      'VALIDATION_DELAI_DEPASSE_J5',
      expect.objectContaining({ formation_id: 'fp-1', jours_ecoules: 5 })
    );
  });

  it('envoie escalade J+10 admin uniquement', async () => {
    const dateSoumission = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000);
    mockFormationPartenaireFindMany.mockResolvedValue([
      {
        id: 'fp-2',
        date_soumission: dateSoumission,
        responsable_validateur_id: 'resp-1',
        partenaire_id: 'part-1',
        partenaire: { raison_sociale: 'ACME' },
        formation: { intitule: 'Formation Y' },
      },
    ]);

    await scheduler.executeNow();

    expect(mockSendJ10).toHaveBeenCalledTimes(1);
    expect(mockSendJ5).not.toHaveBeenCalled();
    expect(mockAuditWarning).toHaveBeenCalledWith(
      'VALIDATION_DELAI_DEPASSE_J10',
      expect.objectContaining({ formation_id: 'fp-2', jours_ecoules: 10 })
    );
  });

  it('n\'envoie rien si joursEcoules != 5 et != 10', async () => {
    const dateSoumission = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
    mockFormationPartenaireFindMany.mockResolvedValue([
      {
        id: 'fp-3',
        date_soumission: dateSoumission,
        responsable_validateur_id: 'resp-1',
        partenaire_id: 'part-1',
        partenaire: { raison_sociale: 'ACME' },
        formation: { intitule: 'Formation Z' },
      },
    ]);

    await scheduler.executeNow();

    expect(mockSendJ5).not.toHaveBeenCalled();
    expect(mockSendJ10).not.toHaveBeenCalled();
  });

  it('gère plusieurs formations avec âges différents', async () => {
    const d5 = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
    const d10 = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000);
    const d3 = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000);

    mockFormationPartenaireFindMany.mockResolvedValue([
      { id: 'fp-a', date_soumission: d5, responsable_validateur_id: null, partenaire_id: 'p1', partenaire: { raison_sociale: 'A' }, formation: { intitule: 'F1' } },
      { id: 'fp-b', date_soumission: d10, responsable_validateur_id: null, partenaire_id: 'p2', partenaire: { raison_sociale: 'B' }, formation: { intitule: 'F2' } },
      { id: 'fp-c', date_soumission: d3, responsable_validateur_id: null, partenaire_id: 'p3', partenaire: { raison_sociale: 'C' }, formation: { intitule: 'F3' } },
    ]);

    await scheduler.executeNow();

    expect(mockSendJ5).toHaveBeenCalledTimes(1);
    expect(mockSendJ10).toHaveBeenCalledTimes(1);
  });

  it('utilise DEFAULT_RESPONSABLE_EMAIL si responsable_validateur_id null', async () => {
    process.env.DEFAULT_RESPONSABLE_EMAIL = 'fallback@test.ci';
    const d5 = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
    mockFormationPartenaireFindMany.mockResolvedValue([
      { id: 'fp-x', date_soumission: d5, responsable_validateur_id: null, partenaire_id: 'p1', partenaire: { raison_sociale: 'A' }, formation: { intitule: 'F1' } },
    ]);

    await scheduler.executeNow();

    expect(mockSendJ5).toHaveBeenCalledWith(
      'fallback@test.ci',
      expect.any(String),
      'F1',
      'A',
      expect.any(String),
      'fp-x',
      'FR'
    );
    expect(mockApprenantFindUnique).not.toHaveBeenCalled();
  });

  it('continue après erreur sur une formation (logge l\'erreur)', async () => {
    const d5 = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
    mockFormationPartenaireFindMany.mockResolvedValue([
      { id: 'fp-err', date_soumission: d5, responsable_validateur_id: null, partenaire_id: 'p1', partenaire: { raison_sociale: 'A' }, formation: { intitule: 'F1' } },
      { id: 'fp-ok', date_soumission: d5, responsable_validateur_id: null, partenaire_id: 'p2', partenaire: { raison_sociale: 'B' }, formation: { intitule: 'F2' } },
    ]);
    mockSendJ5.mockRejectedValueOnce(new Error('SMTP_DOWN')).mockResolvedValueOnce(undefined);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await scheduler.executeNow();

    expect(mockSendJ5).toHaveBeenCalledTimes(2);
    expect(mockAuditError).toHaveBeenCalledWith(
      'ALERTE_VALIDATION_ERROR',
      expect.objectContaining({ formation_id: 'fp-err' })
    );
    consoleSpy.mockRestore();
  });
});
