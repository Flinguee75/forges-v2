jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

import { compare } from 'bcrypt';
import { hash } from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';
import { AuthService } from '../auth.service';
import { UserRepository } from '../auth.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';

describe('AuthService', () => {
  let service: AuthService;
  let mockRepo: jest.Mocked<UserRepository>;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: any;

  beforeEach(() => {
    mockRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByResetToken: jest.fn(),
      setResetToken: jest.fn(),
      updatePassword: jest.fn(),
    } as any;

    mockAudit = {
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    } as any;

    mockEmail = {
      sendResetPassword: jest.fn(),
    };

    (compare as jest.MockedFunction<typeof compare>).mockReset();
    (hash as jest.MockedFunction<typeof hash>).mockReset();
    (sign as jest.MockedFunction<typeof sign>).mockReset();
    (verify as jest.MockedFunction<typeof verify>).mockReset();

    process.env.JWT_SECRET = 'jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'refresh-secret';

    service = new AuthService(mockRepo, mockAudit, mockEmail);
  });

  it('rejette si utilisateur introuvable', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);

    await expect(service.login('user@test.ci', 'Password1', '127.0.0.1')).rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('rejette si utilisateur inactif', async () => {
    mockRepo.findByEmail.mockResolvedValue({ statut: 'INACTIF' } as any);

    await expect(service.login('user@test.ci', 'Password1', '127.0.0.1')).rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('rejette si mot de passe invalide', async () => {
    mockRepo.findByEmail.mockResolvedValue({
      id: 'user-01',
      email: 'user@test.ci',
      password_hash: 'hash',
      role: 'ADMIN',
      statut: 'ACTIF',
    } as any);
    (compare as jest.MockedFunction<typeof compare>).mockResolvedValue(false as never);

    await expect(service.login('user@test.ci', 'Password1', '127.0.0.1')).rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('retourne les tokens et journalise un login réussi', async () => {
    mockRepo.findByEmail.mockResolvedValue({
      id: 'user-01',
      email: 'user@test.ci',
      password_hash: 'hash',
      role: 'ADMIN',
      statut: 'ACTIF',
    } as any);
    (compare as jest.MockedFunction<typeof compare>).mockResolvedValue(true as never);
    (sign as jest.MockedFunction<typeof sign>)
      .mockReturnValueOnce('access-token' as never)
      .mockReturnValueOnce('refresh-token' as never);
    mockAudit.info.mockResolvedValue(undefined);

    const result = await service.login('user@test.ci', 'Password1', '127.0.0.1');

    expect(sign).toHaveBeenNthCalledWith(1, { sub: 'user-01', role: 'ADMIN' }, 'jwt-secret', { expiresIn: '1h' });
    expect(sign).toHaveBeenNthCalledWith(2, { sub: 'user-01' }, 'refresh-secret', { expiresIn: '7d' });
    expect(mockAudit.info).toHaveBeenCalledWith('LOGIN_SUCCESS', { userId: 'user-01', ip: '127.0.0.1', role: 'ADMIN' });
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-01', email: 'user@test.ci', role: 'ADMIN' },
    });
  });

  it('envoie une demande de réinitialisation de mot de passe avec réponse générique', async () => {
    mockRepo.findByEmail.mockResolvedValue({
      id: 'user-01',
      email: 'user@test.ci',
      password_hash: 'hash',
      role: 'APPRENANT',
      statut: 'ACTIF',
      langue_preferee: 'FR',
      source: 'APPRENANT',
    } as any);
    mockRepo.setResetToken.mockResolvedValue(undefined);
    mockEmail.sendResetPassword.mockResolvedValue(undefined);
    mockAudit.info.mockResolvedValue(undefined);

    await expect(service.forgotPassword('user@test.ci', '127.0.0.1')).resolves.toEqual({
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
    });

    expect(mockRepo.setResetToken).toHaveBeenCalledWith(
      'user-01',
      'APPRENANT',
      expect.any(String),
      expect.any(Date)
    );
    expect(mockEmail.sendResetPassword).toHaveBeenCalledWith(
      'user@test.ci',
      expect.any(String),
      'FR'
    );
  });

  it('réinitialise le mot de passe avec un token valide', async () => {
    mockRepo.findByResetToken.mockResolvedValue({
      id: 'user-01',
      email: 'user@test.ci',
      password_hash: 'hash',
      role: 'APPRENANT',
      statut: 'ACTIF',
      langue_preferee: 'FR',
      source: 'APPRENANT',
    } as any);
    (hash as jest.MockedFunction<typeof hash>).mockResolvedValue('new-hash' as never);
    mockRepo.updatePassword.mockResolvedValue(undefined);
    mockAudit.info.mockResolvedValue(undefined);

    await expect(service.resetPassword('token-01', 'Password1!', '127.0.0.1')).resolves.toEqual({
      message: 'Mot de passe réinitialisé avec succès',
    });

    expect(hash).toHaveBeenCalledWith('Password1!', 12);
    expect(mockRepo.updatePassword).toHaveBeenCalledWith('user-01', 'APPRENANT', 'new-hash');
  });

  it('modifie le mot de passe courant avec validation du secret', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'user-01',
      email: 'user@test.ci',
      password_hash: 'hash',
      role: 'APPRENANT',
      statut: 'ACTIF',
      langue_preferee: 'FR',
      source: 'APPRENANT',
    } as any);
    (compare as jest.MockedFunction<typeof compare>).mockResolvedValue(true as never);
    (hash as jest.MockedFunction<typeof hash>).mockResolvedValue('updated-hash' as never);
    mockRepo.updatePassword.mockResolvedValue(undefined);
    mockAudit.info.mockResolvedValue(undefined);

    await expect(
      service.changePassword('user-01', 'Current1!', 'NewPassword1!', '127.0.0.1')
    ).resolves.toEqual({ message: 'Mot de passe modifié avec succès' });

    expect(compare).toHaveBeenCalledWith('Current1!', 'hash');
    expect(mockRepo.updatePassword).toHaveBeenCalledWith('user-01', 'APPRENANT', 'updated-hash');
  });

  it('retourne le profil courant sans le hash', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'user-01',
      email: 'user@test.ci',
      password_hash: 'hash',
      role: 'ADMIN',
      statut: 'ACTIF',
      langue_preferee: 'FR',
      source: 'APPRENANT',
    } as any);

    await expect(service.me('user-01')).resolves.toEqual({
      id: 'user-01',
      email: 'user@test.ci',
      role: 'ADMIN',
      statut: 'ACTIF',
      langue_preferee: 'FR',
      source: 'APPRENANT',
    });
  });

  it('rafraîchit un token d accès avec role inclus', async () => {
    (verify as jest.MockedFunction<typeof verify>).mockReturnValue({ sub: 'user-01' } as never);
    mockRepo.findById.mockResolvedValue({
      id: 'user-01',
      email: 'user@test.ci',
      password_hash: 'hash',
      role: 'APPRENANT',
      statut: 'ACTIF',
      langue_preferee: 'FR',
    } as any);
    (sign as jest.MockedFunction<typeof sign>).mockReturnValue('new-access-token' as never);

    await expect(service.refresh('refresh-token')).resolves.toEqual({ accessToken: 'new-access-token' });
    expect(verify).toHaveBeenCalledWith('refresh-token', 'refresh-secret');
    expect(mockRepo.findById).toHaveBeenCalledWith('user-01');
    expect(sign).toHaveBeenCalledWith({ sub: 'user-01', role: 'APPRENANT', langue: 'FR' }, 'jwt-secret', { expiresIn: '1h' });
  });

  it('rejette le refresh si utilisateur introuvable', async () => {
    (verify as jest.MockedFunction<typeof verify>).mockReturnValue({ sub: 'user-unknown' } as never);
    mockRepo.findById.mockResolvedValue(null);

    await expect(service.refresh('refresh-token')).rejects.toThrow('UNAUTHORIZED');
  });

  it('rejette le refresh si utilisateur inactif', async () => {
    (verify as jest.MockedFunction<typeof verify>).mockReturnValue({ sub: 'user-01' } as never);
    mockRepo.findById.mockResolvedValue({
      id: 'user-01',
      email: 'user@test.ci',
      password_hash: 'hash',
      role: 'APPRENANT',
      statut: 'INACTIF',
    } as any);

    await expect(service.refresh('refresh-token')).rejects.toThrow('UNAUTHORIZED');
  });

  it('tolère un logout sans logique de blacklist implémentée', async () => {
    await expect(service.logout('user-01', 'token')).resolves.toBeUndefined();
  });
});
