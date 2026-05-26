import { prismaErrorMiddleware } from '../prisma-error.middleware';
import { Request, Response, NextFunction } from 'express';

function mockRes() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
  return res as Response;
}

describe('prismaErrorMiddleware', () => {
  const req = {} as Request;
  const next: NextFunction = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('transforme P2002 en 409 CONFLICT', () => {
    const err = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      meta: { target: ['email'] },
    });
    const res = mockRes();
    prismaErrorMiddleware(err as any, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'CONFLICT' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('transforme P2025 en 404 NOT_FOUND', () => {
    const err = Object.assign(new Error('Record not found'), { code: 'P2025' });
    const res = mockRes();
    prismaErrorMiddleware(err as any, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'NOT_FOUND' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('transforme P2003 en 400 FOREIGN_KEY_CONSTRAINT', () => {
    const err = Object.assign(new Error('Foreign key constraint failed'), { code: 'P2003' });
    const res = mockRes();
    prismaErrorMiddleware(err as any, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'FOREIGN_KEY_CONSTRAINT' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('passe les erreurs métier normales à next()', () => {
    const err = new Error('DOSSIER_NOT_FOUND');
    const res = mockRes();
    prismaErrorMiddleware(err as any, req, res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passe les erreurs avec code Prisma inconnu à next()', () => {
    const err = Object.assign(new Error('unknown'), { code: 'P9999' });
    const res = mockRes();
    prismaErrorMiddleware(err as any, req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
