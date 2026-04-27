import { ApprenantRepository } from '../apprenant.repository';
import { createPrismaMock } from '../../../../__tests__/helpers/prisma';

describe('ApprenantRepository', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let repository: ApprenantRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    repository = new ApprenantRepository(prisma);
  });

  it('cherche un apprenant par email et par id', async () => {
    prisma.apprenant.findUnique
      .mockResolvedValueOnce({ id: 'app-01' })
      .mockResolvedValueOnce({ id: 'app-02' });

    await expect(repository.findByEmail('APPRENANT@TEST.CI')).resolves.toEqual({ id: 'app-01' });
    await expect(repository.findById('app-02')).resolves.toEqual({ id: 'app-02' });

    expect(prisma.apprenant.findUnique).toHaveBeenNthCalledWith(1, {
      where: { email: 'apprenant@test.ci' },
    });
    expect(prisma.apprenant.findUnique).toHaveBeenNthCalledWith(2, {
      where: { id: 'app-02' },
    });
  });

  it('crée, active et met à jour le token de confirmation', async () => {
    prisma.apprenant.create.mockResolvedValue({ id: 'app-01' });
    prisma.apprenant.update.mockResolvedValue({ id: 'app-01' });

    await repository.create({
      email: 'apprenant@test.ci',
      password_hash: 'hash',
      nom: 'Doe',
      prenoms: 'Jane',
      type_apprenant: 'PROFESSIONNEL',
      secteur_activite: 'Finance',
      pays_residence: 'CI',
      pays_nationalite: 'CI',
      langue_preferee: 'FR',
      consentement_rgpd: true,
      consentement_timestamp: new Date('2026-01-01T00:00:00.000Z'),
      consentement_version_cgu: '1.0',
      token_confirmation: 'token-01',
      token_expiration: new Date('2026-01-02T00:00:00.000Z'),
    });
    await repository.activate('app-01');
    await repository.updateToken('app-01', 'token-02', new Date('2026-01-03T00:00:00.000Z'));

    expect(prisma.apprenant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'apprenant@test.ci',
        statut: 'INACTIF',
      }),
    });
    expect(prisma.apprenant.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'app-01' },
      data: { statut: 'ACTIF', token_confirmation: null, token_expiration: null },
    });
    expect(prisma.apprenant.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'app-01' },
      data: {
        token_confirmation: 'token-02',
        token_expiration: new Date('2026-01-03T00:00:00.000Z'),
      },
    });
  });

  it('purge les inactifs anciens et met à jour le profil', async () => {
    prisma.apprenant.deleteMany.mockResolvedValue({ count: 2 } as any);
    prisma.apprenant.update.mockResolvedValue({ id: 'app-01' });

    await repository.purgeInactifs();
    await repository.update('app-01', { nom: 'Doe v2', langue_preferee: 'EN' });

    expect(prisma.apprenant.deleteMany).toHaveBeenCalledWith({
      where: {
        statut: 'INACTIF',
        created_at: { lt: expect.any(Date) },
      },
    });
    expect(prisma.apprenant.update).toHaveBeenCalledWith({
      where: { id: 'app-01' },
      data: { nom: 'Doe v2', langue_preferee: 'EN' },
    });
  });
});
