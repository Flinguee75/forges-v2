import { EspaceOrganisationController } from '../espace-organisation.controller';
import { EspaceOrganisationService } from '../espace-organisation.service';
import { createMockReq, createMockRes, createNext } from '../../../__tests__/helpers/http';

describe('EspaceOrganisationController', () => {
  let controller: EspaceOrganisationController;
  let service: jest.Mocked<EspaceOrganisationService>;

  beforeEach(() => {
    service = {
      getDashboard: jest.fn(),
      getBeneficiaires: jest.fn(),
      importerBeneficiairesCSV: jest.fn(),
      getMesVouchers: jest.fn(),
      getRapportBailleur: jest.fn(),
      getDashboardB2B: jest.fn(),
      desactiverBeneficiaire: jest.fn(),
      createMembre: jest.fn(),
      commanderVouchers: jest.fn(),
      getSuiviInscriptions: jest.fn(),
      getMesPaiements: jest.fn(),
      getMonProfil: jest.fn(),
      updateMonProfil: jest.fn(),
    } as any;

    controller = new EspaceOrganisationController(service);
  });

  it('retourne le dashboard et mappe une organisation introuvable', async () => {
    const req = createMockReq({ user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } });
    const res = createMockRes();
    const next = createNext();

    service.getDashboard.mockResolvedValueOnce({ stats: {} } as any);
    await controller.getDashboard(req, res, next);
    expect(service.getDashboard).toHaveBeenCalledWith('org-01');
    expect(res.json).toHaveBeenCalledWith({ stats: {} });

    const notFoundRes = createMockRes();
    service.getDashboard.mockRejectedValueOnce(new Error('ORGANISATION_NOT_FOUND'));
    await controller.getDashboard(req, notFoundRes, next);
    expect(notFoundRes.status).toHaveBeenCalledWith(404);
  });

  it('parse les filtres bénéficiaires, le rapport et retourne les vouchers', async () => {
    const req = createMockReq({
      query: { statut: 'PAYE', formation_id: 'formation-01', page: '2', limit: '5' },
      user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' },
    });
    const res = createMockRes();
    const next = createNext();

    service.getBeneficiaires.mockResolvedValueOnce({ dossiers: [], total: 0, page: 2, limit: 5 } as any);
    await controller.getBeneficiaires(req, res, next);
    expect(service.getBeneficiaires).toHaveBeenCalledWith('org-01', {
      statut: 'PAYE',
      formation_id: 'formation-01',
      page: 2,
      limit: 5,
    });

    service.getMesVouchers.mockResolvedValueOnce([{ id: 'voucher-01' }] as any);
    await controller.getMesVouchers(req, res, next);
    expect(service.getMesVouchers).toHaveBeenCalledWith('org-01');
    expect(res.json).toHaveBeenCalledWith([{ id: 'voucher-01' }]);

    service.getRapportBailleur.mockResolvedValueOnce({ url: 'https://example.test/report.pdf' } as any);
    await controller.getRapportBailleur(
      createMockReq({
        query: {
          debut: '2026-01-01',
          fin: '2026-01-31',
          formation_id: 'formation-01',
        },
        user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' },
      }),
      res,
      next
    );
    expect(service.getRapportBailleur).toHaveBeenCalledWith('org-01', {
      debut: new Date('2026-01-01'),
      fin: new Date('2026-01-31'),
      formation_id: 'formation-01',
    });
  });

  it('importe un CSV, bloque sans contenu et mappe le plafond B2B', async () => {
    const next = createNext();
    const missingRes = createMockRes();
    await controller.importerCSV(
      createMockReq({ body: {}, user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
      missingRes,
      next
    );
    expect(missingRes.status).toHaveBeenCalledWith(400);

    const req = createMockReq({
      body: { csv_content: 'nom,prenoms,email\\nDoe,Jane,jane@test.ci' },
      user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' },
    });
    const res = createMockRes();
    service.importerBeneficiairesCSV.mockResolvedValueOnce({ importes: 1 } as any);
    await controller.importerCSV(req, res, next);
    expect(service.importerBeneficiairesCSV).toHaveBeenCalledWith(
      'nom,prenoms,email\\nDoe,Jane,jane@test.ci',
      'org-01',
      'org-01'
    );

    const quotaRes = createMockRes();
    service.importerBeneficiairesCSV.mockRejectedValueOnce(new Error('B2B_PLAFOND_ATTEINT'));
    await controller.importerCSV(req, quotaRes, next);
    expect(quotaRes.status).toHaveBeenCalledWith(409);
  });

  it('retourne le dashboard B2B et désactive un bénéficiaire', async () => {
    const next = createNext();
    const res = createMockRes();

    service.getDashboardB2B.mockResolvedValueOnce({ abonnement: 'ACTIF' } as any);
    await controller.getDashboardB2B(
      createMockReq({ user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
      res,
      next
    );
    expect(service.getDashboardB2B).toHaveBeenCalledWith('org-01');

    const inactiveRes = createMockRes();
    service.getDashboardB2B.mockRejectedValueOnce(new Error('ABONNEMENT_B2B_INACTIF'));
    await controller.getDashboardB2B(
      createMockReq({ user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
      inactiveRes,
      next
    );
    expect(inactiveRes.status).toHaveBeenCalledWith(403);

    service.desactiverBeneficiaire.mockResolvedValueOnce({ message: 'ok' } as any);
    await controller.desactiverBeneficiaire(
      createMockReq({
        params: { id: 'app-01' },
        user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' },
      }),
      res,
      next
    );
    expect(service.desactiverBeneficiaire).toHaveBeenCalledWith('app-01', 'org-01', 'org-01');

    const notFoundRes = createMockRes();
    service.desactiverBeneficiaire.mockRejectedValueOnce(new Error('APPRENANT_NOT_FOUND'));
    await controller.desactiverBeneficiaire(
      createMockReq({
        params: { id: 'app-01' },
        user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' },
      }),
      notFoundRes,
      next
    );
    expect(notFoundRes.status).toHaveBeenCalledWith(404);
  });

  it('createMembre — 201 succes, 409 B2B_PLAFOND_ATTEINT, 409 EMAIL_DEJA_UTILISE', async () => {
    const next = createNext();

    const res1 = createMockRes();
    service.createMembre.mockResolvedValueOnce({ message: 'ok', apprenant: { id: 'app-01' } } as any);
    await controller.createMembre(
      createMockReq({ body: { email: 'n@org.ci', nom: 'D', prenom: 'A' }, user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
      res1, next
    );
    expect(res1.status).toHaveBeenCalledWith(201);

    const res2 = createMockRes();
    service.createMembre.mockRejectedValueOnce(new Error('B2B_PLAFOND_ATTEINT'));
    await controller.createMembre(
      createMockReq({ body: { email: 'n@org.ci' }, user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
      res2, next
    );
    expect(res2.status).toHaveBeenCalledWith(409);

    const res3 = createMockRes();
    service.createMembre.mockRejectedValueOnce(new Error('EMAIL_DEJA_UTILISE'));
    await controller.createMembre(
      createMockReq({ body: { email: 'existant@org.ci' }, user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
      res3, next
    );
    expect(res3.status).toHaveBeenCalledWith(409);
  });

  it('commanderVouchers — 201 succes, 404 FORMATION_NOT_FOUND', async () => {
    const next = createNext();

    const res1 = createMockRes();
    service.commanderVouchers.mockResolvedValueOnce({ message: '3 vouchers crees', vouchers: [{}, {}, {}] } as any);
    await controller.commanderVouchers(
      createMockReq({ body: { formation_id: 'f-01', quantite: 3 }, user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
      res1, next
    );
    expect(res1.status).toHaveBeenCalledWith(201);

    const res2 = createMockRes();
    service.commanderVouchers.mockRejectedValueOnce(new Error('FORMATION_NOT_FOUND'));
    await controller.commanderVouchers(
      createMockReq({ body: { formation_id: 'f-inconnue', quantite: 1 }, user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
      res2, next
    );
    expect(res2.status).toHaveBeenCalledWith(404);
  });

  it('getSuiviInscriptions — 200 succes avec pagination', async () => {
    const next = createNext();
    const res = createMockRes();
    service.getSuiviInscriptions.mockResolvedValueOnce({ dossiers: [], total: 0, page: 1, limit: 20 } as any);

    await controller.getSuiviInscriptions(
      createMockReq({ query: { page: '1', limit: '20' }, user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
      res, next
    );

    expect(service.getSuiviInscriptions).toHaveBeenCalledWith('org-01', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 0 }));
  });

  it('getMesPaiements — 200 succes', async () => {
    const next = createNext();
    const res = createMockRes();
    service.getMesPaiements.mockResolvedValueOnce({ paiements: [], total: 0, page: 1, limit: 20 } as any);

    await controller.getMesPaiements(
      createMockReq({ query: {}, user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
      res, next
    );

    expect(service.getMesPaiements).toHaveBeenCalledWith('org-01', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 0 }));
  });

  it('getMonProfil — 200 succes, 404 ORGANISATION_NOT_FOUND', async () => {
    const next = createNext();

    const res1 = createMockRes();
    service.getMonProfil.mockResolvedValueOnce({ id: 'org-01', raison_sociale: 'TechCorp' } as any);
    await controller.getMonProfil(
      createMockReq({ user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
      res1, next
    );
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ raison_sociale: 'TechCorp' }));

    const res2 = createMockRes();
    service.getMonProfil.mockRejectedValueOnce(new Error('ORGANISATION_NOT_FOUND'));
    await controller.getMonProfil(
      createMockReq({ user: { userId: 'org-inconnue', role: 'ORGANISATION', langue: 'FR' } }),
      res2, next
    );
    expect(res2.status).toHaveBeenCalledWith(404);
  });

  it('updateMonProfil — 200 succes', async () => {
    const next = createNext();
    const res = createMockRes();
    service.updateMonProfil.mockResolvedValueOnce({ message: 'ok', organisation: { id: 'org-01' } } as any);

    await controller.updateMonProfil(
      createMockReq({
        body: { raison_sociale: 'Nouveau nom', email: 'new@org.ci' },
        user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' },
      }),
      res, next
    );

    expect(service.updateMonProfil).toHaveBeenCalledWith('org-01', expect.objectContaining({ raison_sociale: 'Nouveau nom' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'ok' }));
  });
});
