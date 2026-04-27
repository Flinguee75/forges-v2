import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ statusCode: 401, error: 'UNAUTHORIZED', message: 'Token manquant' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    const decoded = verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      role: string;
      langue?: string;
    };

    req.user = {
      userId: decoded.sub,
      role: decoded.role,
      langue: decoded.langue,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ statusCode: 401, error: 'TOKEN_EXPIRED', message: 'Token expiré' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ statusCode: 401, error: 'INVALID_TOKEN', message: 'Token invalide' });
    }
    return res.status(401).json({ statusCode: 401, error: 'UNAUTHORIZED' });
  }
};

export const authenticateOptional = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Pas de token = OK, continuer sans user
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      role: string;
      langue?: string;
    };

    req.user = {
      userId: decoded.sub,
      role: decoded.role,
      langue: decoded.langue,
    };

    next();
  } catch (error: any) {
    // Token invalide = continuer sans user
    next();
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ statusCode: 401, error: 'UNAUTHORIZED' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ statusCode: 403, error: 'FORBIDDEN', message: 'Accès refusé' });
    }

    next();
  };
};
