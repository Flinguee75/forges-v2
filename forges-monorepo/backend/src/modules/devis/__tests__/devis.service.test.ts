import { DevisService } from '../devis.service';

const mockDevisRepo = {
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  payer: jest.fn(),
  annuler: jest.fn(),
  countParAnnee: jest.fn(),
};

const mockPrisma = {
  organisation: { findUnique: jest.fn() },
  formation: { findUnique: jest.fn() },
  session: { findUnique: jest.fn() },
};

const mockAudit = { info: jest.fn(), error: jest.fn() };
const mockEmail = { sendEmail: jest.fn() };

const orgFixture = {
  id: 'org-01',
  raison_sociale: 'ACME Corp',
  email: 'contact@acme.ci',
  langue_preferee: 'FR',
};

const formationFixture = {
  id: 'f-01',
  intitule: 'Formation Test',
  cout_catalogue: 200000,
};

function makeService() {
  return new DevisService(
    mockDevisRepo as any,
    mockPrisma as any,
    mockAudit as any,
    mockEmail as any
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEmail.sendEmail.mockResolvedValue(undefined);
  mockAudit.info.mockResolvedValue(undefined);
});

describe('DevisService — RM-149 à RM-151', () => {
  describe('creerDevis', () => {
    it('calcule montant_total = nb_places × tarif_unitaire (RM-150)', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue(orgFixture);
      mockPrisma.formation.findUnique.mockResolvedValue(formationFixture);
      mockDevisRepo.countParAnnee.mockResolvedValue(4);
      mockDevisRepo.create.mockImplementation((data: any) => ({ id: 'd-01', ...data }));

      const service = makeService();
      const devis = await service.creerDevis(
        { organisation_id: 'org-01', formation_id: 'f-01', nb_places: 10, tarif_unitaire_xof: 15000 },
        'admin-01'
      );

      expect(devis.montant_total_xof).toBe(150000); // 10 × 15000
      expect(mockDevisRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ montant_total_xof: 150000 })
      );
    });

    it('génère le numéro au format FORGES-DEVIS-YYYY-NNN', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue(orgFixture);
      mockPrisma.formation.findUnique.mockResolvedValue(formationFixture);
      mockDevisRepo.countParAnnee.mockResolvedValue(0);
      mockDevisRepo.create.mockImplementation((data: any) => ({ id: 'd-01', ...data }));

      const service = makeService();
      const devis = await service.creerDevis(
        { organisation_id: 'org-01', formation_id: 'f-01', nb_places: 1, tarif_unitaire_xof: 10000 },
        'admin-01'
      );

      const annee = new Date().getFullYear();
      expect(devis.numero_devis).toBe(`FORGES-DEVIS-${annee}-001`);
    });

    it('séquence padded à 3 chiffres (ex: 012 pour le 12e)', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue(orgFixture);
      mockPrisma.formation.findUnique.mockResolvedValue(formationFixture);
      mockDevisRepo.countParAnnee.mockResolvedValue(11); // 11 existants → 12e
      mockDevisRepo.create.mockImplementation((data: any) => ({ id: 'd-01', ...data }));

      const service = makeService();
      const devis = await service.creerDevis(
        { organisation_id: 'org-01', formation_id: 'f-01', nb_places: 1, tarif_unitaire_xof: 5000 },
        'admin-01'
      );

      const annee = new Date().getFullYear();
      expect(devis.numero_devis).toBe(`FORGES-DEVIS-${annee}-012`);
    });

    it('lève ORGANISATION_NOT_FOUND si organisation inconnue', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue(null);
      mockPrisma.formation.findUnique.mockResolvedValue(formationFixture);

      const service = makeService();
      await expect(
        service.creerDevis({ organisation_id: 'missing', formation_id: 'f-01', nb_places: 1, tarif_unitaire_xof: 1000 }, 'admin-01')
      ).rejects.toThrow('ORGANISATION_NOT_FOUND');
    });

    it('lève FORMATION_NOT_FOUND si formation inconnue', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue(orgFixture);
      mockPrisma.formation.findUnique.mockResolvedValue(null);

      const service = makeService();
      await expect(
        service.creerDevis({ organisation_id: 'org-01', formation_id: 'missing', nb_places: 1, tarif_unitaire_xof: 1000 }, 'admin-01')
      ).rejects.toThrow('FORMATION_NOT_FOUND');
    });

    it('lève SESSION_INVALIDE si session non liée à la formation', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue(orgFixture);
      mockPrisma.formation.findUnique.mockResolvedValue(formationFixture);
      mockPrisma.session.findUnique.mockResolvedValue({ id: 's-01', formation_id: 'autre-formation' });

      const service = makeService();
      await expect(
        service.creerDevis(
          { organisation_id: 'org-01', formation_id: 'f-01', session_id: 's-01', nb_places: 1, tarif_unitaire_xof: 1000 },
          'admin-01'
        )
      ).rejects.toThrow('SESSION_INVALIDE');
    });

    it('logue DEVIS_CREE et envoie un email à l\'organisation', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue(orgFixture);
      mockPrisma.formation.findUnique.mockResolvedValue(formationFixture);
      mockDevisRepo.countParAnnee.mockResolvedValue(0);
      mockDevisRepo.create.mockImplementation((data: any) => ({ id: 'd-01', ...data }));

      const service = makeService();
      await service.creerDevis(
        { organisation_id: 'org-01', formation_id: 'f-01', nb_places: 5, tarif_unitaire_xof: 20000 },
        'admin-01'
      );

      expect(mockAudit.info).toHaveBeenCalledWith('DEVIS_CREE', expect.objectContaining({ organisation_id: 'org-01' }));
      expect(mockEmail.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'contact@acme.ci' })
      );
    });
  });

  describe('payerDevis — RM-150', () => {
    it('passe CREE → PAYE et renseigne paid_at', async () => {
      const devisFixture = { id: 'd-01', numero_devis: 'FORGES-DEVIS-2026-001', statut: 'CREE', organisation_id: 'org-01', montant_total_xof: 50000 };
      mockDevisRepo.findById.mockResolvedValue(devisFixture);
      mockDevisRepo.payer.mockResolvedValue({ ...devisFixture, statut: 'PAYE', paid_at: new Date() });

      const service = makeService();
      const result = await service.payerDevis('d-01', 'agent-01');

      expect(result.statut).toBe('PAYE');
      expect(mockDevisRepo.payer).toHaveBeenCalledWith('d-01', undefined);
      expect(mockAudit.info).toHaveBeenCalledWith('DEVIS_PAYE', expect.objectContaining({ devis_id: 'd-01' }));
    });

    it('lève DEVIS_STATUT_INVALIDE si devis déjà PAYE', async () => {
      mockDevisRepo.findById.mockResolvedValue({ id: 'd-01', statut: 'PAYE' });

      const service = makeService();
      await expect(service.payerDevis('d-01', 'agent-01')).rejects.toThrow('DEVIS_STATUT_INVALIDE');
    });

    it('lève DEVIS_STATUT_INVALIDE si devis ANNULE', async () => {
      mockDevisRepo.findById.mockResolvedValue({ id: 'd-01', statut: 'ANNULE' });

      const service = makeService();
      await expect(service.payerDevis('d-01', 'agent-01')).rejects.toThrow('DEVIS_STATUT_INVALIDE');
    });
  });

  describe('annulerDevis — RM-151', () => {
    it('passe CREE → ANNULE', async () => {
      const devisFixture = { id: 'd-01', numero_devis: 'FORGES-DEVIS-2026-001', statut: 'CREE', organisation_id: 'org-01', montant_total_xof: 50000 };
      mockDevisRepo.findById.mockResolvedValue(devisFixture);
      mockDevisRepo.annuler.mockResolvedValue({ ...devisFixture, statut: 'ANNULE', cancelled_at: new Date() });

      const service = makeService();
      const result = await service.annulerDevis('d-01', 'admin-01');

      expect(result.statut).toBe('ANNULE');
      expect(mockAudit.info).toHaveBeenCalledWith('DEVIS_ANNULE', expect.objectContaining({ devis_id: 'd-01' }));
    });

    it('lève DEVIS_ANNULATION_IMPOSSIBLE si devis PAYE (RM-151)', async () => {
      mockDevisRepo.findById.mockResolvedValue({ id: 'd-01', statut: 'PAYE' });

      const service = makeService();
      await expect(service.annulerDevis('d-01', 'admin-01')).rejects.toThrow('DEVIS_ANNULATION_IMPOSSIBLE');
    });

    it('lève DEVIS_ANNULATION_IMPOSSIBLE si devis déjà ANNULE', async () => {
      mockDevisRepo.findById.mockResolvedValue({ id: 'd-01', statut: 'ANNULE' });

      const service = makeService();
      await expect(service.annulerDevis('d-01', 'admin-01')).rejects.toThrow('DEVIS_ANNULATION_IMPOSSIBLE');
    });

    it('lève DEVIS_NOT_FOUND si id inexistant', async () => {
      mockDevisRepo.findById.mockResolvedValue(null);

      const service = makeService();
      await expect(service.annulerDevis('missing', 'admin-01')).rejects.toThrow('DEVIS_NOT_FOUND');
    });
  });
});
