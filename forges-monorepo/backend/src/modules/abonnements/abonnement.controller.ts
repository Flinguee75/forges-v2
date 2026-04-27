import { Request, Response, NextFunction } from 'express';
import { AbonnementRetailService } from './retail/abonnement-retail.service';
import { AbonnementOrganisationService } from './organisation/abonnement-organisation.service';
import { AbonnementB2BService } from './b2b/abonnement-b2b.service';

export class AbonnementController {
  constructor(
    private readonly retailService: AbonnementRetailService,
    private readonly orgService: AbonnementOrganisationService,
    private readonly b2bService: AbonnementB2BService,
  ) {}

  // ─── RETAIL ─────────────────────────────────────
  // POST /api/apprenant/abonnements — APPRENANT (UCS11.1)
  async souscrireRetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { offre } = req.body;
      if (!['ESSENTIEL', 'PREMIUM'].includes(offre)) {
        return res.status(400).json({ statusCode: 400, error: 'OFFRE_INVALIDE' });
      }
      const result = await this.retailService.souscrire(req.user!.userId, offre, req.user!.langue || 'FR');
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error: any) {
      if (error.message === 'ABONNEMENT_DEJA_ACTIF') {
        return res.status(409).json({ statusCode: 409, error: 'ABONNEMENT_DEJA_ACTIF' });
      }
      next(error);
    }
  }

  // PUT /api/apprenant/abonnements/upgrade — APPRENANT (RM-79)
  async upgraderRetail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.retailService.upgrader(req.user!.userId, req.user!.langue || 'FR');
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'DEJA_PREMIUM') return res.status(409).json({ statusCode: 409, error: 'DEJA_PREMIUM' });
      next(error);
    }
  }

  // PUT /api/apprenant/abonnements/downgrade — APPRENANT (RM-104)
  async planifierDowngradeRetail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.retailService.planifierDowngrade(req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'DEJA_ESSENTIEL') return res.status(409).json({ statusCode: 409, error: 'DEJA_ESSENTIEL' });
      next(error);
    }
  }

  // PUT /api/apprenant/abonnements/suspendre — APPRENANT (RM-76)
  async suspendreRetail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.retailService.suspendre(req.user!.userId, req.user!.langue || 'FR');
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'SUSPENSION_LIMIT_ATTEINT') return res.status(429).json({
        statusCode: 429,
        error: 'SUSPENSION_LIMIT_ATTEINT',
        message: 'Suspension limitée à 1 fois par trimestre (RM-76).'
      });
      next(error);
    }
  }

  // PUT /api/apprenant/abonnements/resilier — APPRENANT (RM-77)
  async resilierRetail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.retailService.resilier(req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'ABONNEMENT_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'ABONNEMENT_NOT_FOUND' });
      }
      next(error);
    }
  }

  // GET /api/abonnements/retail/me — Mon abonnement retail actif
  async getMonAbonnementRetail(req: Request, res: Response, next: NextFunction) {
    try {
      const abonnement = await this.retailService.getAbonnementActif(req.user!.userId);
      res.status(200).json({ statusCode: 200, data: abonnement || null });
    } catch (error: any) {
      next(error);
    }
  }

  // GET /api/abonnements/retail/formations-incluses — Formations incluses pour l'abonnement actif
  async getFormationsInclusesRetail(req: Request, res: Response, next: NextFunction) {
    try {
      const formations = await this.retailService.getFormationsIncluses(req.user!.userId);
      res.status(200).json({ statusCode: 200, data: formations });
    } catch (error: any) {
      next(error);
    }
  }

  // ─── ORGANISATION ────────────────────────────────
  // GET /api/abonnements/organisation/me — Mon abonnement organisation actif
  async getMonAbonnementOrganisation(req: Request, res: Response, next: NextFunction) {
    try {
      const abonnement = await this.orgService.getAbonnementActif(req.user!.userId);
      res.status(200).json({ statusCode: 200, data: abonnement || null });
    } catch (error: any) {
      next(error);
    }
  }

  // POST /api/organisation/abonnements — ORGANISATION
  async souscrireOrganisation(req: Request, res: Response, next: NextFunction) {
    try {
      const { offre } = req.body;
      const result = await this.orgService.souscrire(req.user!.userId, offre);
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error: any) {
      if (error.message === 'ABONNEMENT_ORG_DEJA_ACTIF') {
        return res.status(409).json({ statusCode: 409, error: 'ABONNEMENT_ORG_DEJA_ACTIF' });
      }
      next(error);
    }
  }

  // ─── B2B ─────────────────────────────────────────
  // GET /api/abonnements/b2b/me — Mon abonnement B2B actif
  async getMonAbonnementB2B(req: Request, res: Response, next: NextFunction) {
    try {
      const abonnement = await this.b2bService.getAbonnementActif(req.user!.userId);
      res.status(200).json({ statusCode: 200, data: abonnement || null });
    } catch (error: any) {
      next(error);
    }
  }

  // POST /api/organisation/abonnements/b2b — ORGANISATION (UCS03.2)
  async souscrireB2B(req: Request, res: Response, next: NextFunction) {
    try {
      const { palier } = req.body;
      const result = await this.b2bService.souscrire(req.user!.userId, palier);
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error: any) {
      if (error.message === 'PALIER_INVALIDE') {
        return res.status(400).json({
          statusCode: 400,
          error: 'PALIER_INVALIDE',
          message: 'Le palier B2B est requis et doit être l’un de STARTER, BUSINESS, ENTERPRISE ou SUR_DEVIS.'
        });
      }
      if (error.message === 'ABONNEMENT_B2B_DEJA_ACTIF') {
        return res.status(409).json({ statusCode: 409, error: 'ABONNEMENT_B2B_DEJA_ACTIF' });
      }
      next(error);
    }
  }

  // PUT /api/organisation/abonnements/b2b/monter-palier — ORGANISATION (RM-68)
  async monterPalierB2B(req: Request, res: Response, next: NextFunction) {
    try {
      const { nouveau_palier } = req.body;
      const result = await this.b2bService.monterPalier(req.user!.userId, nouveau_palier);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'PALIER_INVALIDE') {
        return res.status(400).json({
          statusCode: 400,
          error: 'PALIER_INVALIDE',
          message: 'Le nouveau palier B2B est requis et doit être l’un de STARTER, BUSINESS, ENTERPRISE ou SUR_DEVIS.'
        });
      }
      if (error.message === 'NOUVEAU_PALIER_INFERIEUR') {
        return res.status(400).json({ statusCode: 400, error: 'NOUVEAU_PALIER_INFERIEUR' });
      }
      next(error);
    }
  }

  // POST /api/admin/scheduler/abonnements — ADMIN
  async runScheduler(req: Request, res: Response, next: NextFunction) {
    try {
      const [renouvellements, graces, downgrades, b2bExpires] = await Promise.all([
        this.retailService.traiterRenouvellements(),
        this.retailService.traiterGracesExpires(),
        this.retailService.traiterDowngradesPlanifies(),
        this.b2bService.suspendreB2BExpires(),
      ]);
      res.status(200).json({
        statusCode: 200,
        data: { renouvellements, graces, downgrades, b2b_expires: b2bExpires }
      });
    } catch (error) { next(error); }
  }
}
