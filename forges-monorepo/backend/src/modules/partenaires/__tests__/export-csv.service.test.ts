const mockCommissionPartenaireFindMany = jest.fn();
const mockFormationFindUnique = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    commissionPartenaire: {
      findMany: mockCommissionPartenaireFindMany,
    },
    formation: {
      findUnique: mockFormationFindUnique,
    },
  })),
}));

import { ExportCsvService } from '../export-csv.service';
import { PrismaClient } from '@prisma/client';

describe('ExportCsvService — RM-161', () => {
  let service: ExportCsvService;
  const prisma = new PrismaClient();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExportCsvService(prisma);
  });

  describe('RM-161.1: CSV sans PII', () => {
    it('génère CSV sans email, nom, prénom, ID apprenant', async () => {
      const commissions = [
        {
          id: 'comm-1',
          paiement_id: 'p1',
          formation_id: 'f1',
          partenaire_id: 'part-1',
          montant_xof: 100000,
          created_at: new Date('2025-04-15'),
          paiement: {
            dossier: {
              apprenant: {
                id: 'USER-APPRENANT-001',
                email: 'apprenant@example.com',
                prenom: 'Jean',
                nom: 'Dupont',
              },
            },
          },
          formation: {
            intitule: 'Formation Test',
            langue: 'FR',
          },
          accesFormation: {
            activated_at: new Date('2025-04-20'),
            statut: 'ACTIF',
          },
          certification: null,
        },
      ];

      mockCommissionPartenaireFindMany.mockResolvedValue(commissions);

      const csv = await service.genererCsvPartenaire('part-1', '2025-04');

      expect(csv).not.toContain('@');
      expect(csv).not.toContain('apprenant@example.com');
      expect(csv).not.toContain('Jean');
      expect(csv).not.toContain('Dupont');
      expect(csv).not.toContain('USER-APPRENANT');
      expect(csv).toContain('identifiant_anonymise');
    });
  });

  describe('RM-161.2: HMAC-SHA256 hexadécimal', () => {
    it('utilise HMAC-SHA256 hexadécimal (64 caractères)', async () => {
      const commissions = [
        {
          id: 'comm-1',
          paiement_id: 'p1',
          formation_id: 'f1',
          partenaire_id: 'part-1',
          montant_xof: 100000,
          created_at: new Date('2025-04-15'),
          paiement: {
            dossier: {
              apprenant: {
                id: 'USER-APPRENANT-001',
                email: 'test@example.com',
                prenom: 'Test',
                nom: 'User',
              },
            },
          },
          formation: {
            intitule: 'Formation Test',
            langue: 'FR',
          },
          accesFormation: {
            activated_at: new Date('2025-04-20'),
            statut: 'ACTIF',
          },
          certification: null,
        },
      ];

      mockCommissionPartenaireFindMany.mockResolvedValue(commissions);

      const csv = await service.genererCsvPartenaire('part-1', '2025-04');

      const lines = csv.split('\n');
      const dataLine = lines[1]; // Première ligne de données
      const apprenantHash = dataLine.split(',')[0];

      expect(apprenantHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('HMAC stable (même apprenant_id → même hash)', () => {
      const hash1 = service.anonymiserApprenantId('USER-123');
      const hash2 = service.anonymiserApprenantId('USER-123');

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('HMAC différent pour IDs différents', () => {
      const hash1 = service.anonymiserApprenantId('USER-123');
      const hash2 = service.anonymiserApprenantId('USER-456');

      expect(hash1).not.toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      expect(hash2).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('RM-161.3: Colonnes CSV conformes', () => {
    it('colonnes CSV conformes au schéma v4.9 exact', async () => {
      mockCommissionPartenaireFindMany.mockResolvedValue([]);

      const csv = await service.genererCsvPartenaire('part-1', '2025-04');

      const header = csv.split('\n')[0];
      expect(header).toBe(
        'identifiant_anonymise,formation_intitule,activation_confirmee_le,statut_acces,certification_obtenue,url_verification_certificat,langue_formation'
      );
    });

    it('gère valeurs nulles et vides correctement', async () => {
      const commissions = [
        {
          id: 'comm-1',
          paiement_id: 'p1',
          formation_id: 'f1',
          partenaire_id: 'part-1',
          montant_xof: 100000,
          created_at: new Date('2025-04-15'),
          paiement: {
            dossier: {
              apprenant: {
                id: 'USER-001',
              },
            },
          },
          formation: {
            intitule: 'Formation Test',
            langue: 'FR',
          },
          accesFormation: null, // Pas encore activé
          certification: null, // Pas encore certifié
        },
      ];

      mockCommissionPartenaireFindMany.mockResolvedValue(commissions);

      const csv = await service.genererCsvPartenaire('part-1', '2025-04');

      const lines = csv.split('\n');
      const dataLine = lines[1];

      expect(dataLine).toContain('Formation Test');
      expect(dataLine).toContain(',,'); // Champs vides pour activation
      expect(dataLine).toContain('false'); // certification_obtenue = false
      expect(dataLine).toContain('FR'); // langue
    });

    it('échappe les virgules dans les intitulés', async () => {
      const commissions = [
        {
          id: 'comm-1',
          paiement_id: 'p1',
          formation_id: 'f1',
          partenaire_id: 'part-1',
          montant_xof: 100000,
          created_at: new Date('2025-04-15'),
          paiement: {
            dossier: {
              apprenant: {
                id: 'USER-001',
              },
            },
          },
          formation: {
            intitule: 'Formation, Test, Avancée',
            langue: 'FR',
          },
          accesFormation: null,
          certification: null,
        },
      ];

      mockCommissionPartenaireFindMany.mockResolvedValue(commissions);

      const csv = await service.genererCsvPartenaire('part-1', '2025-04');

      expect(csv).toContain('Formation  Test  Avancée'); // Virgules remplacées par espaces
      expect(csv).not.toContain('Formation, Test, Avancée'); // Virgules supprimées
    });
  });

  describe('RM-161.4: Aucun credential dans CSV', () => {
    it('aucun credential (URLs NGSER, tokens) dans CSV', async () => {
      const commissions = [
        {
          id: 'comm-1',
          paiement_id: 'p1',
          formation_id: 'f1',
          partenaire_id: 'part-1',
          montant_xof: 100000,
          created_at: new Date('2025-04-15'),
          paiement: {
            dossier: {
              apprenant: {
                id: 'USER-001',
              },
            },
            payment_token_ngser: 'TOKEN-SECRET-123',
            order_ngser: 'FRG-2026-001-AAAAAA',
          },
          formation: {
            intitule: 'Formation Test',
            langue: 'FR',
          },
          accesFormation: null,
          certification: null,
        },
      ];

      mockCommissionPartenaireFindMany.mockResolvedValue(commissions);

      const csv = await service.genererCsvPartenaire('part-1', '2025-04');

      expect(csv).not.toContain('securetest.crossroad-africa.net');
      expect(csv).not.toContain('TOKEN-');
      expect(csv).not.toContain('Bearer');
      expect(csv).not.toContain('FRG-2026');
      expect(csv).not.toContain('payment_token');
    });
  });

  describe('RM-161.5: Filtre par partenaire et mois', () => {
    it('filtre commissions par partenaire_id et mois', async () => {
      await service.genererCsvPartenaire('part-1', '2025-04');

      expect(mockCommissionPartenaireFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            partenaire_id: 'part-1',
            created_at: expect.objectContaining({
              gte: expect.any(Date),
              lt: expect.any(Date),
            }),
          }),
        })
      );

      const callArgs = mockCommissionPartenaireFindMany.mock.calls[0][0];
      const createdAtGte = new Date(callArgs.where.created_at.gte);
      const createdAtLt = new Date(callArgs.where.created_at.lt);

      expect(createdAtGte.getFullYear()).toBe(2025);
      expect(createdAtGte.getMonth()).toBe(3); // Avril (0-indexed)
      expect(createdAtGte.getDate()).toBe(1);

      expect(createdAtLt.getFullYear()).toBe(2025);
      expect(createdAtLt.getMonth()).toBe(4); // Mai (0-indexed)
      expect(createdAtLt.getDate()).toBe(1);
    });
  });
});
