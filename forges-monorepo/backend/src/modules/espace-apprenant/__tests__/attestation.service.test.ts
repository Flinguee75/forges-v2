import { AttestationService } from '../attestation.service';
import { EspaceApprenantRepository } from '../espace-apprenant.repository';
import { AuditLogger } from '../../../shared/audit/audit.logger';

const VALID_HEX_KEY = 'a'.repeat(64); // 32 bytes en hex = 64 chars

describe('AttestationService', () => {
  let service: AttestationService;
  let mockRepo: jest.Mocked<EspaceApprenantRepository>;
  let mockAudit: jest.Mocked<AuditLogger>;

  const payeDossier = {
    id: 'dossier-01',
    apprenant_id: 'app-01',
    statut: 'PAYE',
    session: { id: 'session-01', statut: 'CLOTUREE', date_debut: new Date('2026-03-01'), date_fin: new Date('2026-03-05') },
    formation: { id: 'formation-01', intitule: 'Certification Cloud', type_formation: 'STANDARD', mode_formation: 'PRESENTIEL', cout_catalogue: 150000 },
    apprenant: { nom: 'Cisse', prenoms: 'Tidiane' },
    paiement: null,
  };

  beforeEach(() => {
    mockRepo = { findDossierById: jest.fn() } as any;
    mockAudit = { info: jest.fn(), warning: jest.fn(), error: jest.fn() } as any;
    service = new AttestationService(mockRepo, mockAudit);

    process.env.ENCRYPTION_KEY = VALID_HEX_KEY;
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  // ─── verifierDisponibilite ────────────────────────────────────────────────

  describe('verifierDisponibilite', () => {
    it('lance DOSSIER_NOT_FOUND si le dossier est introuvable', async () => {
      mockRepo.findDossierById.mockResolvedValue(null);
      await expect(service.verifierDisponibilite('dossier-01', 'app-01')).rejects.toThrow('DOSSIER_NOT_FOUND');
    });

    it('lance ATTESTATION_DOSSIER_NON_PAYE si le dossier n est pas PAYE', async () => {
      mockRepo.findDossierById.mockResolvedValue({ ...payeDossier, statut: 'PAYE_DIRECTEMENT' } as any);
      await expect(service.verifierDisponibilite('dossier-01', 'app-01')).rejects.toThrow('ATTESTATION_DOSSIER_NON_PAYE');
    });

    it('lance ATTESTATION_DOSSIER_NON_PAYE si statut RETENU', async () => {
      mockRepo.findDossierById.mockResolvedValue({ ...payeDossier, statut: 'RETENU' } as any);
      await expect(service.verifierDisponibilite('dossier-01', 'app-01')).rejects.toThrow('ATTESTATION_DOSSIER_NON_PAYE');
    });

    it('lance ATTESTATION_SESSION_NON_CLOTUREE si la session n est pas cloturee', async () => {
      mockRepo.findDossierById.mockResolvedValue({
        ...payeDossier,
        session: { ...payeDossier.session, statut: 'EN_COURS' },
      } as any);
      await expect(service.verifierDisponibilite('dossier-01', 'app-01')).rejects.toThrow('ATTESTATION_SESSION_NON_CLOTUREE');
    });

    it('lance ATTESTATION_SESSION_NON_CLOTUREE si session absente', async () => {
      mockRepo.findDossierById.mockResolvedValue({ ...payeDossier, session: null } as any);
      await expect(service.verifierDisponibilite('dossier-01', 'app-01')).rejects.toThrow('ATTESTATION_SESSION_NON_CLOTUREE');
    });

    it('retourne le dossier quand PAYE + CLOTUREE', async () => {
      mockRepo.findDossierById.mockResolvedValue(payeDossier as any);
      const result = await service.verifierDisponibilite('dossier-01', 'app-01');
      expect(result.id).toBe('dossier-01');
    });

    // BUG-ATT-01 : la garde FORBIDDEN est du code mort — findDossierById filtre
    // déjà par apprenant_id en base, donc dossier.apprenant_id !== apprenant_id
    // ne peut jamais être vrai si le dossier est non null.
    // Ce test documente ce comportement : une mauvaise combinaison de paramètres
    // retourne DOSSIER_NOT_FOUND, jamais FORBIDDEN.
    it('[BUG-ATT-01] FORBIDDEN est inaccessible — retourne DOSSIER_NOT_FOUND si l apprenant ne correspond pas', async () => {
      mockRepo.findDossierById.mockResolvedValue(null); // la DB filtre → null
      await expect(service.verifierDisponibilite('dossier-01', 'autre-app')).rejects.toThrow('DOSSIER_NOT_FOUND');
      // Ne devrait jamais lancer FORBIDDEN
    });
  });

  // ─── genererLienAttestation ───────────────────────────────────────────────

  describe('genererLienAttestation', () => {
    beforeEach(() => {
      mockRepo.findDossierById.mockResolvedValue(payeDossier as any);
      mockAudit.info.mockResolvedValue(undefined);
    });

    it('retourne une URL contenant dossier_id, token et iv', async () => {
      const url = await service.genererLienAttestation('dossier-01', 'app-01');
      expect(url).toContain('/api/attestations/dossier-01/download');
      expect(url).toContain('token=');
      expect(url).toContain('iv=');
    });

    it('journalise ATTESTATION_GENEREE avec les bonnes données', async () => {
      await service.genererLienAttestation('dossier-01', 'app-01');
      expect(mockAudit.info).toHaveBeenCalledWith('ATTESTATION_GENEREE', expect.objectContaining({
        dossier_id: 'dossier-01',
        apprenant_id: 'app-01',
        formation: 'Certification Cloud',
      }));
    });

    it('propage DOSSIER_NOT_FOUND si verifierDisponibilite echoue', async () => {
      mockRepo.findDossierById.mockResolvedValue(null);
      await expect(service.genererLienAttestation('dossier-01', 'app-01')).rejects.toThrow('DOSSIER_NOT_FOUND');
    });

    it('lance INVALID_ENCRYPTION_KEY si ENCRYPTION_KEY absente', async () => {
      delete process.env.ENCRYPTION_KEY;
      await expect(service.genererLienAttestation('dossier-01', 'app-01')).rejects.toThrow('INVALID_ENCRYPTION_KEY');
    });

    it('lance INVALID_ENCRYPTION_KEY si cle de mauvaise longueur', async () => {
      process.env.ENCRYPTION_KEY = 'clef-trop-courte';
      await expect(service.genererLienAttestation('dossier-01', 'app-01')).rejects.toThrow('INVALID_ENCRYPTION_KEY');
    });

    // BUG-ATT-02 : AES-256-GCM exige que l auth tag soit transmis avec le
    // ciphertext pour garantir l intégrité (MT-02). Sans tag, le déchiffrement
    // côté destinataire ne peut pas valider l authenticité du token.
    it('[BUG-ATT-02] URL manque le parametre tag — auth tag AES-GCM non transmis (MT-02)', async () => {
      const url = await service.genererLienAttestation('dossier-01', 'app-01');
      // Ce test ECHOUE tant que le bug existe : le tag est absent de l URL
      expect(url).toContain('tag=');
    });
  });

  // ─── genererPdfAttestation ────────────────────────────────────────────────

  describe('genererPdfAttestation', () => {
    beforeEach(() => {
      mockRepo.findDossierById.mockResolvedValue(payeDossier as any);
      mockAudit.info.mockResolvedValue(undefined);
    });

    it('retourne un buffer PDF valide (magic bytes %PDF)', async () => {
      const { buffer, filename } = await service.genererPdfAttestation('dossier-01', 'app-01');
      expect(buffer.toString('utf8', 0, 4)).toBe('%PDF');
      expect(filename).toContain('attestation');
      expect(filename.endsWith('.pdf')).toBe(true);
    });

    it('le nom du fichier est base sur l intitule de la formation', async () => {
      const { filename } = await service.genererPdfAttestation('dossier-01', 'app-01');
      expect(filename).toContain('certification-cloud');
    });

    it('utilise "attestation" comme fallback si formation sans intitule ni titre', async () => {
      mockRepo.findDossierById.mockResolvedValue({
        ...payeDossier,
        formation: { ...payeDossier.formation, intitule: '', titre: undefined },
      } as any);
      const { filename } = await service.genererPdfAttestation('dossier-01', 'app-01');
      // slug = 'attestation' (valeur par defaut), filename = 'attestation-attestation.pdf'
      expect(filename).toMatch(/attestation.*\.pdf/);
    });

    it('propage ATTESTATION_DOSSIER_NON_PAYE si conditions non remplies', async () => {
      mockRepo.findDossierById.mockResolvedValue({ ...payeDossier, statut: 'PAYE_DIRECTEMENT' } as any);
      await expect(service.genererPdfAttestation('dossier-01', 'app-01')).rejects.toThrow('ATTESTATION_DOSSIER_NON_PAYE');
    });

    // BUG-ATT-03 : Le PDF affiche uniquement les prenoms au lieu de "prenoms nom"
    // car la logique est `prenoms || nom` et non `prenoms + ' ' + nom`.
    // genererContenuPDF fait la concatenation correcte mais genererPdfAttestation non.
    it('[BUG-ATT-03] PDF contient le nom complet "prenoms nom" et non seulement les prenoms', async () => {
      const { buffer } = await service.genererPdfAttestation('dossier-01', 'app-01');
      const content = buffer.toString('utf8');
      // Ce test ECHOUE tant que le bug existe : seul "Tidiane" apparait, pas "Tidiane Cisse"
      expect(content).toContain('Tidiane Cisse');
    });
  });

  // ─── genererContenuPDF ────────────────────────────────────────────────────

  describe('genererContenuPDF', () => {
    it('retourne un objet avec uuid, nom complet, formation, dates et cachet', () => {
      const result = service.genererContenuPDF(payeDossier) as any;
      expect(result.nom).toBe('Tidiane Cisse');
      expect(result.formation).toBe('Certification Cloud');
      expect(result.cachet).toBe('GIE FORGES AGRÉGATEUR');
      expect(result.uuid).toBeDefined();
      expect(result.date_generation).toBeDefined();
    });

    it('inclut les dates de session', () => {
      const result = service.genererContenuPDF(payeDossier) as any;
      expect(result.date_debut).toEqual(payeDossier.session.date_debut);
      expect(result.date_fin).toEqual(payeDossier.session.date_fin);
    });

    it('gère un dossier sans apprenant ni formation gracieusement', () => {
      const result = service.genererContenuPDF({}) as any;
      expect(result.nom).toContain('undefined'); // documente le comportement actuel — pas de crash
      expect(result.uuid).toBeDefined();
    });
  });

  // ─── sanitizePdfText (via genererPdfAttestation) ─────────────────────────

  describe('sanitizePdfText (caracteres speciaux)', () => {
    it('supprime les accents du nom de fichier', async () => {
      mockRepo.findDossierById.mockResolvedValue({
        ...payeDossier,
        formation: { ...payeDossier.formation, intitule: 'Sécurité Réseau' },
      } as any);
      const { filename } = await service.genererPdfAttestation('dossier-01', 'app-01');
      expect(filename).not.toContain('é');
      expect(filename).toContain('securite');
    });

    it('echappe les parentheses dans le contenu PDF (evite l injection PDF)', async () => {
      mockRepo.findDossierById.mockResolvedValue({
        ...payeDossier,
        apprenant: { nom: 'O(Brien)', prenoms: 'Patrick' },
      } as any);
      const { buffer } = await service.genererPdfAttestation('dossier-01', 'app-01');
      const content = buffer.toString('utf8');
      // Le nom complet "Patrick O(Brien)" doit avoir ses parentheses echappees
      // pour ne pas corrompre la syntaxe PDF (BT...Tj operators)
      expect(content).toContain('Patrick O\\(Brien\\)');
    });
  });
});
