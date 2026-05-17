import { Request, Response, NextFunction } from 'express';
import { FormationService } from './formation.service';
import { CreateFormationSchema, AssignerTypeFormationSchema, LierPartenaireSchema, UpdateFormationSchema } from './dto/formation.dto';

export class FormationController {
  constructor(private readonly formationService: FormationService) {}

  private mapFormationForFront(formation: any) {
    if (!formation) return formation;

    // RM-90 : badges selon charte graphique
    let badge: string | undefined;
    let badge_color: string | undefined;
    if (formation.type_formation === 'PREMIUM') {
      badge = 'Premium';
      badge_color = '#6C3483';
    } else if (formation.type_formation === 'SUR_DEVIS') {
      badge = 'Sur devis';
      badge_color = '#E65100';
    }

    return {
      ...formation,
      titre: formation.intitule,
      duree: formation.duree_jours,
      tarif: formation.cout_catalogue,
      description: formation.description_courte,
      image_url: formation.image_url || null,
      badge,
      badge_color,
    };
  }

  // GET /api/formations — Catalogue public avec pagination
  async getCataloguePublic(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, langue } = req.query;

      const result = await this.formationService.getCataloguePublic({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        langue: langue as string | undefined
      });

      // MAPPING : intitule → titre pour le frontend
      const formationsAvecTitre = result.formations.map((f) => this.mapFormationForFront(f));

