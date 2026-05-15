import { Request, Response, NextFunction } from 'express';
import { VoucherService } from './voucher.service';
import { CreateVoucherSchema, CreateVoucherPromotionnelSchema, ListVouchersQuerySchema } from './dto/create-voucher.dto';
import { ValidateVoucherSchema } from './dto/validate-voucher.dto';

export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  async createVoucher(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CreateVoucherSchema.parse(req.body);
      const voucher = await this.voucherService.createVoucher(dto, req.user!.userId);
      res.status(201).json({ statusCode: 201, data: voucher });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      }
      if (error.message === 'ORGANISATION_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'ORGANISATION_NOT_FOUND' });
      }
      if (error.message === 'ORGANISATION_NOT_ACTIVE') {
        return res.status(403).json({ statusCode: 403, error: 'ORGANISATION_NOT_ACTIVE' });
      }
      if (error.message === 'FORMATION_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'FORMATION_NOT_FOUND' });
      }
      if (error.message === 'DEVIS_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'DEVIS_NOT_FOUND' });
      }
      if (error.message === 'DEVIS_ORGANISATION_MISMATCH') {
        return res.status(409).json({ statusCode: 409, error: 'DEVIS_ORGANISATION_MISMATCH' });
      }
      if (error.message === 'DEVIS_FORMATION_MISMATCH') {
        return res.status(409).json({ statusCode: 409, error: 'DEVIS_FORMATION_MISMATCH' });
      }
      next(error);
    }
  }

  async createPromotionnel(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CreateVoucherPromotionnelSchema.parse(req.body);
      const voucher = await this.voucherService.createVoucherPromotionnel(dto, req.user!.userId);
      res.status(201).json({ statusCode: 201, data: voucher });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      }
      if (error.message === 'FORMATION_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'FORMATION_NOT_FOUND' });
      }
      if (error.message === 'FORMATION_ARCHIVEE') {
        return res.status(409).json({ statusCode: 409, error: 'FORMATION_ARCHIVEE' });
      }
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = ListVouchersQuerySchema.parse(req.query);
      const result = await this.voucherService.list(query, req.user!.role as any, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result.data, meta: result.meta });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      }
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const voucher = await this.voucherService.getById(req.params.id, req.user!.role as any, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: voucher });
    } catch (error: any) {
      if (error.message === 'VOUCHER_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'VOUCHER_NOT_FOUND' });
      }
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ statusCode: 403, error: 'FORBIDDEN' });
      }
      next(error);
    }
  }

  async getByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const voucher = await this.voucherService.getByCode(req.params.code, req.user!.role as any, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: voucher });
    } catch (error: any) {
      if (error.message === 'VOUCHER_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'VOUCHER_NOT_FOUND' });
      }
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ statusCode: 403, error: 'FORBIDDEN' });
      }
      next(error);
    }
  }

  async validateVoucher(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = ValidateVoucherSchema.parse(req.body);
      const apprenantId = dto.apprenant_id || req.user?.userId;
      const result = await this.voucherService.validateVoucher(dto.code, dto.formation_id, apprenantId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR', details: error.errors });
      }
      if (error.message === 'VOUCHER_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'VOUCHER_NOT_FOUND' });
      }
      if (error.message === 'VOUCHER_WRONG_FORMATION') {
        return res.status(422).json({ statusCode: 422, error: 'VOUCHER_WRONG_FORMATION' });
      }
      if (error.message === 'VOUCHER_INACTIVE') {
        return res.status(422).json({ statusCode: 422, error: 'VOUCHER_INACTIVE' });
      }
      if (error.message === 'VOUCHER_QUOTA_EXCEEDED') {
        return res.status(422).json({ statusCode: 422, error: 'VOUCHER_QUOTA_EXCEEDED' });
      }
      if (error.message === 'VOUCHER_EXPIRED') {
        return res.status(422).json({ statusCode: 422, error: 'VOUCHER_EXPIRED' });
      }
      if (error.message === 'VOUCHER_ALREADY_USED') {
        return res.status(422).json({ statusCode: 422, error: 'VOUCHER_ALREADY_USED' });
      }
      next(error);
    }
  }

  async validatePromotionnel(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.voucherService.validateVoucherPromotionnel(req.params.id, req.user!.userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'VOUCHER_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'VOUCHER_NOT_FOUND' });
      if (error.message === 'VOUCHER_NOT_PROMOTIONNEL') return res.status(400).json({ statusCode: 400, error: 'VOUCHER_NOT_PROMOTIONNEL' });
      if (error.message === 'VOUCHER_NOT_BROUILLON') return res.status(409).json({ statusCode: 409, error: 'VOUCHER_NOT_BROUILLON' });
      next(error);
    }
  }

  async rejectPromotionnel(req: Request, res: Response, next: NextFunction) {
    try {
      const motif = typeof req.body?.motif === 'string' ? req.body.motif : undefined;
      const result = await this.voucherService.rejectVoucherPromotionnel(req.params.id, req.user!.userId, motif);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'VOUCHER_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'VOUCHER_NOT_FOUND' });
      if (error.message === 'VOUCHER_NOT_PROMOTIONNEL') return res.status(400).json({ statusCode: 400, error: 'VOUCHER_NOT_PROMOTIONNEL' });
      if (error.message === 'VOUCHER_NOT_BROUILLON') return res.status(409).json({ statusCode: 409, error: 'VOUCHER_NOT_BROUILLON' });
      next(error);
    }
  }

  async checkApporteurCode(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.voucherService.checkApporteurCode(req.params.code, req.query as Record<string, unknown>);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'APPORTEUR_CODE_INVALID') return res.status(422).json({ statusCode: 422, error: 'APPORTEUR_CODE_INVALID' });
      if (error.message === 'VOUCHER_CUMUL_INTERDIT') return res.status(422).json({ statusCode: 422, error: 'VOUCHER_CUMUL_INTERDIT' });
      next(error);
    }
  }

  async updateVoucher(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.voucherService.updateVoucher(req.params.id, req.body);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error: any) {
      if (error.message === 'VOUCHER_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'VOUCHER_NOT_FOUND' });
      next(error);
    }
  }

  async deleteVoucher(req: Request, res: Response, next: NextFunction) {
    try {
      await this.voucherService.deleteVoucher(req.params.id);
      res.status(200).json({ statusCode: 200, message: 'Voucher supprime' });
    } catch (error: any) {
      if (error.message === 'VOUCHER_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'VOUCHER_NOT_FOUND' });
      next(error);
    }
  }

  async getUtilisateurs(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await this.voucherService.getUtilisateurs(req.params.id);
      res.status(200).json({ statusCode: 200, data });
    } catch (error: any) {
      if (error.message === 'VOUCHER_NOT_FOUND') return res.status(404).json({ statusCode: 404, error: 'VOUCHER_NOT_FOUND' });
      next(error);
    }
  }
}
