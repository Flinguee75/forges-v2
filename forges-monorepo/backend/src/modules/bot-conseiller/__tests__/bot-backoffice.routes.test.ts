import express from 'express';
import request from 'supertest';

jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'admin-01', role: 'ADMIN', langue: 'FR' };
    next();
  },
  authorize: (...roles: string[]) => (req: any, res: any, next: any) => {
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'FORBIDDEN' });
    }
  },
}));

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    enqueteCatalogue: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'enq-01',
          utilisateur_id: 'user-01',
          type_utilisateur: 'APPRENANT',
          session_bot_id: 'bot-session-01',
          domaine: 'Développement Web',
          niveau: 'DEBUTANT',
          niveau_cible: 'INTERMEDIAIRE',
          volume: 'PLUSIEURS',
          statut: 'NOUVEAU',
          frequence: 3,
          date_saisie: new Date('2026-01-15'),
        },
        {
          id: 'enq-02',
          utilisateur_id: 'org-01',
          type_utilisateur: 'ORGANISATION',
          domaine: 'Data Science',
          niveau: 'INTERMEDIAIRE',
          niveau_cible: 'AVANCE',
          statut: 'TRAITE',
          frequence: 5,
          date_saisie: new Date('2026-01-20'),
        },
      ]),
      count: jest.fn().mockResolvedValue(2),
    },
    feedbackFormation: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'feedback-01',
          apprenant_id: 'app-01',
          formation_id: 'form-01',
          session_id: 'sess-01',
          note_globale: 4,
          note_contenu: 5,
          note_formateur: 4,
          recommande: true,
          commentaire: 'Très bonne formation',
          canal: 'BOT',
          date_saisie: new Date('2026-01-10'),
          apprenant: {
            nom: 'Dupont',
            prenoms: 'Jean',
            email: 'jean@test.ci',
          },
          formation: {
            intitule: 'React Avancé',
            partenaire: {
              raison_sociale: 'TechAcademy',
            },
          },
        },
        {
          id: 'feedback-02',
          apprenant_id: 'app-02',
          formation_id: 'form-02',
          session_id: null,
          note_globale: 3,
          note_contenu: 3,
          note_formateur: 3,
          recommande: false,
          commentaire: 'Formation correcte',
          canal: 'WEB',
          date_saisie: new Date('2026-01-12'),
          apprenant: {
            nom: 'Martin',
            prenoms: 'Sophie',
            email: 'sophie@test.ci',
          },
          formation: {
            intitule: 'Python Basics',
            partenaire: {
              raison_sociale: 'CodeSchool',
            },
          },
        },
      ]),
      count: jest.fn().mockResolvedValue(2),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

jest.mock('../../../shared/audit/audit.logger', () => ({
  AuditLogger: jest.fn().mockImplementation(() => ({})),
}));

import botRoutes from '../bot.routes';

