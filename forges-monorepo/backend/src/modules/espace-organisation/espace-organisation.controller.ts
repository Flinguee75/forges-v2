import { Request, Response, NextFunction } from 'express';
import { EspaceOrganisationService } from './espace-organisation.service';

export class EspaceOrganisationController {
  constructor(private readonly orgService: EspaceOrganisationService) {}

  // GET /api/organisation/dashboard — ORGANISATION
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.orgService.getDashboard(req.user!.userId);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'ORGANISATION_NOT_FOUND') return res.status(404).json({ error: 'ORGANISATION_NOT_FOUND' });
      next(error);
    }
  }

  // GET /api/organisation/beneficiaires — ORGANISATION (RM-44)
  async getBeneficiaires(req: Request, res: Response, next: NextFunction) {
    try {
      const { statut, formation_id, page, limit } = req.query;
      const result = await this.orgService.getBeneficiaires(req.user!.userId, {
        statut, formation_id,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });
      res.json(result);
    } catch (error) { next(error); }
  }

  // POST /api/organisation/import-csv — ORGANISATION (RM-59)
  async importerCSV(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.body.csv_content) {
        return res.status(400).json({ error: 'CSV_CONTENT_REQUIS' });
      }
      const result = await this.orgService.importerBeneficiairesCSV(
        req.body.csv_content,
        req.user!.userId,
        req.user!.userId
      );
      res.json(result);
    } catch (error: any) {
      if (error.message === 'B2B_PLAFOND_ATTEINT') return res.status(409).json({
        error: 'B2B_PLAFOND_ATTEINT',
        message: 'Le plafond de votre abonnement B2B est atteint (RM-61).'
      });
      next(error);
    }
  }

  // GET /api/organisation/vouchers — ORGANISATION
  async getMesVouchers(req: Request, res: Response, next: NextFunction) {
    try {
      const { statut, formation_id, page, limit } = req.query;
      const vouchers = await this.orgService.getMesVouchers(req.user!.userId, {
        statut,
        formation_id,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      res.json(vouchers);
    } catch (error) { next(error); }
  }

  // GET /api/organisation/rapport-pdf — ORGANISATION
  async getRapportBailleur(req: Request, res: Response, next: NextFunction) {
    try {
      const { debut, fin, formation_id } = req.query;
      const rapport = await this.orgService.getRapportBailleur(req.user!.userId, {
        debut: debut ? new Date(debut as string) : undefined,
        fin: fin ? new Date(fin as string) : undefined,
        formation_id,
      });
      res.json(rapport);
    } catch (error) { next(error); }
  }

  // GET /api/organisation/dashboard-b2b — ORGANISATION (UCS12.1)
  async getDashboardB2B(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.orgService.getDashboardB2B(req.user!.userId);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'ABONNEMENT_B2B_INACTIF') return res.status(403).json({ error: 'ABONNEMENT_B2B_INACTIF' });
      next(error);
    }
  }

  // DELETE /api/organisation/beneficiaires/:id — ORGANISATION (RM-62)
  async desactiverBeneficiaire(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.orgService.desactiverBeneficiaire(
        req.params.id,
        req.user!.userId,
        req.user!.userId
      );
      res.json(result);
    } catch (error: any) {
      if (error.message === 'APPRENANT_NOT_FOUND') return res.status(404).json({ error: 'APPRENANT_NOT_FOUND' });
      next(error);
    }
  }

  // POST /api/organisation/membres — ORGANISATION
  async createMembre(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.orgService.createMembre(
        req.user!.userId,
        req.body
      );
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message === 'B2B_PLAFOND_ATTEINT') {
        return res.status(409).json({
          error: 'B2B_PLAFOND_ATTEINT',
          message: 'Le plafond de votre abonnement B2B est atteint (RM-61).'
        });
      }
      if (error.message === 'EMAIL_DEJA_UTILISE') {
        return res.status(409).json({ error: 'EMAIL_DEJA_UTILISE' });
      }
      next(error);
    }
  }

  // POST /api/organisation/vouchers/commander — ORGANISATION
  async commanderVouchers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.orgService.commanderVouchers(
        req.user!.userId,
        req.body
      );
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message === 'FORMATION_NOT_FOUND') {
        return res.status(404).json({ error: 'FORMATION_NOT_FOUND' });
      }
      next(error);
    }
  }

  // POST /api/organisation/inscrire-beneficiaire — ORGANISATION (UCS12)
  async inscrireBeneficiaire(req: Request, res: Response, next: NextFunction) {
    try {
      const { beneficiaire_id, session_id, source_financement, voucher_organisation_id } = req.body;
      if (!beneficiaire_id || !session_id || !source_financement) {
        return res.status(400).json({ error: 'CHAMPS_REQUIS_MANQUANTS' });
      }
      const result = await this.orgService.inscrireBeneficiaire(req.user!.userId, {
        beneficiaire_id,
        session_id,
        source_financement,
        voucher_organisation_id,
      });
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message === 'APPRENANT_NON_BENEFICIAIRE') return res.status(403).json({ error: 'APPRENANT_NON_BENEFICIAIRE' });
      if (error.message === 'INSCRIPTION_DEJA_EXISTANTE') return res.status(409).json({ error: 'INSCRIPTION_DEJA_EXISTANTE' });
      if (error.message === 'ABONNEMENT_B2B_INACTIF') return res.status(403).json({ error: 'ABONNEMENT_B2B_INACTIF' });
      if (error.message === 'B2B_PLAFOND_ATTEINT') return res.status(409).json({ error: 'B2B_PLAFOND_ATTEINT' });
      if (error.message === 'VOUCHER_INVALIDE') return res.status(422).json({ error: 'VOUCHER_INVALIDE' });
      next(error);
    }
  }

  // GET /api/organisation/inscriptions — ORGANISATION
  async getSuiviInscriptions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.orgService.getSuiviInscriptions(
        req.user!.userId,
        req.query
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/organisation/paiements — ORGANISATION
  async getMesPaiements(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.orgService.getMesPaiements(
        req.user!.userId,
        req.query
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/organisation/profil — ORGANISATION
  async getMonProfil(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.orgService.getMonProfil(req.user!.userId);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'ORGANISATION_NOT_FOUND') {
        return res.status(404).json({ error: 'ORGANISATION_NOT_FOUND' });
      }
      next(error);
    }
  }

  // PUT /api/organisation/profil — ORGANISATION
  async updateMonProfil(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.orgService.updateMonProfil(
        req.user!.userId,
        req.body
      );
      res.json(result);
    } catch (error: any) {
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        return res.status(409).json({
          statusCode: 409,
          error: 'DUPLICATE_EMAIL',
          message: 'Un compte avec cet email existe déjà.'
        });
      }
      next(error);
    }
  }
}
