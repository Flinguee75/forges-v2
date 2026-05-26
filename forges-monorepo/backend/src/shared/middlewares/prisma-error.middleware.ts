import { Request, Response, NextFunction } from 'express';

const PRISMA_CODES: Record<string, { status: number; error: string; message: string }> = {
  P2002: { status: 409, error: 'CONFLICT', message: 'Cette ressource existe déjà.' },
  P2025: { status: 404, error: 'NOT_FOUND', message: 'Ressource introuvable.' },
  P2003: { status: 400, error: 'FOREIGN_KEY_CONSTRAINT', message: 'Référence invalide.' },
};

export function prismaErrorMiddleware(
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const mapped = err?.code && PRISMA_CODES[err.code as string];
  if (mapped) {
    res.status(mapped.status).json({
      statusCode: mapped.status,
      error: mapped.error,
      message: mapped.message,
    });
    return;
  }
  next(err);
}
