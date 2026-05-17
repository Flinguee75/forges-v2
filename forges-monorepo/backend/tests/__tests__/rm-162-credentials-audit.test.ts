const { execSync } = require('child_process');
const path = require('path');

/**
 * RM-162 — Tests d'audit de sécurité credentials
 *
 * Vérifie que:
 * 1. Aucun secret n'est hardcodé dans le code source
 * 2. Aucune URL NGSER réelle n'est hardcodée
 * 3. Les fichiers .env ne sont jamais commités
 * 4. Les logs ne contiennent pas de tokens
 */
describe('RM-162 — Credentials non exposés', () => {
  const backendDir = path.join(__dirname, '../../');

  describe('RM-162.1: Aucun secret hardcodé', () => {
    it('aucun NGSER_AUTH_TOKEN hardcodé dans src/', () => {
      const result = execSync(
        `grep -r "NGSER_AUTH_TOKEN\\s*=\\s*['\\"\\"]" ${backendDir}/src/ --exclude-dir=__tests__ || exit 0`,
        { encoding: 'utf-8' }
      );

      expect(result.trim()).toBe('');
    });

    it('aucun NGSER_AUTHENTICATION_TOKEN hardcodé dans src/', () => {
      const result = execSync(
        `grep -r "NGSER_AUTHENTICATION_TOKEN\\s*=\\s*['\\"\\"]" ${backendDir}/src/ --exclude-dir=__tests__ || exit 0`,
        { encoding: 'utf-8' }
      );

      expect(result.trim()).toBe('');
    });

    it('aucun NGSER_OPERATION_TOKEN_PAIEMENT hardcodé dans src/', () => {
      const result = execSync(
        `grep -r "NGSER_OPERATION_TOKEN_PAIEMENT\\s*=\\s*['\\"\\"]" ${backendDir}/src/ --exclude-dir=__tests__ || exit 0`,
        { encoding: 'utf-8' }
      );

      expect(result.trim()).toBe('');
    });

    it('aucun JWT_SECRET hardcodé dans src/', () => {
      const result = execSync(
        `grep -r "JWT_SECRET\\s*=\\s*['\\"\\"]" ${backendDir}/src/ --exclude-dir=__tests__ || exit 0`,
        { encoding: 'utf-8' }
      );

      expect(result.trim()).toBe('');
    });

    it('aucun HMAC_ANONYMISATION_SEL hardcodé dans src/', () => {
      const result = execSync(
        `grep -r "HMAC_ANONYMISATION_SEL\\s*=\\s*['\\"\\"]" ${backendDir}/src/ --exclude-dir=__tests__ || exit 0`,
        { encoding: 'utf-8' }
      );

      expect(result.trim()).toBe('');
    });

    it('aucun password hardcodé dans src/', () => {
      // Recherche patterns dangereux mais simplifié pour éviter les problèmes shell
      const result = execSync(
        `grep -r "password.*=" "${backendDir}/src/" | grep -v "password: process.env" | grep -v "password_hash" | grep -v ".test." | grep -v "dto.ts" | grep -v "interface" | grep -v "type " | grep -v "?" || exit 0`,
        { encoding: 'utf-8' }
      );

      // Filtrer les faux positifs (DTOs, interfaces, tests, méthodes, destructuring, routes)
      const lines = result.split('\n').filter((line) => {
        return (
          line &&
          !line.includes('password?:') &&
          !line.includes('password:') &&
          !line.includes('validatePassword') &&
          !line.includes('hashPassword') &&
          !line.includes('comparePassword') &&
          !line.includes('checkPassword') &&
          !line.includes('updatePassword') &&
          !line.includes('resetPassword') &&
          !line.includes('newPassword') &&
          !line.includes('const passwordHash') &&
          !line.includes('{ token, password }') &&
          !line.includes('router.post(') &&
          !line.includes('/forgot-password') &&
          !line.includes('/reset-password') &&
          !line.includes('/change-password')
        );
      });

      expect(lines.length).toBe(0);
    });
  });

  describe('RM-162.2: Aucune URL NGSER réelle hardcodée', () => {
    it('aucune URL securetest.crossroad-africa.net hardcodée dans src/', () => {
      // Excepter .env.example qui peut contenir l'URL en exemple
      const result = execSync(
        `grep -r "securetest.crossroad-africa.net" ${backendDir}/src/ --exclude-dir=__tests__ || exit 0`,
        { encoding: 'utf-8' }
      );

      expect(result.trim()).toBe('');
    });

    it('aucune URL de paiement hardcodée dans src/', () => {
      const result = execSync(
        `grep -r "https://pay\\." ${backendDir}/src/ || exit 0`,
        { encoding: 'utf-8' }
      );

      expect(result.trim()).toBe('');
    });
  });

  describe('RM-162.3: Variables .env non commitées', () => {
    it('fichiers .env non présents dans l\'historique git', () => {
      const result = execSync(
        `git log --all --full-history --diff-filter=A -- "${backendDir}/.env" "${backendDir}/.env.production" 2>/dev/null | head -20 || exit 0`,
        { encoding: 'utf-8', cwd: backendDir }
      );

      expect(result.trim()).toBe('');
    });

    it('.env est dans .gitignore', () => {
      // Chercher .gitignore à plusieurs niveaux
      const gitignorePaths = [
        path.join(backendDir, '..', '..', '.gitignore'),
        path.join(backendDir, '..', '.gitignore'),
        path.join(backendDir, '.gitignore'),
      ];

      let result = '';
      for (const gitignorePath of gitignorePaths) {
        try {
          result = execSync(`cat "${gitignorePath}" | grep -E "^\\.env$|^\\.env\\." || exit 0`, {
            encoding: 'utf-8',
          });
          if (result.trim()) break;
        } catch (e) {
          // Fichier n'existe pas, essayer le suivant
        }
      }

      expect(result).toContain('.env');
    });
  });

  describe('RM-162.4: Fonction masquerSecrets', () => {
    it('masquerSecrets masque les tokens', () => {
      const { masquerSecrets } = require('../../src/shared/utils/masque-secrets.util');

      const payload = {
        order_ngser: 'FRG-2026-001-AAAAAA',
        payment_token_ngser: 'TOKEN-SECRET-123456789',
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        montant: 150000,
      };

      const masked = masquerSecrets(payload);

      expect(masked.order_ngser).toBe('FRG-2026-001-AAAAAA'); // Non sensible
      expect(masked.montant).toBe(150000); // Non sensible
      expect(masked.payment_token_ngser).not.toContain('TOKEN-SECRET');
      expect(masked.payment_token_ngser).toContain('***');
      expect(masked.authorization).not.toContain('Bearer');
      expect(masked.authorization).toContain('***');
    });

    it('masquerSecrets gère les objets imbriqués', () => {
      const { masquerSecrets } = require('../../src/shared/utils/masque-secrets.util');

      const payload = {
        paiement: {
          order_ngser: 'FRG-2026-001-AAAAAA',
          payment_token_ngser: 'SECRET-TOKEN',
        },
        headers: {
          authorization: 'Bearer secret-jwt-token',
        },
      };

      const masked = masquerSecrets(payload);

      expect(masked.paiement.order_ngser).toBe('FRG-2026-001-AAAAAA');
      expect(masked.paiement.payment_token_ngser).toContain('***');
      expect(masked.headers.authorization).toContain('***');
    });

    it('masquerSecrets gère les tableaux', () => {
      const { masquerSecrets } = require('../../src/shared/utils/masque-secrets.util');

      const payload = [
        { token: 'secret1', montant: 100 },
        { token: 'secret2', montant: 200 },
      ];

      const masked = masquerSecrets(payload);

      expect(masked[0].montant).toBe(100);
      expect(masked[1].montant).toBe(200);
      expect(masked[0].token).toContain('***');
      expect(masked[1].token).toContain('***');
      expect(masked[0].token).not.toContain('secret1');
      expect(masked[1].token).not.toContain('secret2');
    });

    it('masquerSecrets ne modifie pas les valeurs non sensibles', () => {
      const { masquerSecrets } = require('../../src/shared/utils/masque-secrets.util');

      const payload = {
        order_ngser: 'FRG-2026-001-AAAAAA',
        montant: 150000,
        statut: 'CONFIRME',
        dossier_id: 'D-123',
      };

      const masked = masquerSecrets(payload);

      expect(masked).toEqual(payload);
    });
  });

  describe('RM-162.5: Variables d\'environnement requises', () => {
    it('.env.example contient toutes les variables NGSER', () => {
      const envExample = execSync(`cat "${backendDir}/.env.example"`, { encoding: 'utf-8' });

      expect(envExample).toContain('NGSER_MOCK_MODE');
      expect(envExample).toContain('NGSER_BASE_URL');
      expect(envExample).toContain('NGSER_NAME');
      expect(envExample).toContain('NGSER_AUTHENTICATION_TOKEN');
      expect(envExample).toContain('NGSER_AUTH_TOKEN');
      expect(envExample).toContain('NGSER_OPERATION_TOKEN_PAIEMENT');
      expect(envExample).toContain('NGSER_NOTIFICATION_URL');
      expect(envExample).toContain('NGSER_RECONCILIATION_PENDING_MINUTES');
      expect(envExample).toContain('HMAC_ANONYMISATION_SEL');
    });

    it('.env.example ne contient pas de vraies valeurs', () => {
      const envExample = execSync(`cat "${backendDir}/.env.example"`, { encoding: 'utf-8' });

      // Ne doit pas contenir de vrais tokens
      expect(envExample).not.toMatch(/NGSER_AUTH_TOKEN=eyJ/);
      expect(envExample).not.toMatch(/NGSER_OPERATION_TOKEN_PAIEMENT=[a-f0-9]{32,}/);

      // Doit contenir des placeholders
      expect(envExample).toMatch(/your_.*_token_here|generate_random/);
    });
  });
});
