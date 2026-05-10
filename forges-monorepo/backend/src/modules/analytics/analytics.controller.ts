import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { verify } from 'jsonwebtoken';

const TrackSchema = z.object({
  element: z.string().min(1).max(200),
  page: z.string().min(1).max(500),
  metadata: z.record(z.unknown()).optional(),
});

export class AnalyticsController {
  track(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = TrackSchema.parse(req.body);

      let user_id: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const decoded = verify(authHeader.substring(7), process.env.JWT_SECRET!) as { sub: string };
          user_id = decoded.sub;
        } catch {
          // token invalide ou expiré — event logué anonymement
        }
      }

      const entry = {
        level: 'INFO',
        action: 'USER_CLICK',
        user_id,
        element: dto.element,
        page: dto.page,
        metadata: dto.metadata ?? {},
        timestamp: new Date().toISOString(),
      };
      process.stdout.write(JSON.stringify(entry) + '\n');

      return res.status(200).json({ statusCode: 200, ok: true });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ statusCode: 400, error: 'VALIDATION_ERROR' });
      }
      next(error);
    }
  }
}
