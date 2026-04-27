import { EspaceApprenantService } from '../espace-apprenant.service';
import { AttestationService } from '../attestation.service';
import { EspaceApprenantRepository } from '../espace-apprenant.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';
import { EmailService } from '../../../shared/email/email.service';

describe('EspaceApprenantService', () => {
  let service: EspaceApprenantService;
  let attestationService: AttestationService;
  let mockRepo: jest.Mocked<EspaceApprenantRepository>;
  let mockPrisma: any;
  let mockAudit: jest.Mocked<AuditLogger>;
  let mockEmail: jest.Mocked<EmailService>;

  const dossierEnAttente = {
    id: 'd-01', apprenant_id: 'a-01',
    statut: 'EN_ATTENTE_VERIFICATION',
    session_id: 's-01', voucher_code: null,
    formation: { intitule: 'Test', type_formation: 'PREMIUM' },
    session: { statut: 'INSCRIPTIONS_OUVERTES' },
  };

  const dossierPaye = {
    ...dossierEnAttente,
    statut: 'PAYE',
    session: { id: 's-01', statut: 'CLOTUREE', date_debut: new Date('2026-01-01'), date_fin: new Date('2026-01-10') },
    formation: { intitule: 'Test', duree_jours: 10 },
    apprenant: { nom: 'Koné', prenoms: 'Amadou' }
  };

  const dossierRetenu = { ...dossierEnAttente, statut: 'RETENU' };

  beforeEach(() => {
    mockRepo = {
      findDossiersByApprenant: jest.fn(),
      findDossierById: jest.fn(),
      annulerDossier: jest.fn(),
      findDossiersAvecAttestationDisponible: jest.fn(),
      findAccesFormationsDemande: jest.fn(),
      findAccesFormationById: jest.fn(),
      updateProgression: jest.fn(),
      creerAccesFormationDemande: jest.fn(),
      suspendreAccesByAbonnement: jest.fn(),
      reactiverAccesByAbonnement: jest.fn(),
    } as any;

    mockPrisma = {
      session: { update: jest.fn() },
      voucherApporteur: { findFirst: jest.fn(), update: jest.fn() },
      dossier: { update: jest.fn() },
    };

    mockAudit = { info: jest.fn(), warning: jest.fn() } as any;
    mockEmail = {} as any;

    attestationService = new AttestationService(mockRepo, mockAudit);
    service = new EspaceApprenantService(mockRepo, attestationService, mockPrisma, mockAudit, mockEmail);
  });

  // RM-26 : attestation — conditions strictes
  describe('RM-26 — Attestation disponible si PAYE + session CLOTUREE', () => {
    it('refuse si dossier introuvable', async () => {
      mockRepo.findDossierById.mockResolvedValue(null);
      await expect(
        attestationService.verifierDisponibilite('d-01', 'a-01')
      ).rejects.toThrow('DOSSIER_NOT_FOUND');
    });

    it('refuse si le dossier n’appartient pas à l’apprenant', async () => {
      mockRepo.findDossierById.mockResolvedValue({
        ...dossierPaye,
        apprenant_id: 'a-02',
      } as any);
      await expect(
        attestationService.verifierDisponibilite('d-01', 'a-01')
      ).rejects.toThrow('FORBIDDEN');
    });

    it('refuse si dossier non payé', async () => {
      mockRepo.findDossierById.mockResolvedValue(dossierEnAttente as any);
      await expect(
        attestationService.verifierDisponibilite('d-01', 'a-01')
      ).rejects.toThrow('ATTESTATION_DOSSIER_NON_PAYE');
    });

    it('refuse si session non clôturée', async () => {
      mockRepo.findDossierById.mockResolvedValue({
        ...dossierPaye,
        session: { statut: 'EN_COURS' }
      } as any);
      await expect(
        attestationService.verifierDisponibilite('d-01', 'a-01')
      ).rejects.toThrow('ATTESTATION_SESSION_NON_CLOTUREE');
    });

    it('accepte si dossier PAYE + session CLOTUREE', async () => {
      mockRepo.findDossierById.mockResolvedValue(dossierPaye as any);
      await expect(
        attestationService.verifierDisponibilite('d-01', 'a-01')
      ).resolves.toBeDefined();
    });

    it('génère un contenu PDF avec UUID et cachet', () => {
      const contenu = attestationService.genererContenuPDF(dossierPaye);
      expect(contenu).toMatchObject({
        nom: 'Amadou Koné',
        formation: 'Test',
        cachet: 'GIE FORGES AGRÉGATEUR',
      });
      expect((contenu as any).uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });

    it('génère un lien signé d’attestation', async () => {
      const previousKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);
      mockRepo.findDossierById.mockResolvedValue(dossierPaye as any);
      mockAudit.info.mockResolvedValue(undefined);

      const url = await attestationService.genererLienAttestation('d-01', 'a-01');

      expect(url).toContain('/api/attestations/d-01/download?token=');
      expect(url).toContain('&iv=');

      process.env.ENCRYPTION_KEY = previousKey;
    });
  });

  // RM-27 : annulation volontaire EN_ATTENTE uniquement
  describe('RM-27 — Annulation uniquement si EN_ATTENTE_VERIFICATION', () => {
    it('rejette si le dossier est introuvable', async () => {
      mockRepo.findDossierById.mockResolvedValue(null);
      await expect(
        service.annulerDossier('d-01', 'a-01')
      ).rejects.toThrow('DOSSIER_NOT_FOUND');
    });

    it('rejette si le dossier n’appartient pas à l’apprenant', async () => {
      mockRepo.findDossierById.mockResolvedValue({
        ...dossierEnAttente,
        apprenant_id: 'autre-apprenant',
      } as any);
      await expect(
        service.annulerDossier('d-01', 'a-01')
      ).rejects.toThrow('FORBIDDEN');
    });

    it('annule un dossier EN_ATTENTE', async () => {
      mockRepo.findDossierById.mockResolvedValue(dossierEnAttente as any);
      mockRepo.annulerDossier.mockResolvedValue({} as any);
      mockPrisma.session.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);

      const result = await service.annulerDossier('d-01', 'a-01');
      expect(result.message).toContain('annulé');
      expect(mockPrisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { places_restantes: { increment: 1 } } })
      );
    });

    it('bloque annulation si dossier RETENU', async () => {
      mockRepo.findDossierById.mockResolvedValue(dossierRetenu as any);
      await expect(
        service.annulerDossier('d-01', 'a-01')
      ).rejects.toThrow('DOSSIER_RETENU_CONTACT_RESPONSABLE');
    });

    it('bloque annulation si dossier PAYE', async () => {
      mockRepo.findDossierById.mockResolvedValue(dossierPaye as any);
      await expect(
        service.annulerDossier('d-01', 'a-01')
      ).rejects.toThrow('DOSSIER_PAYE_NON_ANNULABLE');
    });

    it('libère la place en session après annulation', async () => {
      mockRepo.findDossierById.mockResolvedValue(dossierEnAttente as any);
      mockRepo.annulerDossier.mockResolvedValue({} as any);
      mockPrisma.session.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);

      await service.annulerDossier('d-01', 'a-01');
      expect(mockPrisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's-01' },
          data: { places_restantes: { increment: 1 } }
        })
      );
    });

    it('rejette les autres statuts non annulables', async () => {
      mockRepo.findDossierById.mockResolvedValue({
        ...dossierEnAttente,
        statut: 'ANNULE',
      } as any);

      await expect(
        service.annulerDossier('d-01', 'a-01')
      ).rejects.toThrow('ANNULATION_IMPOSSIBLE');
    });

    it('réactive un voucher épuisé après annulation', async () => {
      mockRepo.findDossierById.mockResolvedValue({
        ...dossierEnAttente,
        voucher_code: 'VOUCHER-01',
      } as any);
      mockRepo.annulerDossier.mockResolvedValue({} as any);
      mockPrisma.session.update.mockResolvedValue({});
      mockPrisma.voucherApporteur.findFirst.mockResolvedValue({
        id: 'voucher-id',
        statut: 'EPUISE',
      });
      mockPrisma.voucherApporteur.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);

      await service.annulerDossier('d-01', 'a-01');

      expect(mockPrisma.voucherApporteur.update).toHaveBeenCalledWith({
        where: { id: 'voucher-id' },
        data: {
          quota_utilise: { decrement: 1 },
          statut: 'ACTIF'
        }
      });
    });

    it('conserve le statut du voucher s’il n’était pas épuisé', async () => {
      mockRepo.findDossierById.mockResolvedValue({
        ...dossierEnAttente,
        voucher_code: 'VOUCHER-02',
      } as any);
      mockRepo.annulerDossier.mockResolvedValue({} as any);
      mockPrisma.session.update.mockResolvedValue({});
      mockPrisma.voucherApporteur.findFirst.mockResolvedValue({
        id: 'voucher-id',
        statut: 'SUSPENDU',
      });
      mockPrisma.voucherApporteur.update.mockResolvedValue({});
      mockAudit.info.mockResolvedValue(undefined);

      await service.annulerDossier('d-01', 'a-01');

      expect(mockPrisma.voucherApporteur.update).toHaveBeenCalledWith({
        where: { id: 'voucher-id' },
        data: {
          quota_utilise: { decrement: 1 },
          statut: 'SUSPENDU'
        }
      });
    });
  });

  // RM-92 : expiration accès formations à la demande
  describe('RM-92 — Expiration accès formations à la demande', () => {
    it('retourne les accès avec statut d’expiration et disponibilité', async () => {
      const formationMock = {
        id: 'f-01',
        intitule: 'Formation Test',
        description_courte: 'Description',
        duree_jours: 3,
        type_formation: 'STANDARD',
        mode_formation: 'A_LA_DEMANDE',
      };
      mockRepo.findAccesFormationsDemande.mockResolvedValue([
        {
          id: 'acc-01',
          statut: 'ACTIF',
          date_expiration: new Date(Date.now() - 1000),
          formation: formationMock,
        },
        {
          id: 'acc-02',
          statut: 'ACTIF',
          date_expiration: new Date(Date.now() + 3600 * 1000),
          formation: formationMock,
        },
        {
          id: 'acc-03',
          statut: 'SUSPENDU',
          date_expiration: new Date(Date.now() + 3600 * 1000),
          formation: formationMock,
        },
      ] as any);

      const result = await service.getMesFormationsDemande('a-01');

      expect(result[0]).toMatchObject({ est_expire: true, acces_disponible: false });
      expect(result[1]).toMatchObject({ est_expire: false, acces_disponible: true });
      expect(result[2]).toMatchObject({ est_expire: false, acces_disponible: false });
    });

    it('lève ACCES_NON_TROUVE quand l’accès à la formation n’existe pas (UCS14)', async () => {
      mockRepo.findAccesFormationById.mockResolvedValue(null as any);
      await expect(service.getAccesFormationDemande('acces-inexistant', 'a-01'))
        .rejects
        .toThrow('ACCES_NON_TROUVE');
    });

    it('met à jour la progression seulement pour un accès actif', async () => {
      mockRepo.findAccesFormationById.mockResolvedValue({
        id: 'acc-01',
        apprenant_id: 'a-01',
        statut: 'ACTIF',
        progression: 30,
      } as any);
      mockRepo.updateProgression.mockResolvedValue({ id: 'acc-01', progression: 55 } as any);
      mockAudit.info.mockResolvedValue(undefined);

      await expect(
        service.updateProgressionFormationDemande('acc-01', 'a-01', 55)
      ).resolves.toEqual({ id: 'acc-01', progression: 55 });

      expect(mockRepo.updateProgression).toHaveBeenCalledWith('acc-01', 55);
      expect(mockAudit.info).toHaveBeenCalledWith('ACCES_FORMATION_DEMANDE_PROGRESSION', {
        acces_id: 'acc-01',
        apprenant_id: 'a-01',
        progression: 55,
      });
    });

    it('refuse la progression si l’accès n’est pas actif', async () => {
      mockRepo.findAccesFormationById.mockResolvedValue({
        id: 'acc-01',
        apprenant_id: 'a-01',
        statut: 'SUSPENDU',
        progression: 30,
      } as any);

      await expect(
        service.updateProgressionFormationDemande('acc-01', 'a-01', 55)
      ).rejects.toThrow('ACCES_NON_MODIFIABLE');
    });
  });

  describe('UCS11 — Consultation et attestation', () => {
    it('retourne les dossiers de l’apprenant', async () => {
      mockRepo.findDossiersByApprenant.mockResolvedValue([{ id: 'd-01' }] as any);

      await expect(service.getMesDossiers('a-01')).resolves.toEqual([{ id: 'd-01' }]);
    });

    it('retourne une URL d’attestation encapsulée', async () => {
      jest.spyOn(attestationService, 'genererLienAttestation').mockResolvedValue('/signed-url');

      await expect(service.getAttestationUrl('d-01', 'a-01')).resolves.toEqual({
        url: '/signed-url',
        expires_in: '24h',
      });
    });
  });

  // RM-103 : suspension accès si abonnement inactif
  describe('RM-103 — Suspension accès si abonnement inactif', () => {
    it('suspend les accès source=ABONNEMENT si abonnement inactif', async () => {
      mockRepo.suspendreAccesByAbonnement.mockResolvedValue({ count: 2 } as any);
      mockAudit.info.mockResolvedValue(undefined);
      await service.suspendreAccesAbonnement('a-01');
      expect(mockRepo.suspendreAccesByAbonnement).toHaveBeenCalledWith('a-01');
    });

    it('réactive les accès après resouscription', async () => {
      mockRepo.reactiverAccesByAbonnement.mockResolvedValue({ count: 2 } as any);
      mockAudit.info.mockResolvedValue(undefined);
      await service.reactiverAccesAbonnement('a-01');
      expect(mockRepo.reactiverAccesByAbonnement).toHaveBeenCalledWith('a-01');
    });
  });

  describe('RM-49 — Document complémentaire', () => {
    it('rejette si le dossier est introuvable', async () => {
      mockRepo.findDossierById.mockResolvedValue(null);

      await expect(service.ajouterDocumentDossier('d-01', 'a-01', '/file.pdf'))
        .rejects
        .toThrow('DOSSIER_NOT_FOUND');
    });

    it('rejette si le dossier n’est plus modifiable', async () => {
      mockRepo.findDossierById.mockResolvedValue(dossierPaye as any);

      await expect(service.ajouterDocumentDossier('d-01', 'a-01', '/file.pdf'))
        .rejects
        .toThrow('DOSSIER_NON_MODIFIABLE');
    });

    it('trace l’ajout quand le dossier est modifiable', async () => {
      mockRepo.findDossierById.mockResolvedValue(dossierEnAttente as any);
      mockAudit.info.mockResolvedValue(undefined);

      await expect(service.ajouterDocumentDossier('d-01', 'a-01', '/file.pdf'))
        .resolves
        .toEqual({ message: 'Document ajouté avec succès (fonctionnalité à implémenter).' });

      expect(mockAudit.info).toHaveBeenCalledWith('DOCUMENT_DOSSIER_AJOUTE', {
        dossier_id: 'd-01',
        apprenant_id: 'a-01'
      });
    });
  });
});
