import { Request, Response, NextFunction } from 'express';
import { ProxyAccesService } from './proxy-acces.service';

export class ProxyAccesController {
  constructor(private readonly service: ProxyAccesService) {}

  async acceder(req: Request, res: Response, next: NextFunction) {
    try {
      const url = await this.service.acceder(req.params.accesId, req.user!.userId);
      // Redirect vers la vraie URL — jamais stockée ni loguée
      return res.redirect(302, url);
    } catch (error: any) {
      if (error.message === 'ACCES_NOT_FOUND') {
        return res.status(404).json({ statusCode: 404, error: 'ACCES_NOT_FOUND' });
      }
      if (error.message === 'ACCES_FORBIDDEN') {
        return res.status(403).json({ statusCode: 403, error: 'ACCES_FORBIDDEN' });
      }
      if (error.message === 'ACCES_INACTIF') {
        return res.status(403).json({ statusCode: 403, error: 'ACCES_INACTIF', message: 'Accès suspendu ou inactif' });
      }
      if (error.message === 'ACCES_EXPIRE') {
        return res.status(403).json({ statusCode: 403, error: 'ACCES_EXPIRE', message: 'Accès expiré' });
      }
      if (error.message === 'URL_FORMATION_INDISPONIBLE') {
        return res.status(503).json({ statusCode: 503, error: 'URL_FORMATION_INDISPONIBLE', message: 'Le contenu de cette formation n\'est pas encore disponible' });
      }
      next(error);
    }
  }
}
