import { Request, Response, NextFunction } from 'express';
import { PartenaireService } from './partenaire.service';
import { ValidationFormationService } from './validation-formation.service';
import {
  AutoInscriptionPartenaireSchema, SoumettreFormationSchema,
  ValiderFormationSchema, RejeterFormationSchema
} from './dto/partenaire.dto';
import { UpdateProfilPartenaireSchema } from './dto/profil.dto';

export class PartenaireController {
  constructor(
    private readonly partenaireService: PartenaireService,
    private readonly validationService: ValidationFormationService,
  ) {}

  // POST /api/partenaires/register — public (RM-126 Flux B)
  async autoInscrire(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = AutoInscriptionPartenaireSchema.parse(req.body);
      const result = await this.partenaireService.autoInscrire(dto);
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'EMAIL_ALREADY_EXISTS') return res.status(409).json({ statusCode: 409, error: 'EMAIL_ALREADY_EXISTS' });
      next(error);
    }
  }

  // POST /api/partenaires/activate — public (RM-126 Flux A)
  async activerViaToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;
      const result = await this.partenaireService.activerViaToken(token, password);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'TOKEN_INVALID') return res.status(404).json({ statusCode: 404, error: 'TOKEN_INVALID' });
      if (error.message === 'TOKEN_EXPIRE') return res.status(410).json({ statusCode: 410, error: 'TOKEN_EXPIRE' });
      next(error);
    }
  }

  // POST /api/partenaires/formations — PARTENAIRE (UCS17, RM-136)
  async soumettreFormation(req: Request, res: Response, next: NextFunction) {
    try {
      const champsForgesOnly = ['type_formation', 'pilier_abonnement', 'inclus_abonnement', 'commission_forges_pct'];
      const champsInterdits = champsForgesOnly.filter((champ) =>
        Object.prototype.hasOwnProperty.call(req.body ?? {}, champ)
      );
      if (champsInterdits.length > 0) {
        return res.status(400).json({
          statusCode: 400,
          error: 'TYPE_FORMATION_READONLY',
          message: 'La classification et les champs abonnement sont assignes exclusivement par FORGES.',
          details: { fields: champsInterdits },
        });
      }

      const dto = SoumettreFormationSchema.parse(req.body);
      const result = await this.partenaireService.soumettreFormation(dto, req.user!.userId);
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'PARTENAIRE_INACTIF') return res.status(403).json({ statusCode: 403, error: 'PARTENAIRE_INACTIF' });
      next(error);
    }
  }

  // GET /api/partenaires/dashboard — PARTENAIRE (RM-130)
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.partenaireService.getDashboard(req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) { next(error); }
  }

  // GET /api/responsable/validations — RESPONSABLE (UCS18)
  async getFormationsEnAttente(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.validationService.getFormationsEnAttente(req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) { next(error); }
  }

  // PUT /api/responsable/validations/:id/valider — RESPONSABLE (UCS18, RM-127, RM-137)
  async validerFormation(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = ValiderFormationSchema.parse(req.body);
      const result = await this.validationService.valider(req.params.id, {
        type_formation: dto.type_formation,
        pilier_abonnement: dto.pilier_abonnement,
        prix_coutant_valide: dto.prix_coutant_valide,
        responsable_id: req.user!.userId
      });
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'FP_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'FP_NOT_FOUND' });
      if (error.message === 'RESPONSABLE_NON_DESIGNE') return res.status(403).json({
        statusCode: 403,
        error: 'RESPONSABLE_NON_DESIGNE',
        message: 'Vous n\'êtes pas le Responsable désigné pour ce Partenaire (RM-128).'
      });
      if (error.message === 'FORMATION_DEJA_TRAITEE') return res.status(409).json({ statusCode: 409, error: 'FORMATION_DEJA_TRAITEE' });
      next(error);
    }
  }

  // PUT /api/responsable/validations/:id/rejeter — RESPONSABLE (UCS18, RM-128)
  async rejeterFormation(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = RejeterFormationSchema.parse(req.body);
      const result = await this.validationService.rejeter(
        req.params.id, dto.motif, dto.corrections_suggeres, req.user!.userId
      );
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'FP_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'FP_NOT_FOUND' });
      if (error.message === 'MOTIF_OBLIGATOIRE') return res.status(400).json({
        statusCode: 400,
        error: 'MOTIF_OBLIGATOIRE',
        message: 'Un motif de rejet est obligatoire (RM-128).'
      });
      if (error.message === 'RESPONSABLE_NON_DESIGNE') return res.status(403).json({ statusCode: 403, error: 'RESPONSABLE_NON_DESIGNE' });
      next(error);
    }
  }

  // GET /api/responsable/validations/:id — RESPONSABLE (détail formation à valider)
  async getValidationDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.validationService.getDetail(req.params.id);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'FP_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'FP_NOT_FOUND' });
      next(error);
    }
  }

  // PUT /api/responsable/validations/:id/suspendre — RESPONSABLE (RM-131)
  async suspendreFormationValidation(req: Request, res: Response, next: NextFunction) {
    try {
      const motif: string = req.body?.motif_suspension || req.body?.motif || '';
      if (!motif || motif.trim().length < 5) {
        return res.status(400).json({
          statusCode: 400,
          error: 'MOTIF_OBLIGATOIRE',
          message: 'Motif de suspension obligatoire (min 5 caractères).'
        });
      }
      const result = await this.validationService.suspendreParFp(req.params.id, motif, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'FP_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'FP_NOT_FOUND' });
      if (error.message === 'FORMATION_NON_ACTIVE') return res.status(409).json({ statusCode: 409, error: 'FORMATION_NON_ACTIVE' });
      next(error);
    }
  }

  // PUT /api/responsable/validations/:id/reactiver — RESPONSABLE (RM-131)
  async reactiverFormationValidation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.validationService.reactiverParFp(req.params.id, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'FP_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'FP_NOT_FOUND' });
      if (error.message === 'FORMATION_NON_SUSPENDUE') return res.status(409).json({ statusCode: 409, error: 'FORMATION_NON_SUSPENDUE' });
      next(error);
    }
  }

  // GET /api/partenaires/formations — PARTENAIRE (liste mes formations)
  async getMesFormations(req: Request, res: Response, next: NextFunction) {
    try {
      const formations = await this.partenaireService.getMesFormations(req.user!.userId, req.query);
      res.status(200).json({ statusCode: 200, data: formations });
    } catch (error: any) {
      next(error);
    }
  }

  // GET /api/partenaires/formations/:id — PARTENAIRE (détail formation)
  async getFormationDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const formation = await this.partenaireService.getFormationDetail(req.params.id, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: formation });
    } catch (error: any) {
      if (error.message === 'FORMATION_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'FORMATION_NOT_FOUND' });
      if (error.message === 'NOT_YOUR_FORMATION') return res.status(403).json({ statusCode: 403, error: 'NOT_YOUR_FORMATION' });
      next(error);
    }
  }

  // PUT /api/partenaires/formations/:id — PARTENAIRE (éditer brouillon)
  async editerFormationBrouillon(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = SoumettreFormationSchema.parse(req.body);
      const result = await this.partenaireService.editerFormationBrouillon(req.params.id, dto, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'FORMATION_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'FORMATION_NOT_FOUND' });
      if (error.message === 'NOT_BROUILLON') return res.status(400).json({
        statusCode: 400,
        error: 'NOT_BROUILLON',
        message: 'Seules les formations en brouillon peuvent être éditées'
      });
      if (error.message === 'NOT_YOUR_FORMATION') return res.status(403).json({ statusCode: 403, error: 'NOT_YOUR_FORMATION' });
      next(error);
    }
  }

  // PUT /api/partenaires/formations/:id/soumettre — PARTENAIRE (soumettre brouillon)
  async soumettreFormationBrouillon(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.partenaireService.soumettreFormationBrouillon(req.params.id, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'FORMATION_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'FORMATION_NOT_FOUND' });
      if (error.message === 'NOT_BROUILLON') return res.status(400).json({
        statusCode: 400,
        error: 'NOT_BROUILLON',
        message: 'Seules les formations en brouillon peuvent être soumises'
      });
      if (error.message === 'NOT_YOUR_FORMATION') return res.status(403).json({ statusCode: 403, error: 'NOT_YOUR_FORMATION' });
      next(error);
    }
  }

  // GET /api/partenaires/reversements — PARTENAIRE (mes reversements RM-138)
  async getMesReversements(req: Request, res: Response, next: NextFunction) {
    try {
      const reversements = await this.partenaireService.getMesReversements(req.user!.userId, req.query);
      res.status(200).json({ statusCode: 200, data: reversements });
    } catch (error: any) {
      next(error);
    }
  }

  async getProfil(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.partenaireService.getProfil(req.user!.userId, req.user);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') return res.status(403).json({ statusCode: 403, error: 'FORBIDDEN' });
      if (error.message === 'PARTENAIRE_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'PARTENAIRE_NOT_FOUND' });
      next(error);
    }
  }

  async updateProfil(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = UpdateProfilPartenaireSchema.parse(req.body);
      const result = await this.partenaireService.updateProfil(req.user!.userId, dto, req.user);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'FORBIDDEN') return res.status(403).json({ statusCode: 403, error: 'FORBIDDEN' });
      if (error.message === 'PARTENAIRE_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'PARTENAIRE_NOT_FOUND' });
      if (error.message === 'EMAIL_ALREADY_EXISTS') return res.status(409).json({ statusCode: 409, error: 'EMAIL_ALREADY_EXISTS' });
      next(error);
    }
  }
}