describe('GET /api/bot/backoffice/enquetes - Route backoffice enquêtes catalogue', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/bot', botRoutes);

  describe('Autorisation', () => {
    it('autorise ADMIN', async () => {
      const response = await request(app)
        .get('/api/bot/backoffice/enquetes')
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Reponse de la route', () => {
    it('retourne la liste des enquetes catalogue', async () => {
      const response = await request(app)
        .get('/api/bot/backoffice/enquetes')
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(Array.isArray(response.body.data.enquetes)).toBe(true);
      expect(response.body.data.enquetes).toHaveLength(2);
      expect(response.body.data).toHaveProperty('meta');
    });

    it('retourne les enquetes avec informations detaillees', async () => {
      const response = await request(app)
        .get('/api/bot/backoffice/enquetes')
        .expect(200);

      const enquete = response.body.data.enquetes[0];
      expect(enquete).toHaveProperty('id');
      expect(enquete).toHaveProperty('domaine');
      expect(enquete).toHaveProperty('niveau');
      expect(enquete).toHaveProperty('statut');
      expect(enquete).toHaveProperty('type_utilisateur');
    });

    it('retourne les metadonnees avec total', async () => {
      const response = await request(app)
        .get('/api/bot/backoffice/enquetes')
        .expect(200);

      expect(response.body.data.meta).toHaveProperty('total', 2);
      expect(response.body.data.meta).toHaveProperty('page');
      expect(response.body.data.meta).toHaveProperty('limit');
    });
  });

  describe('Filtres et pagination', () => {
    it('accepte le filtre par statut', async () => {
      await request(app)
        .get('/api/bot/backoffice/enquetes?statut=NOUVEAU')
        .expect(200);
    });

    it('accepte le filtre par domaine', async () => {
      await request(app)
        .get('/api/bot/backoffice/enquetes?domaine=Web')
        .expect(200);
    });

    it('accepte la pagination', async () => {
      await request(app)
        .get('/api/bot/backoffice/enquetes?page=1&limit=10')
        .expect(200);
    });
  });
});

describe('GET /api/bot/backoffice/feedbacks - Route backoffice feedbacks formations', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/bot', botRoutes);

  describe('Autorisation', () => {
    it('autorise ADMIN', async () => {
      const response = await request(app)
        .get('/api/bot/backoffice/feedbacks')
        .expect(200);

      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Reponse de la route', () => {
    it('retourne la liste des feedbacks', async () => {
      const response = await request(app)
        .get('/api/bot/backoffice/feedbacks')
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(Array.isArray(response.body.data.feedbacks)).toBe(true);
      expect(response.body.data.feedbacks).toHaveLength(2);
      expect(response.body.data).toHaveProperty('meta');
    });

    it('retourne les feedbacks avec informations apprenant et formation', async () => {
      const response = await request(app)
        .get('/api/bot/backoffice/feedbacks')
        .expect(200);

      const feedback = response.body.data.feedbacks[0];
      expect(feedback).toHaveProperty('id');
      expect(feedback).toHaveProperty('note_globale');
      expect(feedback).toHaveProperty('recommande');
      expect(feedback).toHaveProperty('apprenant');
      expect(feedback.apprenant).toHaveProperty('nom');
      expect(feedback.apprenant).toHaveProperty('email');
      expect(feedback).toHaveProperty('formation');
      expect(feedback.formation).toHaveProperty('intitule');
    });

    it('retourne les metadonnees avec statistiques', async () => {
      const response = await request(app)
        .get('/api/bot/backoffice/feedbacks')
        .expect(200);

      expect(response.body.data.meta).toHaveProperty('total', 2);
      expect(response.body.data.meta).toHaveProperty('moyenne_globale');
      expect(response.body.data.meta).toHaveProperty('taux_recommandation');
    });

    it('calcule correctement la moyenne et le taux de recommandation', async () => {
      const response = await request(app)
        .get('/api/bot/backoffice/feedbacks')
        .expect(200);

      const meta = response.body.data.meta;
      // Moyenne de note_globale: (4 + 3) / 2 = 3.5
      expect(meta.moyenne_globale).toBe(3.5);
      // Taux recommandation: 1/2 = 50%
      expect(meta.taux_recommandation).toBe(50);
    });
  });

  describe('Filtres et pagination', () => {
    it('accepte le filtre par note minimale', async () => {
      await request(app)
        .get('/api/bot/backoffice/feedbacks?note_min=4')
        .expect(200);
    });

    it('accepte le filtre par formation', async () => {
      await request(app)
        .get('/api/bot/backoffice/feedbacks?formation_id=form-01')
        .expect(200);
    });

    it('accepte le filtre par canal', async () => {
      await request(app)
        .get('/api/bot/backoffice/feedbacks?canal=BOT')
        .expect(200);
    });

    it('accepte la pagination', async () => {
      await request(app)
        .get('/api/bot/backoffice/feedbacks?page=1&limit=10')
        .expect(200);
    });
  });
});
