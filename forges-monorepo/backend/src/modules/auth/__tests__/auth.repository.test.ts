import { UserRepository } from '../auth.repository';
import { createPrismaMock } from '../../../__tests__/helpers/prisma';

describe('UserRepository', () => {
  it('cherche un utilisateur par email', async () => {
    const prisma = createPrismaMock();
    prisma.apprenant.findUnique.mockResolvedValue({ id: 'user-01' });
    const repository = new UserRepository(prisma);

    await expect(repository.findByEmail('user@test.ci')).resolves.toMatchObject({
      id: 'user-01',
      source: 'APPRENANT',
    });
    expect(prisma.apprenant.findUnique).toHaveBeenCalledWith({ where: { email: 'user@test.ci' } });
  });

  it('cherche un partenaire par email principal et un token de reset', async () => {
    const prisma = createPrismaMock();
    prisma.apprenant.findUnique.mockResolvedValue(null);
    prisma.organisation.findUnique.mockResolvedValue(null);
    prisma.partenaire.findUnique.mockResolvedValue({
      id: 'part-01',
      email_principal: 'partner@test.ci',
      password_hash: 'hash',
      statut: 'ACTIF',
    });
    prisma.apprenant.findFirst.mockResolvedValue(null);
    prisma.organisation.findFirst.mockResolvedValue({
      id: 'org-01',
      email: 'org@test.ci',
      password_hash: 'hash',
      statut: 'ACTIF',
      langue_preferee: 'FR',
    });
    const repository = new UserRepository(prisma);

    await expect(repository.findByEmail('partner@test.ci')).resolves.toMatchObject({
      id: 'part-01',
      email: 'partner@test.ci',
      role: 'PARTENAIRE',
    });

    await expect(repository.findByResetToken('reset-token')).resolves.toMatchObject({
      id: 'org-01',
      email: 'org@test.ci',
      role: 'ORGANISATION',
    });

    await repository.setResetToken('org-01', 'ORGANISATION', 'reset-token', new Date('2026-04-22T00:00:00.000Z'));
    await repository.updatePassword('org-01', 'ORGANISATION', 'new-hash');

    expect(prisma.organisation.update).toHaveBeenCalledWith({
      where: { id: 'org-01' },
      data: expect.objectContaining({
        password_hash: 'new-hash',
        token_confirmation: null,
        token_expiration: null,
      }),
    });
  });
});
