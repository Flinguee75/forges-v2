jest.mock('nodemailer', () => {
  return {
    __esModule: true,
    default: {
      createTransport: jest.fn(() => ({ sendMail: jest.fn() })),
    },
  };
});

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

import nodemailer from 'nodemailer';
import * as fs from 'fs';
import { EmailService } from '../email.service';

describe('EmailService', () => {
  let service: EmailService;
  let sendMail: jest.Mock;
  const mockExistsSync = fs.existsSync as jest.Mock;
  const mockReadFileSync = fs.readFileSync as jest.Mock;

  // Template HTML mock
  const mockTemplate = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
  <h1>{{t_title}}</h1>
  <p>{{t_intro}}</p>
  <p>Formation: {{formation_intitule}}</p>
  <p>Apprenant: {{nom_apprenant}}</p>
  <p>Montant: {{montant}}</p>
  <p>Motif: {{motif_refus}}</p>
  <p>Motif annulation: {{motif_annulation}}</p>
  <p>{{t_regards}}</p>
  <p>{{t_team_signature}}</p>
</body>
</html>`;

  // Translations mock
  const mockTranslationsFR = {
    common: {
      platform_name: 'FORGES',
      greeting: 'Bonjour',
      regards: 'Cordialement',
      team_signature: "L'équipe FORGES",
    },
    'dossier-retenu': {
      subject: 'Félicitations ! Votre dossier a été retenu',
      title: 'Votre dossier a été retenu',
      intro: 'Votre candidature a été retenue.',
    },
    'dossier-rejete': {
      subject: 'Décision concernant votre candidature',
      title: 'Votre candidature n\'a pas été retenue',
      intro: 'Votre candidature n\'a pas été retenue.',
    },
    'relance-paiement': {
      subject: 'Rappel : Délai de paiement expire bientôt',
      title: 'Délai de paiement expire dans {{heures_restantes}}h',
      intro: 'Votre délai de paiement expire bientôt.',
    },
    'reversement-partenaire': {
      subject: 'Reversement de commissions - {{montant}} FCFA',
      title: 'Reversement de vos commissions',
      intro: 'Un reversement a été effectué.',
    },
    'reversement-apporteur': {
      subject: 'Reversement de commissions - {{montant}} FCFA',
      title: 'Reversement de vos commissions',
      intro: 'Un reversement a été effectué.',
    },
    'dossier-annule': {
      subject: 'Annulation de votre candidature',
      title: 'Votre candidature a été annulée',
      intro: 'Votre candidature a été annulée.',
    },
  };

  const mockTranslationsEN = {
    common: {
      platform_name: 'FORGES',
      greeting: 'Hello',
      regards: 'Best regards',
      team_signature: 'The FORGES Team',
    },
    'dossier-retenu': {
      subject: 'Congratulations! Your application has been accepted',
      title: 'Your application has been accepted',
      intro: 'Your application has been accepted.',
    },
    'dossier-rejete': {
      subject: 'Decision regarding your application',
      title: 'Your application was not accepted',
      intro: 'Your application was not accepted.',
    },
    'relance-paiement': {
      subject: 'Reminder: Payment deadline expires soon',
      title: 'Payment deadline expires in {{heures_restantes}}h',
      intro: 'Your payment deadline expires soon.',
    },
    'reversement-partenaire': {
      subject: 'Commission payment - {{montant}} FCFA',
      title: 'Your commission payment',
      intro: 'A payment has been made.',
    },
    'reversement-apporteur': {
      subject: 'Commission payment - {{montant}} FCFA',
      title: 'Your commission payment',
      intro: 'A payment has been made.',
    },
    'dossier-annule': {
      subject: 'Your application has been cancelled',
      title: 'Your application has been cancelled',
      intro: 'Your application has been cancelled.',
    },
  };

  beforeEach(() => {
    sendMail = jest.fn();
    ((nodemailer as any).createTransport as jest.Mock).mockReturnValue({ sendMail });
    
    // Mock fs methods
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((path: string) => {
      if (path.includes('.html')) {
        return mockTemplate;
      }
      if (path.includes('/fr/')) {
        return JSON.stringify(mockTranslationsFR);
      }
      if (path.includes('/en/')) {
        return JSON.stringify(mockTranslationsEN);
      }
      return '{}';
    });

    service = new EmailService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('envoie un email via le transporteur configuré', async () => {
      sendMail.mockResolvedValue(undefined);

      await service.sendEmail({ to: 'user@test.ci', subject: 'Sujet', text: 'Contenu' });

      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        to: 'user@test.ci',
        subject: 'Sujet',
        text: 'Contenu',
      }));
    });

    it('propage les erreurs d envoi', async () => {
      const error = new Error('SMTP_DOWN');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      sendMail.mockRejectedValue(error);

      await expect(service.sendEmail({ to: 'user@test.ci', subject: 'Sujet' })).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('Email send error (non-bloquant):', 'SMTP_DOWN');

      consoleSpy.mockRestore();
    });
  });

  describe('déléguations métier à sendEmail', () => {
    beforeEach(() => {
      sendMail.mockResolvedValue(undefined);
    });

    it('sendWelcomeEmail délègue correctement', async () => {
      await service.sendWelcomeEmail('a@test.ci', 'Jane');
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Bienvenue sur FORGES',
      }));
    });

    it('sendAbonnementConfirmation délègue correctement', async () => {
      await service.sendAbonnementConfirmation('a@test.ci', 'PREMIUM');
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Confirmation de votre abonnement FORGES',
      }));
    });

    it('sendPaiementConfirmation délègue correctement', async () => {
      await service.sendPaiementConfirmation('a@test.ci', 100000);
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Paiement confirmé',
      }));
    });

    it('sendConfirmation délègue correctement', async () => {
      await service.sendConfirmation('a@test.ci', 'token', 'FR');
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Confirmez votre compte FORGES',
      }));
    });

    it('sendConfirmation inclut un contexte et un lien de confirmation', async () => {
      await service.sendConfirmation('a@test.ci', 'token-123', 'FR');
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        text: expect.stringContaining('/confirm-email/token-123'),
        html: expect.stringContaining('/confirm-email/token-123'),
      }));
    });

    it('sendTempPassword délègue correctement', async () => {
      await service.sendTempPassword('a@test.ci', 'Temp1234!', 'FR');
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Mot de passe temporaire FORGES',
      }));
    });

    it('sendInvitationPartenaire délègue correctement', async () => {
      await service.sendInvitationPartenaire('a@test.ci', 'token', 'FR');
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Invitation à rejoindre FORGES en tant que partenaire',
      }));
    });

    it('sendCodeApporteur délègue correctement', async () => {
      await service.sendCodeApporteur('a@test.ci', 'code', 'FR');
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Votre code apporteur FORGES',
      }));
    });

    it('sendResetPassword inclut un lien de réinitialisation explicite', async () => {
      await service.sendResetPassword('a@test.ci', 'reset-token', 'FR');
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Réinitialisation de mot de passe FORGES',
        text: expect.stringContaining('/reset-password/reset-token'),
      }));
    });
  });

  describe('Templates HTML - Multi-langue', () => {
    beforeEach(() => {
      sendMail.mockResolvedValue(undefined);
    });

    describe('sendDossierRetenu', () => {
      it('envoie email dossier retenu en FR (défaut)', async () => {
        await service.sendDossierRetenu(
          'apprenant@test.ci',
          'John Doe',
          'Formation Test',
          '01/01/2026',
          '31/01/2026',
          '03/01/2026 23:59',
          'https://forges.local/paiement',
          'FR'
        );

        expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
          to: 'apprenant@test.ci',
          subject: 'Félicitations ! Votre dossier a été retenu',
          html: expect.stringContaining('Votre dossier a été retenu'),
        }));
      });

      it('envoie email dossier retenu en EN', async () => {
        await service.sendDossierRetenu(
          'apprenant@test.ci',
          'John Doe',
          'Test Training',
          '01/01/2026',
          '31/01/2026',
          '03/01/2026 23:59',
          'https://forges.local/payment',
          'EN'
        );

        expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
          subject: 'Congratulations! Your application has been accepted',
          html: expect.stringContaining('Your application has been accepted'),
        }));
      });

      it('interpole correctement les variables dynamiques', async () => {
        await service.sendDossierRetenu(
          'apprenant@test.ci',
          'Jane Smith',
          'Premium Formation',
          '15/02/2026',
          '15/03/2026',
          '18/02/2026 23:59',
          'https://forges.local/pay/123',
          'FR'
        );

        const call = sendMail.mock.calls[0][0];
        expect(call.html).toContain('Jane Smith');
        expect(call.html).toContain('Premium Formation');
      });
    });

    describe('sendDossierRejete', () => {
      it('envoie email dossier rejeté en FR', async () => {
        await service.sendDossierRejete(
          'apprenant@test.ci',
          'John Doe',
          'Formation Test',
          'Prérequis non satisfaits',
          'FR'
        );

        expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
          to: 'apprenant@test.ci',
          subject: 'Décision concernant votre candidature',
          html: expect.stringContaining('Votre candidature n\'a pas été retenue'),
        }));
      });

      it('envoie email dossier rejeté en EN', async () => {
        await service.sendDossierRejete(
          'apprenant@test.ci',
          'John Doe',
          'Test Training',
          'Prerequisites not met',
          'EN'
        );

        expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
          subject: 'Decision regarding your application',
        }));
      });

      it('inclut le motif de refus dans le corps', async () => {
        await service.sendDossierRejete(
          'apprenant@test.ci',
          'Jane Smith',
          'Formation Test',
          'Dossier incomplet',
          'FR'
        );

        const call = sendMail.mock.calls[0][0];
        expect(call.html).toContain('Dossier incomplet');
      });
    });

    describe('sendRelancePaiement72h', () => {
      it('envoie email relance avec heures restantes en FR', async () => {
        await service.sendRelancePaiement72h(
          'apprenant@test.ci',
          'John Doe',
          'Formation Test',
          '01/01/2026',
          '31/01/2026',
          '03/01/2026 23:59',
          12,
          'https://forges.local/paiement',
          'FR'
        );

        expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
          subject: 'Rappel : Délai de paiement expire bientôt',
          html: expect.stringContaining('12'),
        }));
      });

      it('envoie email relance en EN', async () => {
        await service.sendRelancePaiement72h(
          'apprenant@test.ci',
          'John Doe',
          'Test Training',
          '01/01/2026',
          '31/01/2026',
          '03/01/2026 23:59',
          6,
          'https://forges.local/payment',
          'EN'
        );

        expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
          subject: 'Reminder: Payment deadline expires soon',
        }));
      });
    });

    describe('sendReversementPartenaire', () => {
      it('envoie email reversement avec montant formaté en FR', async () => {
        await service.sendReversementPartenaire(
          'partenaire@test.ci',
          'ACME Formation',
          15000000,
          5,
          'Janvier 2026',
          'FR'
        );

        const call = sendMail.mock.calls[0][0];
        expect(call.subject).toMatch(/Reversement de commissions - 150[\s\u202F\u00A0.]000 FCFA/);
        expect(call.html).toMatch(/150[\s\u202F\u00A0.]000/);
      });

      it('envoie email reversement en EN', async () => {
        await service.sendReversementPartenaire(
          'partner@test.ci',
          'ACME Training',
          25000000,
          10,
          'January 2026',
          'EN'
        );

        const call = sendMail.mock.calls[0][0];
        expect(call.subject).toMatch(/Commission payment - 250[\s\u202F\u00A0.]000 FCFA/);
      });

      it('formate correctement le montant avec séparateurs de milliers', async () => {
        await service.sendReversementPartenaire(
          'partenaire@test.ci',
          'Test',
          5000000,
          1,
          '2026-01',
          'FR'
        );

        const call = sendMail.mock.calls[0][0];
        expect(call.html).toMatch(/50[\s\u202F\u00A0.]000/);
      });
    });

    describe('sendReversementApporteur', () => {
      it('envoie email reversement apporteur en FR', async () => {
        await service.sendReversementApporteur(
          'apporteur@test.ci',
          'Pierre Dupont',
          7500000,
          3,
          'Janvier 2026',
          'FR'
        );

        const call = sendMail.mock.calls[0][0];
        expect(call.subject).toMatch(/Reversement de commissions - 75[\s\u202F\u00A0.]000 FCFA/);
      });

      it('envoie email reversement apporteur en EN', async () => {
        await service.sendReversementApporteur(
          'referrer@test.ci',
          'John Smith',
          10000000,
          4,
          'January 2026',
          'EN'
        );

        const call = sendMail.mock.calls[0][0];
        expect(call.subject).toMatch(/Commission payment - 100[\s\u202F\u00A0.]000 FCFA/);
      });
    });

    describe('sendDossierAnnule', () => {
      it('envoie email dossier annulé en FR', async () => {
        await service.sendDossierAnnule(
          'apprenant@test.ci',
          'John Doe',
          'Formation Test',
          '01/01/2026',
          '31/01/2026',
          'Délai de paiement expiré',
          'FR'
        );

        expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
          subject: 'Annulation de votre candidature',
          html: expect.stringContaining('Votre candidature a été annulée'),
        }));
      });

      it('envoie email dossier annulé en EN', async () => {
        await service.sendDossierAnnule(
          'apprenant@test.ci',
          'John Doe',
          'Test Training',
          '01/01/2026',
          '31/01/2026',
          'Payment deadline expired',
          'EN'
        );

        expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
          subject: 'Your application has been cancelled',
        }));
      });
    });
  });

  describe('Fallback langue FR (RM-99)', () => {
    it('fallback vers FR si traduction absente', async () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('/es/')) return false;
        return true;
      });

      sendMail.mockResolvedValue(undefined);

      // Recréer le service pour que le cache soit vidé
      service = new EmailService();

      await service.sendDossierRetenu(
        'apprenant@test.ci',
        'John Doe',
        'Formation Test',
        '01/01/2026',
        '31/01/2026',
        '03/01/2026 23:59',
        'https://forges.local/paiement',
        'ES' // Langue inexistante
      );

      // Vérifie que FR est utilisé en fallback
      expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Félicitations ! Votre dossier a été retenu',
      }));
    });
  });

  describe('Gestion des erreurs', () => {
    it('lève une erreur si template introuvable', async () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (path.includes('.html')) return false;
        return true;
      });

      await expect(service.sendDossierRetenu(
        'apprenant@test.ci',
        'John Doe',
        'Formation Test',
        '01/01/2026',
        '31/01/2026',
        '03/01/2026 23:59',
        'https://forges.local/paiement',
        'FR'
      )).rejects.toThrow('Template dossier-retenu introuvable');
    });
  });
});
