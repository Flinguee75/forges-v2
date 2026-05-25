import { Request, Response, NextFunction } from 'express';

type OwnerResolver = (req: Request) => Promise<string | null>;

export function requireOwnership(getOwnerId: OwnerResolver) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ statusCode: 401, error: 'UNAUTHORIZED' });
      return;
    }
    try {
      const ownerId = await getOwnerId(req);
      if (!ownerId || ownerId !== req.user.userId) {
        res.status(403).json({ statusCode: 403, error: 'FORBIDDEN' });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
