import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AbonnementRetailService } from './retail/abonnement-retail.service';
import { AbonnementOrganisationService } from './organisation/abonnement-organisation.service';
import { AbonnementB2BService } from './b2b/abonnement-b2b.service';
import { TARIFS_RETAIL } from './retail/abonnement-retail.repository';

export class AbonnementController {
  constructor(
    private readonly retailService: AbonnementRetailService,
    private readonly orgService: AbonnementOrganisationService,
    private readonly b2bService: AbonnementB2BService,
    private readonly prisma: PrismaClient,
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
      // result contient { abonnement, montant_premier_mois, payment_url, order_ngser }
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
      res.status(200).json({ statusCode: 200, data: abonnement ?? null });
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
      res.status(201).json({
        statusCode: 201,
        data: { ...result.abonnement, payment_url: result.payment_url, order_ngser: result.order_ngser },
      });
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
      res.status(201).json({
        statusCode: 201,
        data: { ...result.abonnement, payment_url: result.payment_url, order_ngser: result.order_ngser },
      });
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
      const [renouvellements, graces, downgrades, b2bExpires, organisations] = await Promise.all([
        this.retailService.traiterRenouvellements(),
        this.retailService.traiterGracesExpires(),
        this.retailService.traiterDowngradesPlanifies(),
        this.b2bService.suspendreB2BExpires(),
        this.orgService.traiterRenouvellements(),
      ]);
      res.status(200).json({
        statusCode: 200,
        data: { renouvellements, graces, downgrades, b2b_expires: b2bExpires, organisations }
      });
    } catch (error) { next(error); }
  }

  // GET /api/backoffice/abonnements — ADMIN, SUPERVISEUR, AGENT
  // Vue consolidée de tous les abonnements (retail + organisation + b2b)
  async getAllAbonnementsBackoffice(req: Request, res: Response, next: NextFunction) {
    try {
      const { statut, type, page = 1, limit = 20, date_debut, date_fin } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Filtres communs
      const where: any = {};
      if (statut) {
        where.statut = statut;
      }
      if (date_debut || date_fin) {
        where.date_debut = {};
        if (date_debut) where.date_debut.gte = new Date(date_debut as string);
        if (date_fin) where.date_debut.lte = new Date(date_fin as string);
      }

      // Charger les 3 types d'abonnements en parallèle
      const [retail, organisation, b2b, totalRetail, totalOrg, totalB2B] = await Promise.all([
        (!type || type === 'retail') ? this.prisma.abonnementRetail.findMany({
          where,
          include: {
            apprenant: {
              select: {
                nom: true,
                prenoms: true,
                email: true,
              },
            },
          },
          skip,
          take: limitNum,
          orderBy: { date_debut: 'desc' },
        }) : [],
        (!type || type === 'organisation') ? this.prisma.abonnementOrganisation.findMany({
          where,
          include: {
            organisation: {
              select: {
                raison_sociale: true,
                email: true,
              },
            },
          },
          skip,
          take: limitNum,
          orderBy: { date_debut: 'desc' },
        }) : [],
        (!type || type === 'b2b') ? this.prisma.abonnementB2B.findMany({
          where,
          include: {
            organisation: {
              select: {
                raison_sociale: true,
                email: true,
              },
            },
          },
          skip,
          take: limitNum,
          orderBy: { date_debut: 'desc' },
        }) : [],
        (!type || type === 'retail') ? this.prisma.abonnementRetail.count({ where }) : 0,
        (!type || type === 'organisation') ? this.prisma.abonnementOrganisation.count({ where }) : 0,
        (!type || type === 'b2b') ? this.prisma.abonnementB2B.count({ where }) : 0,
      ]);

      res.status(200).json({
        statusCode: 200,
        data: {
          retail,
          organisation,
          b2b,
          meta: {
            total_retail: totalRetail,
            total_organisation: totalOrg,
            total_b2b: totalB2B,
            page: pageNum,
            limit: limitNum,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/backoffice/abonnements/contrat-institutionnel — ADMIN
  // GET /api/abonnements/tarifs — Public (landing page, no auth)
  getTarifsPublic(req: Request, res: Response) {
    return res.status(200).json({
      statusCode: 200,
      data: {
        retail: {
          ESSENTIEL: TARIFS_RETAIL.ESSENTIEL,
          PREMIUM: TARIFS_RETAIL.PREMIUM,
        },
      },
    });
  }

  async getContratsInstitutionnelsBackoffice(req: Request, res: Response, next: NextFunction) {
    try {
      const { statut, search, page = 1, limit = 20 } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (statut) {
        where.statut = statut;
      }
      if (search) {
        const query = String(search);
        where.OR = [
          { numero_contrat: { contains: query, mode: 'insensitive' } },
          { institution_nom: { contains: query, mode: 'insensitive' } },
          { programme_id: { contains: query, mode: 'insensitive' } },
          { bailleur: { contains: query, mode: 'insensitive' } },
        ];
      }

      const [contrats, total, actifs, brouillons, expires] = await Promise.all([
        this.prisma.contratInstitutionnel.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { date_fin: 'asc' },
        }),
        this.prisma.contratInstitutionnel.count({ where }),
        this.prisma.contratInstitutionnel.count({ where: { statut: 'ACTIF' } }),
        this.prisma.contratInstitutionnel.count({ where: { statut: 'BROUILLON' } }),
        this.prisma.contratInstitutionnel.count({ where: { statut: 'EXPIRE' } }),
      ]);

      res.status(200).json({
        statusCode: 200,
        data: {
          contrats,
          meta: {
            total,
            page: pageNum,
            limit: limitNum,
          },
          stats: {
            actifs,
            brouillons,
            expires,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
