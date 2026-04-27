import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { CreateUserDto, UpdateUserStatusDto, InvitePartenaireDto, CreateApporteurDto } from './dto/admin-user.dto';

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // POST /api/admin/users — ADMIN
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CreateUserDto.parse(req.body);
      const result = await this.adminService.createUser(dto, req.user!.userId);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'EMAIL_ALREADY_EXISTS') return res.status(409).json({ error: 'EMAIL_ALREADY_EXISTS' });
      next(error);
    }
  }

  // PUT /api/admin/users/:id/status — ADMIN
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = UpdateUserStatusDto.parse(req.body);
      const result = await this.adminService.updateUserStatus(req.params.id, dto.statut, req.user!.userId);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'USER_NOT_FOUND') return res.status(404).json({ error: 'USER_NOT_FOUND' });
      if (error.message === 'CANNOT_DEACTIVATE_WITH_ACTIVE_DOSSIERS') return res.status(409).json({ error: 'CANNOT_DEACTIVATE_WITH_ACTIVE_DOSSIERS', message: 'Désactivation impossible : dossiers actifs existants.' });
      next(error);
    }
  }

  // POST /api/admin/partenaires — ADMIN (RM-126)
  async invitePartenaire(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = InvitePartenaireDto.parse(req.body);
      const result = await this.adminService.invitePartenaire(dto, req.user!.userId);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
      next(error);
    }
  }

  // POST /api/admin/apporteurs — ADMIN (RM-141)
  async createApporteur(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CreateApporteurDto.parse(req.body);
      const result = await this.adminService.createApporteur(dto, req.user!.userId);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
      next(error);
    }
  }

  // GET /api/admin/users — ADMIN
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const result = await this.adminService.listUsers(page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async listPartenaires(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string) || '';
      res.json(await this.adminService.listPartenaires(page, limit, search));
    } catch (error) {
      next(error);
    }
  }

  async getPartenaire(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await this.adminService.getPartenaireById(req.params.id));
    } catch (error: any) {
      if (error.message === 'PARTENAIRE_NOT_FOUND') return res.status(404).json({ error: 'PARTENAIRE_NOT_FOUND' });
      next(error);
    }
  }

  async approvePartenaire(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.adminService.approvePartenaire(req.params.id, req.user!.userId, req.body?.responsable_designe_id);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'PARTENAIRE_NOT_FOUND') return res.status(404).json({ error: 'PARTENAIRE_NOT_FOUND' });
      next(error);
    }
  }

  async rejectPartenaire(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.adminService.rejectPartenaire(req.params.id, req.user!.userId);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'PARTENAIRE_NOT_FOUND') return res.status(404).json({ error: 'PARTENAIRE_NOT_FOUND' });
      next(error);
    }
  }

  async suspendPartenaire(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.adminService.suspendPartenaire(req.params.id, req.user!.userId);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'PARTENAIRE_NOT_FOUND') return res.status(404).json({ error: 'PARTENAIRE_NOT_FOUND' });
      next(error);
    }
  }

  async reactivatePartenaire(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.adminService.reactivatePartenaire(req.params.id, req.user!.userId);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'PARTENAIRE_NOT_FOUND') return res.status(404).json({ error: 'PARTENAIRE_NOT_FOUND' });
      next(error);
    }
  }

  async listApporteurs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string) || '';
      res.json(await this.adminService.listApporteurs(page, limit, search));
    } catch (error) {
      next(error);
    }
  }

  async getApporteur(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await this.adminService.getApporteurById(req.params.id));
    } catch (error: any) {
      if (error.message === 'APPORTEUR_NOT_FOUND') return res.status(404).json({ error: 'APPORTEUR_NOT_FOUND' });
      next(error);
    }
  }

  async approveApporteur(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.adminService.approveApporteur(req.params.id, req.user!.userId);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'APPORTEUR_NOT_FOUND') return res.status(404).json({ error: 'APPORTEUR_NOT_FOUND' });
      next(error);
    }
  }
}
