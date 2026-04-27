import { Request, Response, NextFunction } from 'express';
import { VoucherService } from './voucher.service';
import { CreateVoucherPromoSchema, RefuserVoucherSchema } from './dto/voucher.dto';

export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  // POST /api/backoffice/vouchers — AGENT (Flux B, RM-39)
  async creerVoucherPromo(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CreateVoucherPromoSchema.parse(req.body);
      const voucher = await this.voucherService.creerVoucherPromo(dto, req.user!.userId);
      res.status(201).json(voucher);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
      next(error);
    }
  }

  // PUT /api/superviseur/vouchers/:id/valider — SUPERVISEUR (RM-39)
  async validerVoucherPromo(req: Request, res: Response, next: NextFunction) {
    try {
      const voucher = await this.voucherService.validerVoucherPromo(req.params.id, req.user!.userId);
      res.json(voucher);
    } catch (error: any) {
      if (error.message === 'VOUCHER_NOT_FOUND') return res.status(404).json({ error: 'VOUCHER_NOT_FOUND' });
      if (error.message === 'VOUCHER_DEJA_TRAITE') return res.status(409).json({ error: 'VOUCHER_DEJA_TRAITE' });
      next(error);
    }
  }

  // PUT /api/superviseur/vouchers/:id/refuser — SUPERVISEUR
  async refuserVoucherPromo(req: Request, res: Response, next: NextFunction) {
    try {
      const { motif } = RefuserVoucherSchema.parse(req.body);
      const voucher = await this.voucherService.refuserVoucherPromo(req.params.id, motif, req.user!.userId);
      res.json(voucher);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
      if (error.message === 'VOUCHER_NOT_FOUND') return res.status(404).json({ error: 'VOUCHER_NOT_FOUND' });
      next(error);
    }
  }

  // GET /api/organisations/:id/vouchers — ORGANISATION
  async getByOrganisation(req: Request, res: Response, next: NextFunction) {
    try {
      const vouchers = await this.voucherService.getByOrganisation(req.params.id);
      res.json(vouchers);
    } catch (error) { next(error); }
  }

  // GET /api/backoffice/vouchers/en-attente — SUPERVISEUR
  async getPromoEnAttente(req: Request, res: Response, next: NextFunction) {
    try {
      const vouchers = await this.voucherService.getPromoEnAttente();
      res.json(vouchers);
    } catch (error) { next(error); }
  }

  // GET /api/vouchers/:code/check — Auth
  async checkCode(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.voucherService.checkCode(req.params.code);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'VOUCHER_INVALIDE') return res.status(404).json({ error: 'VOUCHER_INVALIDE' });
      next(error);
    }
  }

  // POST /api/admin/scheduler/vouchers — ADMIN
  async runScheduler(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await this.voucherService.expirerVouchersExpires();
      res.json({ expires: count });
    } catch (error) { next(error); }
  }
}
