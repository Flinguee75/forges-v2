import { OrganisationRepository } from '../organisation.repository';
import { createPrismaMock } from '../../../../__tests__/helpers/prisma';

describe('OrganisationRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: OrganisationRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new OrganisationRepository(prisma);
  });

  it('cherche une organisation par email, id et identifiant légal', async () => {
    prisma.organisation.findUnique
      .mockResolvedValueOnce({ id: 'org-01' })
      .mockResolvedValueOnce({ id: 'org-02' });
    prisma.organisation.findFirst.mockResolvedValue({ id: 'org-03' });

    await expect(repository.findByEmail('ORG@TEST.CI')).resolves.toEqual({ id: 'org-01' });
    await expect(repository.findById('org-02')).resolves.toEqual({ id: 'org-02' });
    await expect(repository.findByIdentifiantLegal('CI-RCCM-1', 'ENTREPRISE')).resolves.toEqual({ id: 'org-03' });

    expect(prisma.organisation.findUnique).toHaveBeenNthCalledWith(1, {
      where: { email: 'org@test.ci' },
    });
    expect(prisma.organisation.findUnique).toHaveBeenNthCalledWith(2, {
      where: { id: 'org-02' },
    });
    expect(prisma.organisation.findFirst).toHaveBeenCalledWith({
      where: { identifiant_legal: 'CI-RCCM-1', type: 'ENTREPRISE' },
    });
  });

  it('crée une organisation en attente et active le compte avec une fin d’essai', async () => {
    prisma.organisation.create.mockResolvedValue({ id: 'org-01' });
    prisma.organisation.update.mockResolvedValue({ id: 'org-01' });

    await repository.create({
      email: 'org@test.ci',
      password_hash: 'hash',
      raison_sociale: 'TechCorp',
      type: 'ENTREPRISE',
      sous_types: ['PME'],
      identifiant_legal: 'CI-RCCM-1',
      contact_referent: 'DRH',
      pays: 'CI',
      langue_preferee: 'FR',
      token_confirmation: 'token-01',
      token_expiration: new Date('2026-01-02T00:00:00.000Z'),
    });
    await repository.activate('org-01');

    expect(prisma.organisation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'org@test.ci',
        statut: 'EN_ATTENTE',
      }),
    });

    const activateCall = prisma.organisation.update.mock.calls[0][0];
    const finEssai = activateCall.data.date_fin_essai as Date;

    expect(activateCall).toEqual({
      where: { id: 'org-01' },
      data: expect.objectContaining({
        statut: 'ACTIF',
        token_confirmation: null,
        token_expiration: null,
        date_fin_essai: expect.any(Date),
      }),
    });
    expect(finEssai.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 3600 * 1000);
    expect(finEssai.getTime()).toBeLessThan(Date.now() + 31 * 24 * 3600 * 1000);
  });

  it('suspend une organisation', async () => {
    prisma.organisation.update.mockResolvedValue({ id: 'org-01' });

    await repository.suspendre('org-01');

    expect(prisma.organisation.update).toHaveBeenCalledWith({
      where: { id: 'org-01' },
      data: { statut: 'SUSPENDU' },
    });
  });
});
