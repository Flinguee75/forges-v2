import { AbonnementController } from '../abonnement.controller';
import { AbonnementRetailService } from '../retail/abonnement-retail.service';
import { AbonnementOrganisationService } from '../organisation/abonnement-organisation.service';
import { AbonnementB2BService } from '../b2b/abonnement-b2b.service';
import { createMockReq, createMockRes, createNext } from '../../../__tests__/helpers/http';

describe('AbonnementController', () => {
  let controller: AbonnementController;
  let retailService: jest.Mocked<AbonnementRetailService>;
  let orgService: jest.Mocked<AbonnementOrganisationService>;
  let b2bService: jest.Mocked<AbonnementB2BService>;
  let mockPrisma: any;

  beforeEach(() => {
    retailService = {
      souscrire: jest.fn(),
      upgrader: jest.fn(),
      planifierDowngrade: jest.fn(),
      suspendre: jest.fn(),
      resilier: jest.fn(),
      traiterRenouvellements: jest.fn(),
      traiterGracesExpires: jest.fn(),
      traiterDowngradesPlanifies: jest.fn(),
      getFormationsIncluses: jest.fn(),
    } as any;

    orgService = {
      souscrire: jest.fn(),
    } as any;

    b2bService = {
      souscrire: jest.fn(),
      monterPalier: jest.fn(),
      suspendreB2BExpires: jest.fn(),
    } as any;

    mockPrisma = {
      abonnementRetail: { findMany: jest.fn(), count: jest.fn() },
      abonnementOrganisation: { findMany: jest.fn(), count: jest.fn() },
      abonnementB2B: { findMany: jest.fn(), count: jest.fn() },
    } as any;

    controller = new AbonnementController(retailService, orgService, b2bService, mockPrisma);
  });

  it('gère la souscription retail avec validation et conflit métier', async () => {
    const res = createMockRes();
    const next = createNext();
    const req = createMockReq({ body: { offre: 'ESSENTIEL' }, user: { userId: 'app-01', langue: 'FR' } });

    await controller.souscrireRetail(createMockReq({ body: { offre: 'INVALID' } }), res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    retailService.souscrire.mockResolvedValueOnce({ abonnement: { id: 'abo-01' } } as any);
    await controller.souscrireRetail(req, res, next);
    expect(retailService.souscrire).toHaveBeenCalledWith('app-01', 'ESSENTIEL', 'FR');
    expect(res.status).toHaveBeenCalledWith(201);

    retailService.souscrire.mockRejectedValueOnce(new Error('ABONNEMENT_DEJA_ACTIF'));
    await controller.souscrireRetail(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('gère les opérations retail secondaires', async () => {
    const res = createMockRes();
    const next = createNext();
    const req = createMockReq({ user: { userId: 'app-01', langue: 'FR' } });

    retailService.upgrader.mockResolvedValueOnce({ effectif: 'immediat' } as any);
    await controller.upgraderRetail(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: { effectif: 'immediat' } });

    retailService.upgrader.mockRejectedValueOnce(new Error('DEJA_PREMIUM'));
    await controller.upgraderRetail(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);

    retailService.getFormationsIncluses.mockResolvedValueOnce([{ id: 'f-1' }] as any);
    await controller.getFormationsInclusesRetail(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: [{ id: 'f-1' }] });

    retailService.getFormationsIncluses.mockResolvedValueOnce([{ id: 'f-1' }] as any);
    await controller.getFormationsInclusesRetail(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: [{ id: 'f-1' }] });

    retailService.planifierDowngrade.mockResolvedValueOnce({ effectif: new Date('2026-01-01') } as any);
    await controller.planifierDowngradeRetail(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: { effectif: new Date('2026-01-01') } });

    retailService.planifierDowngrade.mockRejectedValueOnce(new Error('DEJA_ESSENTIEL'));
    await controller.planifierDowngradeRetail(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);

    retailService.suspendre.mockResolvedValueOnce({ message: 'ok' } as any);
    await controller.suspendreRetail(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: { message: 'ok' } });

    retailService.suspendre.mockRejectedValueOnce(new Error('SUSPENSION_LIMIT_ATTEINT'));
    await controller.suspendreRetail(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);

    retailService.resilier.mockResolvedValueOnce({ date_fin: new Date('2026-01-01') } as any);
    await controller.resilierRetail(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: { date_fin: new Date('2026-01-01') } });

    retailService.resilier.mockRejectedValueOnce(new Error('ABONNEMENT_NOT_FOUND'));
    await controller.resilierRetail(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('gère les souscriptions organisation et B2B', async () => {
    const res = createMockRes();
    const next = createNext();
    const orgReq = createMockReq({ body: { offre: 'PRO' }, user: { userId: 'org-01', langue: 'FR' } });
    const b2bReq = createMockReq({ body: { palier: 'BUSINESS' }, user: { userId: 'org-01', langue: 'FR' } });

    orgService.souscrire.mockResolvedValueOnce({ id: 'abo-org-01' } as any);
    await controller.souscrireOrganisation(orgReq, res, next);
    expect(res.status).toHaveBeenCalledWith(201);

    orgService.souscrire.mockRejectedValueOnce(new Error('ABONNEMENT_ORG_DEJA_ACTIF'));
    await controller.souscrireOrganisation(orgReq, res, next);
    expect(res.status).toHaveBeenCalledWith(409);

    b2bService.souscrire.mockResolvedValueOnce({ id: 'abo-b2b-01' } as any);
    await controller.souscrireB2B(b2bReq, res, next);
    expect(res.status).toHaveBeenCalledWith(201);

    const b2bError = new Error('B2B_FAIL');
    b2bService.souscrire.mockRejectedValueOnce(b2bError);
    await controller.souscrireB2B(b2bReq, res, next);
    expect(next).toHaveBeenCalledWith(b2bError);
  });

  it('gère la montée de palier B2B et le scheduler global', async () => {
    const res = createMockRes();
    const next = createNext();
    const req = createMockReq({ body: { nouveau_palier: 'ENTERPRISE' }, user: { userId: 'org-01', langue: 'FR' } });

    b2bService.monterPalier.mockResolvedValueOnce({ nouveau_palier: 'ENTERPRISE' } as any);
    await controller.monterPalierB2B(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: { nouveau_palier: 'ENTERPRISE' } });

    b2bService.monterPalier.mockRejectedValueOnce(new Error('NOUVEAU_PALIER_INFERIEUR'));
    await controller.monterPalierB2B(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    retailService.traiterRenouvellements.mockResolvedValueOnce({ renouveles: 1, echecs: 0 } as any);
    retailService.traiterGracesExpires.mockResolvedValueOnce(2 as never);
    retailService.traiterDowngradesPlanifies.mockResolvedValueOnce(1 as never);
    b2bService.suspendreB2BExpires.mockResolvedValueOnce(3 as never);

    await controller.runScheduler(createMockReq({ user: { userId: 'admin-01' } }), res, next);

    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: {
        renouvellements: { renouveles: 1, echecs: 0 },
        graces: 2,
        downgrades: 1,
        b2b_expires: 3,
      },
    });
  });
});
