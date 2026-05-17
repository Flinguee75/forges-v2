import { Request, Response, NextFunction } from 'express';
import { ExportCsvService } from './export-csv.service';
import { PartenaireRepository } from './partenaire.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';

const MOIS_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const audit = new AuditLogger();

export class ExportCsvController {
  constructor(
    private readonly exportCsvService: ExportCsvService,
    private readonly partenaireRepo: PartenaireRepository,
  ) {}

  async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const { mois } = req.query as { mois?: string };

      if (!mois) {
        return res.status(400).json({ statusCode: 400, error: 'MOIS_REQUIS', message: 'Le parametre mois est obligatoire (format YYYY-MM).' });
      }

      if (!MOIS_REGEX.test(mois)) {
        return res.status(400).json({ statusCode: 400, error: 'FORMAT_MOIS_INVALIDE', message: 'Le parametre mois doit etre au format YYYY-MM (ex: 2025-04).' });
      }

      const partenaire = await this.partenaireRepo.findByUserId(req.user!.userId);
      if (!partenaire) {
        return res.status(404).json({ statusCode: 404, error: 'PARTENAIRE_NOT_FOUND' });
      }

      const csv = await this.exportCsvService.genererCsvPartenaire(partenaire.id, mois);

      await audit.info('CSV_PARTENAIRE_EXPORTE', {
        partenaire_id: partenaire.id,
        mois,
        user_id: req.user!.userId,
      });

      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="export-partenaire-${mois}.csv"`,
        'Cache-Control': 'no-store',
      });

      return res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }
}
