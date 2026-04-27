import express from 'express';
import request from 'supertest';

jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../shared/audit/audit.logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../voucher.repository', () => ({
  VoucherRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../voucher.service', () => ({
  VoucherService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../voucher.controller', () => ({
  VoucherController: jest.fn().mockImplementation(() => ({
    createVoucher: (_req: any, res: any) => res.status(201).json({ route: 'createVoucher' }),
    createPromotionnel: (_req: any, res: any) => res.status(201).json({ route: 'createPromotionnel' }),
    list: (_req: any, res: any) => res.status(200).json({ route: 'list' }),
    getById: (_req: any, res: any) => res.status(200).json({ route: 'getById' }),
    getByCode: (_req: any, res: any) => res.status(200).json({ route: 'getByCode' }),
    validateVoucher: (_req: any, res: any) => res.status(200).json({ route: 'validateVoucher' }),
    validatePromotionnel: (_req: any, res: any) => res.status(200).json({ route: 'validatePromotionnel' }),
    rejectPromotionnel: (_req: any, res: any) => res.status(200).json({ route: 'rejectPromotionnel' }),
    checkApporteurCode: (_req: any, res: any) => res.status(200).json({ route: 'checkApporteurCode' }),
  })),
}));

import voucherRoutes from '../voucher.routes';

describe('voucher.routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/vouchers', voucherRoutes);

  it('monte les routes vouchers réactivées', async () => {
    await request(app).get('/api/vouchers').expect(200).expect({ route: 'list' });
    await request(app).get('/api/vouchers/voucher-1').expect(200).expect({ route: 'getById' });
    await request(app).get('/api/vouchers/code/code-1').expect(200).expect({ route: 'getByCode' });
    await request(app).post('/api/vouchers/organisation').send({}).expect(201).expect({ route: 'createVoucher' });
    await request(app).post('/api/vouchers/promotionnel').send({}).expect(201).expect({ route: 'createPromotionnel' });
    await request(app).post('/api/vouchers/check').send({}).expect(200).expect({ route: 'validateVoucher' });
    await request(app).patch('/api/vouchers/voucher-1/validate').send({}).expect(200).expect({ route: 'validatePromotionnel' });
    await request(app).patch('/api/vouchers/voucher-1/reject').send({}).expect(200).expect({ route: 'rejectPromotionnel' });
    await request(app).get('/api/vouchers/apporteur/code-1/check').expect(200).expect({ route: 'checkApporteurCode' });
  });
});
