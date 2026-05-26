import { requireOwnership } from '../ownership.middleware';
import { Request, Response, NextFunction } from 'express';

function buildReq(userId: string, params: Record<string, string> = {}): Request {
  return { user: { userId, role: 'APPRENANT' }, params } as any;
}

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
}

describe('requireOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('appelle next() si userId correspond à ownerId résolu', async () => {
    const next = jest.fn();
    const middleware = requireOwnership(async (req) => (req as any).user!.userId);
    await middleware(buildReq('user-01'), mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('retourne 403 si ownerId ne correspond pas', async () => {
    const next = jest.fn();
    const res = mockRes();
    const middleware = requireOwnership(async (_req) => 'other-user');
    await middleware(buildReq('user-01'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'FORBIDDEN' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('retourne 403 si getOwnerId retourne null', async () => {
    const next = jest.fn();
    const res = mockRes();
    const middleware = requireOwnership(async (_req) => null);
    await middleware(buildReq('user-01'), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('retourne 401 si req.user est absent', async () => {
    const next = jest.fn();
    const res = mockRes();
    const req = { params: {} } as any;
    const middleware = requireOwnership(async (_req) => 'some-owner');
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('appelle next(err) si getOwnerId lève une exception', async () => {
    const next = jest.fn();
    const res = mockRes();
    const middleware = requireOwnership(async (_req) => {
      throw new Error('DB_ERROR');
    });
    await middleware(buildReq('user-01'), res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
