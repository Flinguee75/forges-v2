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
  voucherOrganisation: {
    count: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  dossier: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  paiement: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockAudit = { info: jest.fn(), error: jest.fn() };
const mockEmail = { sendEmail: jest.fn(), sendEmailWithAttachment: jest.fn() };

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
  mockEmail.sendEmailWithAttachment.mockResolvedValue(undefined);
  mockAudit.info.mockResolvedValue(undefined);
  mockPrisma.voucherOrganisation.count.mockResolvedValue(0);
  mockPrisma.voucherOrganisation.create.mockImplementation((args: any) => ({
    id: `v-${Math.random().toString(36).slice(2)}`,
    ...args.data,
  }));
    mockPrisma.voucherOrganisation.findMany.mockResolvedValue([]);
    mockPrisma.voucherOrganisation.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.dossier.findMany.mockResolvedValue([]);
    mockPrisma.dossier.update.mockResolvedValue({});
    mockPrisma.paiement.findUnique.mockResolvedValue(null);
    mockPrisma.paiement.create.mockResolvedValue({});
    mockPrisma.paiement.update.mockResolvedValue({});
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

    it('logue DEVIS_CREE sans envoyer de mail à la création', async () => {
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
      expect(mockEmail.sendEmail).not.toHaveBeenCalled();
      expect(mockEmail.sendEmailWithAttachment).not.toHaveBeenCalled();
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

// ─────────────────────────────────────────────────────────────────────────────
// RM-152/153/154 — génération vouchers + cascade paiement
// ─────────────────────────────────────────────────────────────────────────────

const devisCreeFix = {
  id: 'devis-anssi',
  numero_devis: 'FORGES-DEVIS-2026-001',
  statut: 'CREE',
  organisation_id: 'org-anssi',
  formation_id: 'f-cyber',
  nb_places: 3,
  montant_total_xof: 6000000,
};

describe('DevisService — genererVouchersDevis (RM-152)', () => {
  it('crée nb_places vouchers EN_ATTENTE liés au devis', async () => {
    mockDevisRepo.findById.mockResolvedValue(devisCreeFix);
    mockPrisma.voucherOrganisation.count.mockResolvedValue(0);

    const service = makeService();
    const result = await service.genererVouchersDevis('devis-anssi', 'admin-01');

    expect(result.nb_generes).toBe(3);
    expect(result.vouchers).toHaveLength(3);
    expect(mockPrisma.voucherOrganisation.create).toHaveBeenCalledTimes(3);
    expect(mockPrisma.voucherOrganisation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          devis_id: 'devis-anssi',
          organisation_id: 'org-anssi',
          formation_id: 'f-cyber',
          statut: 'EN_ATTENTE',
          valeur: 100,
          type_valeur: 'POURCENTAGE',
          quota_max: 1,
        }),
      })
    );
    expect(mockAudit.info).toHaveBeenCalledWith('DEVIS_VOUCHERS_GENERES', expect.objectContaining({ nb_generes: 3 }));
  });

  it('lève DEVIS_NOT_FOUND si devis inexistant', async () => {
    mockDevisRepo.findById.mockResolvedValue(null);

    const service = makeService();
    await expect(service.genererVouchersDevis('missing', 'admin-01')).rejects.toThrow('DEVIS_NOT_FOUND');
    expect(mockPrisma.voucherOrganisation.create).not.toHaveBeenCalled();
  });

  it('lève DEVIS_ANNULE si devis annulé', async () => {
    mockDevisRepo.findById.mockResolvedValue({ ...devisCreeFix, statut: 'ANNULE' });

    const service = makeService();
    await expect(service.genererVouchersDevis('devis-anssi', 'admin-01')).rejects.toThrow('DEVIS_ANNULE');
  });

  it('lève DEVIS_DEJA_PAYE si devis déjà payé', async () => {
    mockDevisRepo.findById.mockResolvedValue({ ...devisCreeFix, statut: 'PAYE' });

    const service = makeService();
    await expect(service.genererVouchersDevis('devis-anssi', 'admin-01')).rejects.toThrow('DEVIS_DEJA_PAYE');
  });

  it('lève VOUCHERS_DEJA_GENERES si déjà générés (idempotence)', async () => {
    mockDevisRepo.findById.mockResolvedValue(devisCreeFix);
    mockPrisma.voucherOrganisation.count.mockResolvedValue(3);

    const service = makeService();
    await expect(service.genererVouchersDevis('devis-anssi', 'admin-01')).rejects.toThrow('VOUCHERS_DEJA_GENERES');
    expect(mockPrisma.voucherOrganisation.create).not.toHaveBeenCalled();
  });
});

describe('DevisService — payerDevis cascade vouchers (RM-153/154)', () => {
  it('RM-153 : active les vouchers EN_ATTENTE liés au devis', async () => {
    mockDevisRepo.findById.mockResolvedValue(devisCreeFix);
    mockDevisRepo.payer.mockResolvedValue({ ...devisCreeFix, statut: 'PAYE', paid_at: new Date() });
    mockPrisma.voucherOrganisation.findMany.mockResolvedValue([
      { id: 'v-1' },
      { id: 'v-2' },
      { id: 'v-3' },
    ]);
    mockPrisma.dossier.findMany.mockResolvedValue([]);

    const service = makeService();
    const result = await service.payerDevis('devis-anssi', 'agent-01');

    expect(mockPrisma.voucherOrganisation.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['v-1', 'v-2', 'v-3'] } },
      data: { statut: 'ACTIF' },
    });
    expect(result.vouchers_actives).toBe(3);
    expect(mockAudit.info).toHaveBeenCalledWith('DEVIS_VOUCHERS_ACTIVES', expect.objectContaining({ nb_vouchers_actives: 3 }));
  });

  it('RM-154 : les dossiers liés aux vouchers passent en PAYE automatiquement', async () => {
    mockDevisRepo.findById.mockResolvedValue(devisCreeFix);
    mockDevisRepo.payer.mockResolvedValue({ ...devisCreeFix, statut: 'PAYE', paid_at: new Date() });
    mockPrisma.voucherOrganisation.findMany.mockResolvedValue([{ id: 'v-1' }, { id: 'v-2' }]);
    mockPrisma.dossier.findMany.mockResolvedValue([{ id: 'd-aly' }, { id: 'd-elie' }]);

    const service = makeService();
    await service.payerDevis('devis-anssi', 'agent-01');

    expect(mockPrisma.dossier.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.dossier.update).toHaveBeenCalledWith({
      where: { id: 'd-aly' },
      data: { statut: 'PAYE' },
    });
    expect(mockPrisma.dossier.update).toHaveBeenCalledWith({
      where: { id: 'd-elie' },
      data: { statut: 'PAYE' },
    });
    expect(mockAudit.info).toHaveBeenCalledWith('DOSSIER_PAYE_VIA_DEVIS', expect.objectContaining({ dossier_id: 'd-aly' }));
  });

  it('sans vouchers liés : devis passe quand même PAYE sans erreur', async () => {
    mockDevisRepo.findById.mockResolvedValue(devisCreeFix);
    mockDevisRepo.payer.mockResolvedValue({ ...devisCreeFix, statut: 'PAYE', paid_at: new Date() });
    mockPrisma.voucherOrganisation.findMany.mockResolvedValue([]);

    const service = makeService();
    const result = await service.payerDevis('devis-anssi', 'agent-01');

    expect(result.statut).toBe('PAYE');
    expect(mockPrisma.voucherOrganisation.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.dossier.update).not.toHaveBeenCalled();
    expect(result.vouchers_actives).toBe(0);
  });
});