      res.json({
        statusCode: 200,
        data: formationsAvecTitre,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/catalogue/:id — public
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const formation = await this.formationService.getById(req.params.id);
      const formationMapped = this.mapFormationForFront(formation);

      // RM-88 : Calculer prix_affiche avec réduction -15% si apprenant Premium actif
      if (req.user && formation.type_formation === 'PREMIUM') {
        try {
          const abonnement = await this.formationService.checkAbonnementPremium(req.user.userId);
          if (abonnement) {
            formationMapped.prix_affiche = Math.round(formation.cout_catalogue * 0.85);
          }
        } catch (e) {
          // Ignorer erreur abonnement
        }
      }

      res.status(200).json({ statusCode: 200, data: formationMapped });
    } catch (error: any) {
      if (error.message === 'FORMATION_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'FORMATION_NOT_FOUND' });
      next(error);
    }
  }

  // POST /api/backoffice/formations — ADMIN|RESPONSABLE
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CreateFormationSchema.parse(req.body);
      const formation = await this.formationService.create(dto, req.user!.userId);
      res.status(201).json(formation);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
      next(error);
    }
  }

  // PUT /api/backoffice/formations/:id — ADMIN|RESPONSABLE
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = UpdateFormationSchema.parse(req.body);
      const formation = await this.formationService.update(req.params.id, dto, req.user!.userId);
      res.json(formation);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'FORMATION_NOT_FOUND') return res.status(404).json({ error: 'FORMATION_NOT_FOUND' });
      if (error.message === 'FORMATION_ARCHIVEE') return res.status(403).json({ error: 'FORMATION_ARCHIVEE', message: 'Une formation archivée ne peut pas être modifiée.' });
      if (error.message === 'TARIF_NON_MODIFIABLE_APRES_INSCRIPTION') return res.status(409).json({ error: 'TARIF_NON_MODIFIABLE_APRES_INSCRIPTION', message: 'Le tarif ne peut pas être modifié après la première inscription (RM-12).' });
      next(error);
    }
  }

  // DELETE /api/backoffice/formations/:id — ADMIN (archivage)
  async archiver(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.formationService.archiver(req.params.id, req.user!.userId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error.message === 'FORMATION_NOT_FOUND') return res.status(404).json({ error: 'FORMATION_NOT_FOUND' });
      if (error.message === 'FORMATION_DEJA_ARCHIVEE') return res.status(409).json({ error: 'FORMATION_DEJA_ARCHIVEE' });
      if (error.message === 'FORMATION_HAS_PAYMENTS') return res.status(409).json({ error: 'FORMATION_HAS_PAYMENTS', message: 'Formation avec paiements validés ne peut être supprimée (RM-11).' });
      next(error);
    }
  }

  // PATCH /api/formations/:id/publish — ADMIN
  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.formationService.publish(req.params.id, req.user!.userId);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'FORMATION_NOT_FOUND') return res.status(404).json({ error: 'FORMATION_NOT_FOUND' });
      if (error.message === 'FORMATION_ARCHIVEE') return res.status(403).json({ error: 'FORMATION_ARCHIVEE' });
      next(error);
    }
  }

  // PUT /api/responsable/formations/:id/valider — RESPONSABLE (RM-127)
  async assignerType(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = AssignerTypeFormationSchema.parse(req.body);
      const formation = await this.formationService.assignerType(req.params.id, dto, req.user!.userId);
      res.json(formation);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'FORMATION_NOT_FOUND') return res.status(404).json({ error: 'FORMATION_NOT_FOUND' });
      next(error);
    }
  }

  // PATCH /api/formations/backoffice/:id/lier-partenaire — ADMIN
  async lierPartenaire(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = LierPartenaireSchema.parse(req.body);
      const result = await this.formationService.lierPartenaire(req.params.id, dto, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'FORMATION_NOT_FOUND') return res.status(404).json({ error: 'FORMATION_NOT_FOUND' });
      if (error.message === 'PARTENAIRE_NOT_FOUND') return res.status(404).json({ error: 'PARTENAIRE_NOT_FOUND' });
      if (error.message === 'FORMATION_ARCHIVEE') return res.status(403).json({ error: 'FORMATION_ARCHIVEE', message: 'Une formation archivée ne peut pas être liée.' });
      if (error.message === 'FORMATION_DEJA_LIEE') return res.status(409).json({ error: 'FORMATION_DEJA_LIEE', message: 'Cette formation est déjà liée à un partenaire.' });
      if (error.message === 'PARTENAIRE_INACTIF') return res.status(409).json({ error: 'PARTENAIRE_INACTIF', message: 'Le partenaire doit être actif pour être lié à une formation.' });
      next(error);
    }
  }

  // GET /api/backoffice/formations — ADMIN|RESPONSABLE
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { statut, type_formation, mode_formation, page, limit } = req.query;
      const result = await this.formationService.getAll({
        statut, type_formation, mode_formation,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });
      res.json(result);
    } catch (error) { next(error); }
  }

  // GET /api/formations/backoffice/list — ADMIN|SUPERVISEUR|RESPONSABLE
  async getAllBackoffice(req: Request, res: Response, next: NextFunction) {
    try {
      const { statut, type_formation, mode_formation, search, page, limit } = req.query;
      const result = await this.formationService.getAll({
        statut: statut as string | undefined,
        type_formation: type_formation as string | undefined,
        mode_formation: mode_formation as string | undefined,
        search: search as string | undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      res.status(200).json({
        statusCode: 200,
        data: result.formations.map((formation) => this.mapFormationForFront(formation)),
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/formations/backoffice/:id — ADMIN|SUPERVISEUR|RESPONSABLE
  async getByIdBackoffice(req: Request, res: Response, next: NextFunction) {
    try {
      const formation = await this.formationService.getById(req.params.id);
      res.status(200).json({ statusCode: 200, data: this.mapFormationForFront(formation) });
    } catch (error: any) {
      if (error.message === 'FORMATION_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'FORMATION_NOT_FOUND' });
      next(error);
    }
  }

  // POST /api/formations/:id/acceder — APPRENANT|ORGANISATION (RM-92)
  async accederDemande(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.formationService.accederDemande(
        req.params.id,
        req.user!.userId,
        req.user!.role
      );
      // RM-94 : retourner dans le format attendu par les tests
      res.status(200).json({
        statusCode: 200,
        data: result.acces,
        message: result.message
      });
    } catch (error: any) {
      if (error.message === 'FORMATION_NOT_FOUND') return res.status(404).json({ error: 'FORMATION_NOT_FOUND' });
      if (error.message === 'NOT_A_LA_DEMANDE') return res.status(400).json({
        error: 'NOT_A_LA_DEMANDE',
        message: 'Cette formation n\'est pas disponible à la demande (RM-96).'
      });
      if (error.message === 'NOT_INCLUDED_IN_SUBSCRIPTION') return res.status(402).json({
        error: 'NOT_INCLUDED_IN_SUBSCRIPTION',
        message: 'Cette formation n\'est pas incluse dans votre abonnement (RM-102).'
      });
      if (error.message === 'NO_ACTIVE_SUBSCRIPTION') return res.status(403).json({
        error: 'NO_ACTIVE_SUBSCRIPTION',
        message: 'Vous devez avoir un abonnement actif pour accéder à cette formation.'
      });
      next(error);
    }
  }
}
