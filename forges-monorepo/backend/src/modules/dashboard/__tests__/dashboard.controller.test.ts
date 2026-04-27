import { DashboardController } from '../dashboard.controller';
import { DashboardService } from '../dashboard.service';
import { createMockReq, createMockRes, createNext } from '../../../__tests__/helpers/http';

describe('DashboardController', () => {
  let controller: DashboardController;
  let mockService: jest.Mocked<DashboardService>;

  beforeEach(() => {
    mockService = {
      getKPI: jest.fn(),
      exportRapport: jest.fn(),
    } as any;
    controller = new DashboardController(mockService);
  });

  it('retourne les KPI du rôle connecté', async () => {
    const req = createMockReq({ user: { userId: 'user-01', role: 'ADMIN', langue: 'FR' } });
    const res = createMockRes();
    const next = createNext();
    mockService.getKPI.mockResolvedValue({ role: 'ADMIN' } as any);

    await controller.getKPI(req, res, next);

    expect(mockService.getKPI).toHaveBeenCalledWith('ADMIN', 'user-01');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: { role: 'ADMIN' } });
  });

  it('exporte un rapport avec période et délègue les erreurs', async () => {
    const req = createMockReq({
      query: { format: 'EXCEL', debut: '2026-01-01', fin: '2026-01-31' },
      user: { userId: 'user-01', role: 'AGENT', langue: 'FR' },
    });
    const res = createMockRes();
    const next = createNext();
    const error = new Error('BOOM');

    mockService.exportRapport.mockResolvedValueOnce({ meta: { format: 'EXCEL' } } as any);
    await controller.exportRapport(req, res, next);
    expect(mockService.exportRapport).toHaveBeenCalledWith('AGENT', 'user-01', 'EXCEL', {
      debut: new Date('2026-01-01'),
      fin: new Date('2026-01-31'),
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: { meta: { format: 'EXCEL' } } });

    mockService.exportRapport.mockRejectedValueOnce(error);
    await controller.exportRapport(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
