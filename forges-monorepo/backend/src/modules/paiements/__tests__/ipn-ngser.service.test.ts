import { IpnNgserService } from '../ipn-ngser.service';
import { PrismaClient } from '@prisma/client';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { CommissionService } from '../commission.service';

const prisma = new PrismaClient();
const audit = new AuditLogger(prisma);
const commissionService = new CommissionService(prisma, audit);
const service = new IpnNgserService(prisma, audit, commissionService);

describe('IpnNgserService — RM-158/160', () => {
  describe('RM-158.1: Idempotence stricte', () => {
    it('IPN doublon retourne already_processed sans action', async () => {
      // Setup dossier et paiement
      const dossier = await prisma.dossier.create({
        data: {
          id: 'D-TEST-DOUBLON-' + Date.now(),
          apprenant_id: 'test-apprenant',
          session_id: 'test-session',
          formation_id: 'test-formation',
          source_financement: 'RETAIL',
          statut: 'EN_ATTENTE_PAIEMENT',
        },
      });

      const paiement = await prisma.paiement.create({
        data: {
          dossier_id: dossier.id,
          order_ngser: 'FRG-2026-001-' + Math.random().toString(36).substring(7).toUpperCase(),
          montant_catalogue: 150000,
          montant_final: 150000,
          montant_initie: 150000,
          methode: 'MOBILE_MONEY',
          statut: 'PENDING',
          provider: 'NGSER',
        },
      });

      const ipn = {
        order_ngser: paiement.order_ngser!,
        transaction_id: 'TXN-DOUBLE-' + Date.now(),
        status: 'SUCCESS',
        amount: 150000,
      };

      // Premier appel
      const result1 = await service.traiterIpn(ipn);
      expect(result1.paiement_statut).toBe('CONFIRME');

      // Deuxième appel (doublon)
      const result2 = await service.traiterIpn(ipn);
      expect(result2.already_processed).toBe(true);
      expect(result2.action).toBe('NONE');

      // Cleanup
      await prisma.paiement.delete({ where: { id: paiement.id } });
      await prisma.dossier.delete({ where: { id: dossier.id } });
    });

    it('Transaction_id empêche double traitement', async () => {
      const dossier1 = await prisma.dossier.create({
        data: {
          id: 'D-TEST-TXN1-' + Date.now(),
          apprenant_id: 'test-apprenant',
          session_id: 'test-session',
          formation_id: 'test-formation',
          source_financement: 'RETAIL',
          statut: 'EN_ATTENTE_PAIEMENT',
        },
      });

      const dossier2 = await prisma.dossier.create({
        data: {
          id: 'D-TEST-TXN2-' + Date.now(),
          apprenant_id: 'test-apprenant',
          session_id: 'test-session',
          formation_id: 'test-formation',
          source_financement: 'RETAIL',
          statut: 'EN_ATTENTE_PAIEMENT',
        },
      });

      const paiement1 = await prisma.paiement.create({
        data: {
          dossier_id: dossier1.id,
          order_ngser: 'FRG-2026-002-' + Math.random().toString(36).substring(7).toUpperCase(),
          montant_catalogue: 150000,
          montant_final: 150000,
          montant_initie: 150000,
          methode: 'MOBILE_MONEY',
          statut: 'PENDING',
          provider: 'NGSER',
        },
      });

      const paiement2 = await prisma.paiement.create({
        data: {
          dossier_id: dossier2.id,
          order_ngser: 'FRG-2026-003-' + Math.random().toString(36).substring(7).toUpperCase(),
          montant_catalogue: 150000,
          montant_final: 150000,
          montant_initie: 150000,
          methode: 'MOBILE_MONEY',
          statut: 'PENDING',
          provider: 'NGSER',
        },
      });

      const txnId = 'TXN-UNIQUE-' + Date.now();
      const ipn = {
        order_ngser: paiement1.order_ngser!,
        transaction_id: txnId,
        status: 'SUCCESS',
        amount: 150000,
      };

      await service.traiterIpn(ipn);

      // Même transaction_id, order_ngser différent
      const ipn2 = {
        ...ipn,
        order_ngser: paiement2.order_ngser!,
      };

      const result2 = await service.traiterIpn(ipn2);
      expect(result2.already_processed).toBe(true);

      // Cleanup
      await prisma.paiement.deleteMany({ where: { id: { in: [paiement1.id, paiement2.id] } } });
      await prisma.dossier.deleteMany({ where: { id: { in: [dossier1.id, dossier2.id] } } });
    });
  });

  describe('RM-160: Contrôle montant', () => {
    it('rejette IPN si montant != montant_initie', async () => {
      const dossier = await prisma.dossier.create({
        data: {
          id: 'D-TEST-MONTANT-' + Date.now(),
          apprenant_id: 'test-apprenant',
          session_id: 'test-session',
          formation_id: 'test-formation',
          source_financement: 'RETAIL',
          statut: 'EN_ATTENTE_PAIEMENT',
        },
      });

      const paiement = await prisma.paiement.create({
        data: {
          dossier_id: dossier.id,
          order_ngser: 'FRG-2026-004-' + Math.random().toString(36).substring(7).toUpperCase(),
          montant_catalogue: 150000,
          montant_final: 150000,
          montant_initie: 150000,
          methode: 'MOBILE_MONEY',
          statut: 'PENDING',
          provider: 'NGSER',
        },
      });

      const ipnFalsifie = {
        order_ngser: paiement.order_ngser!,
        transaction_id: 'TXN-FALSIFIE-' + Date.now(),
        status: 'SUCCESS',
        amount: 1, // falsification
      };

      await expect(service.traiterIpn(ipnFalsifie)).rejects.toThrow('MONTANT_MISMATCH');

      // Cleanup
      await prisma.paiement.delete({ where: { id: paiement.id } });
      await prisma.dossier.delete({ where: { id: dossier.id } });
    });

    it('accepte montant exact', async () => {
      const dossier = await prisma.dossier.create({
        data: {
          id: 'D-TEST-MONTANT-OK-' + Date.now(),
          apprenant_id: 'test-apprenant',
          session_id: 'test-session',
          formation_id: 'test-formation',
          source_financement: 'RETAIL',
          statut: 'EN_ATTENTE_PAIEMENT',
        },
      });

      const paiement = await prisma.paiement.create({
        data: {
          dossier_id: dossier.id,
          order_ngser: 'FRG-2026-005-' + Math.random().toString(36).substring(7).toUpperCase(),
          montant_catalogue: 150000,
          montant_final: 150000,
          montant_initie: 150000,
          methode: 'MOBILE_MONEY',
          statut: 'PENDING',
          provider: 'NGSER',
        },
      });

      const ipn = {
        order_ngser: paiement.order_ngser!,
        transaction_id: 'TXN-OK-' + Date.now(),
        status: 'SUCCESS',
        amount: 150000,
      };

      const result = await service.traiterIpn(ipn);
      expect(result.paiement_statut).toBe('CONFIRME');

      // Cleanup
      await prisma.commissionPartenaire.deleteMany({ where: { paiement_id: paiement.id } });
      await prisma.paiement.delete({ where: { id: paiement.id } });
      await prisma.dossier.delete({ where: { id: dossier.id } });
    });
  });

  describe('RM-158.2: Statuts IPN', () => {
    it('SUCCESS: CONFIRME + PAYE + commissions créées', async () => {
      const formation = await prisma.formation.findFirst({ where: { statut: 'PUBLIEE' } });
      if (!formation) throw new Error('Aucune formation trouvée pour le test');

      const dossier = await prisma.dossier.create({
        data: {
          id: 'D-TEST-SUCCESS-' + Date.now(),
          apprenant_id: 'test-apprenant',
          session_id: 'test-session',
          formation_id: formation.id,
          source_financement: 'RETAIL',
          statut: 'EN_ATTENTE_PAIEMENT',
        },
      });

      const paiement = await prisma.paiement.create({
        data: {
          dossier_id: dossier.id,
          order_ngser: 'FRG-2026-006-' + Math.random().toString(36).substring(7).toUpperCase(),
          montant_catalogue: 150000,
          montant_final: 150000,
          montant_initie: 150000,
          methode: 'MOBILE_MONEY',
          statut: 'PENDING',
          provider: 'NGSER',
        },
      });

      const ipn = {
        order_ngser: paiement.order_ngser!,
        transaction_id: 'TXN-SUCCESS-' + Date.now(),
        status: 'SUCCESS',
        amount: 150000,
      };

      const result = await service.traiterIpn(ipn);

      expect(result.paiement_statut).toBe('CONFIRME');
      expect(result.dossier_statut).toBe('PAYE');
      expect(result.commissions_created).toBe(true);

      // Vérifier en DB
      const paiementUpdated = await prisma.paiement.findUnique({ where: { id: paiement.id } });
      expect(paiementUpdated?.statut).toBe('CONFIRME');

      const dossierUpdated = await prisma.dossier.findUnique({ where: { id: dossier.id } });
      expect(dossierUpdated?.statut).toBe('PAYE');

      // Cleanup
      await prisma.commissionPartenaire.deleteMany({ where: { paiement_id: paiement.id } });
      await prisma.paiement.delete({ where: { id: paiement.id } });
      await prisma.dossier.delete({ where: { id: dossier.id } });
    });

    it('FAIL: ECHOUE + ANNULE', async () => {
      const dossier = await prisma.dossier.create({
        data: {
          id: 'D-TEST-FAIL-' + Date.now(),
          apprenant_id: 'test-apprenant',
          session_id: 'test-session',
          formation_id: 'test-formation',
          source_financement: 'RETAIL',
          statut: 'EN_ATTENTE_PAIEMENT',
        },
      });

      const paiement = await prisma.paiement.create({
        data: {
          dossier_id: dossier.id,
          order_ngser: 'FRG-2026-007-' + Math.random().toString(36).substring(7).toUpperCase(),
          montant_catalogue: 150000,
          montant_final: 150000,
          montant_initie: 150000,
          methode: 'MOBILE_MONEY',
          statut: 'PENDING',
          provider: 'NGSER',
        },
      });

      const ipn = {
        order_ngser: paiement.order_ngser!,
        transaction_id: 'TXN-FAIL-' + Date.now(),
        status: 'FAIL',
        amount: 150000,
      };

      const result = await service.traiterIpn(ipn);

      expect(result.paiement_statut).toBe('ECHOUE');
      expect(result.dossier_statut).toBe('ANNULE');

      // Cleanup
      await prisma.paiement.delete({ where: { id: paiement.id } });
      await prisma.dossier.delete({ where: { id: dossier.id } });
    });

    it('PENDING: reste PENDING, éligible réconciliation', async () => {
      const dossier = await prisma.dossier.create({
        data: {
          id: 'D-TEST-PENDING-' + Date.now(),
          apprenant_id: 'test-apprenant',
          session_id: 'test-session',
          formation_id: 'test-formation',
          source_financement: 'RETAIL',
          statut: 'EN_ATTENTE_PAIEMENT',
        },
      });

      const paiement = await prisma.paiement.create({
        data: {
          dossier_id: dossier.id,
          order_ngser: 'FRG-2026-008-' + Math.random().toString(36).substring(7).toUpperCase(),
          montant_catalogue: 150000,
          montant_final: 150000,
          montant_initie: 150000,
          methode: 'MOBILE_MONEY',
          statut: 'PENDING',
          provider: 'NGSER',
        },
      });

      const ipn = {
        order_ngser: paiement.order_ngser!,
        transaction_id: 'TXN-PENDING-' + Date.now(),
        status: 'PENDING',
        amount: 150000,
      };

      const result = await service.traiterIpn(ipn);

      expect(result.paiement_statut).toBe('PENDING');
      expect(result.reconciliation_eligible).toBe(true);

      // Cleanup
      await prisma.paiement.delete({ where: { id: paiement.id } });
      await prisma.dossier.delete({ where: { id: dossier.id } });
    });

    it('Code inconnu: loggé, aucune action', async () => {
      const dossier = await prisma.dossier.create({
        data: {
          id: 'D-TEST-UNKNOWN-' + Date.now(),
          apprenant_id: 'test-apprenant',
          session_id: 'test-session',
          formation_id: 'test-formation',
          source_financement: 'RETAIL',
          statut: 'EN_ATTENTE_PAIEMENT',
        },
      });

      const paiement = await prisma.paiement.create({
        data: {
          dossier_id: dossier.id,
          order_ngser: 'FRG-2026-009-' + Math.random().toString(36).substring(7).toUpperCase(),
          montant_catalogue: 150000,
          montant_final: 150000,
          montant_initie: 150000,
          methode: 'MOBILE_MONEY',
          statut: 'PENDING',
          provider: 'NGSER',
        },
      });

      const ipn = {
        order_ngser: paiement.order_ngser!,
        transaction_id: 'TXN-UNKNOWN-' + Date.now(),
        status: 'WEIRD_CODE',
        amount: 150000,
      };

      const result = await service.traiterIpn(ipn);
      expect(result.action).toBe('LOGGED_UNKNOWN');

      // Cleanup
      await prisma.paiement.delete({ where: { id: paiement.id } });
      await prisma.dossier.delete({ where: { id: dossier.id } });
    });
  });

  describe('RM-158.3: Commissions', () => {
    it('Commissions créées une seule fois (pas en doublon)', async () => {
      const formation = await prisma.formation.findFirst({ where: { statut: 'PUBLIEE' } });
      if (!formation) throw new Error('Aucune formation trouvée pour le test');

      const dossier = await prisma.dossier.create({
        data: {
          id: 'D-TEST-COMMISSION-' + Date.now(),
          apprenant_id: 'test-apprenant',
          session_id: 'test-session',
          formation_id: formation.id,
          source_financement: 'RETAIL',
          statut: 'EN_ATTENTE_PAIEMENT',
        },
      });

      const paiement = await prisma.paiement.create({
        data: {
          dossier_id: dossier.id,
          order_ngser: 'FRG-2026-010-' + Math.random().toString(36).substring(7).toUpperCase(),
          montant_catalogue: 150000,
          montant_final: 150000,
          montant_initie: 150000,
          methode: 'MOBILE_MONEY',
          statut: 'PENDING',
          provider: 'NGSER',
        },
      });

      const ipn = {
        order_ngser: paiement.order_ngser!,
        transaction_id: 'TXN-COMMISSION-' + Date.now(),
        status: 'SUCCESS',
        amount: 150000,
      };

      await service.traiterIpn(ipn);

      const commissions1 = await prisma.commissionPartenaire.count({
        where: { paiement_id: paiement.id },
      });

      // Doublon IPN
      await service.traiterIpn(ipn);

      const commissions2 = await prisma.commissionPartenaire.count({
        where: { paiement_id: paiement.id },
      });

      expect(commissions1).toBe(1);
      expect(commissions2).toBe(1); // Pas de doublon

      // Cleanup
      await prisma.commissionPartenaire.deleteMany({ where: { paiement_id: paiement.id } });
      await prisma.paiement.delete({ where: { id: paiement.id } });
      await prisma.dossier.delete({ where: { id: dossier.id } });
    });
  });
});
