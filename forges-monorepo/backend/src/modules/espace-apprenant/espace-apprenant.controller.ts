import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { UpdateProgressionFormationDemandeSchema } from './espace-apprenant.dto';
import { EspaceApprenantService } from './espace-apprenant.service';

export class EspaceApprenantController {
  constructor(private readonly espaceService: EspaceApprenantService) {}

  async getMesAttestations(req: Request, res: Response, next: NextFunction) {
    try {
      const attestations = await this.espaceService.getMesAttestations(req.user!.userId);
      res.status(200).json({ statusCode: 200, data: attestations });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/apprenant/dossiers — APPRENANT
  async getMesDossiers(req: Request, res: Response, next: NextFunction) {
    try {
      const dossiers = await this.espaceService.getMesDossiers(req.user!.userId);
      res.json(dossiers);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/apprenant/dossiers/:id — APPRENANT (RM-27)
  async annulerDossier(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.espaceService.annulerDossier(req.params.id, req.user!.userId);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'DOSSIER_NOT_FOUND') return res.status(404).json({ error: 'DOSSIER_NOT_FOUND' });
      if (error.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
      if (error.message === 'DOSSIER_RETENU_CONTACT_RESPONSABLE') return res.status(409).json({
        error: 'DOSSIER_RETENU_CONTACT_RESPONSABLE',
        message: 'Un dossier Retenu ne peut pas être annulé directement. Contactez le Responsable (RM-27).'
      });
      if (error.message === 'DOSSIER_PAYE_NON_ANNULABLE') return res.status(409).json({
        error: 'DOSSIER_PAYE_NON_ANNULABLE',
        message: 'Impossible d\'annuler un dossier payé (RM-27).'
      });
      if (error.message === 'ANNULATION_IMPOSSIBLE') return res.status(409).json({ error: 'ANNULATION_IMPOSSIBLE' });
      next(error);
    }
  }

  // GET /api/apprenant/attestations/:dossierId — APPRENANT (RM-26)
  async getAttestationUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.espaceService.getAttestationPdf(req.params.dossierId, req.user!.userId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.status(200).send(result.buffer);
    } catch (error: any) {
      if (error.message === 'DOSSIER_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'DOSSIER_NOT_FOUND' });
      if (error.message === 'INVALID_ENCRYPTION_KEY') return res.status(500).json({
        statusCode: 500,
        error: 'INVALID_ENCRYPTION_KEY',
        message: 'Configuration de chiffrement invalide pour générer le lien d’attestation.'
      });
      if (error.message === 'ATTESTATION_DOSSIER_NON_PAYE') return res.status(403).json({
        statusCode: 403,
        error: 'ATTESTATION_DOSSIER_NON_PAYE',
        message: 'L\'attestation est disponible uniquement pour les dossiers Payés (RM-26).'
      });
      if (error.message === 'ATTESTATION_SESSION_NON_CLOTUREE') return res.status(403).json({
        statusCode: 403,
        error: 'ATTESTATION_SESSION_NON_CLOTUREE',
        message: 'L\'attestation sera disponible à la clôture de la session (RM-26).'
      });
      next(error);
    }
  }

  // GET /api/apprenant/formations-demande — APPRENANT (UCS14)
  async getMesFormationsDemande(req: Request, res: Response, next: NextFunction) {
    try {
      const formations = await this.espaceService.getMesFormationsDemande(req.user!.userId);
      res.json(formations);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/apprenant/formations-demande/:accesId — APPRENANT (Détail accès)
  async getAccesFormationDemande(req: Request, res: Response, next: NextFunction) {
    try {
      const acces = await this.espaceService.getAccesFormationDemande(
        req.params.accesId,
        req.user!.userId
      );
      res.json(acces);
    } catch (error: any) {
      if (error.message === 'ACCES_NON_TROUVE') return res.status(404).json({ error: 'ACCES_NON_TROUVE' });
      if (error.message === 'ACCES_EXPIRE') return res.status(410).json({
        error: 'ACCES_EXPIRE',
        message: 'Votre accès à cette formation a expiré (RM-92).'
      });
      if (error.message === 'ACCES_SUSPENDU_ABONNEMENT_INACTIF') return res.status(403).json({
        error: 'ACCES_SUSPENDU_ABONNEMENT_INACTIF',
        message: 'Votre accès est suspendu. Réactivez votre abonnement (RM-103).'
      });
      next(error);
    }
  }

  // PATCH /api/apprenant/formations-demande/:accesId/progression — APPRENANT (UCS14)
  async updateProgressionFormationDemande(req: Request, res: Response, next: NextFunction) {
    try {
      const { progression } = UpdateProgressionFormationDemandeSchema.parse(req.body);
      const updated = await this.espaceService.updateProgressionFormationDemande(
        req.params.accesId,
        req.user!.userId,
        progression
      );

      res.status(200).json({ statusCode: 200, data: updated });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'La progression doit être un entier compris entre 0 et 100.',
        });
      }

      if (error.message === 'ACCES_NON_TROUVE') return res.status(404).json({ error: 'ACCES_NON_TROUVE' });
      if (error.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
      if (error.message === 'ACCES_NON_MODIFIABLE') {
        return res.status(409).json({
          error: 'ACCES_NON_MODIFIABLE',
          message: 'La progression ne peut être modifiée que pour un accès ACTIF.',
        });
      }

      next(error);
    }
  }
}
