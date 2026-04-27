import { NextFunction, Request, Response } from 'express';
import { DashboardService } from './dashboard.service';

function getFilters(req: Request) {
  return {
    date_from: typeof req.query.date_from === 'string' ? req.query.date_from : undefined,
    date_to: typeof req.query.date_to === 'string' ? req.query.date_to : undefined,
    formation_id: typeof req.query.formation_id === 'string' ? req.query.formation_id : undefined,
    session_id: typeof req.query.session_id === 'string' ? req.query.session_id : undefined,
    dossier_statut: typeof req.query.dossier_statut === 'string' ? req.query.dossier_statut : undefined,
    paiement_statut: typeof req.query.paiement_statut === 'string' ? req.query.paiement_statut : undefined,
    methode: typeof req.query.methode === 'string' ? req.query.methode : undefined,
  };
}

export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  async getKPI(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.dashboardService.getKPI(req.user!.role, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  }

  async exportRapport(req: Request, res: Response, next: NextFunction) {
    try {
      const { format = 'PDF', debut, fin } = req.query;
      const periode = debut && fin
        ? { debut: new Date(debut as string), fin: new Date(fin as string) }
        : undefined;

      const rapport = await this.dashboardService.exportRapport(
        req.user!.role,
        req.user!.userId,
        format as 'PDF' | 'EXCEL',
        periode
      );

      res.status(200).json({ statusCode: 200, data: rapport });
    } catch (error) {
      next(error);
    }
  }

  async getGlobalStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.dashboardService.getGlobalStats(req.user!.role, req.user!.userId, getFilters(req));
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getFormationStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.dashboardService.getFormationStats(req.user!.role, req.user!.userId, req.params.id, getFilters(req));
      if (!result) {
        return res.status(404).json({ statusCode: 404, error: 'NOT_FOUND', message: 'Formation introuvable' });
      }
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getSessionStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.dashboardService.getSessionStats(req.user!.role, req.user!.userId, req.params.id, getFilters(req));
      if (!result) {
        return res.status(404).json({ statusCode: 404, error: 'NOT_FOUND', message: 'Session introuvable' });
      }
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getPaiementsStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.dashboardService.getPaiementsStats(req.user!.role, req.user!.userId, getFilters(req));
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getInscriptionsEvolution(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.dashboardService.getInscriptionsEvolution(req.user!.role, req.user!.userId, getFilters(req));
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getPaiementsEvolution(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.dashboardService.getPaiementsEvolution(req.user!.role, req.user!.userId, getFilters(req));
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getRapportsData(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.dashboardService.getRapportsData(req.user!.role, req.user!.userId, getFilters(req));
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  }

  async exportCSV(req: Request, res: Response, next: NextFunction) {
    try {
      const csvData = await this.dashboardService.exportRapportCSV(req.user!.role, req.user!.userId, getFilters(req));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=rapport_forges.csv');
      res.status(200).send(`\uFEFF${csvData}`);
    } catch (error) {
      next(error);
    }
  }

  async exportPDF(req: Request, res: Response, next: NextFunction) {
    try {
      const pdfBuffer = await this.dashboardService.exportRapportPDF(req.user!.role, req.user!.userId, getFilters(req));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=rapport_forges.pdf');
      res.status(200).send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
}
