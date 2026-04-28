process.env.REGISTRATION_RATE_LIMIT_MAX = '5';
process.env.AUTH_RATE_LIMIT_MAX = '5';
process.env.RATE_LIMIT_MAX = '1000';

const request = require('supertest');
const app = require('../../src/app').default;
app.set('trust proxy', 1);

describe('RM-32 — Rate limiting inscription/auth', () => {
  test('RM-32.1 — bloque la 6e tentative inscription apprenant par IP', async () => {
    for (let index = 0; index < 5; index += 1) {
      const res = await request(app)
        .post('/api/apprenants/register')
        .set('X-Forwarded-For', '203.0.113.32')
        .send({ email: `rm32-app-${index}@forges.test` });

      expect(res.status).not.toBe(429);
    }

    const blocked = await request(app)
      .post('/api/apprenants/register')
      .set('X-Forwarded-For', '203.0.113.32')
      .send({ email: 'rm32-app-blocked@forges.test' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('RATE_LIMIT');
  });

  test('RM-32.2 — bloque aussi les inscriptions organisation sur /api/organisations/register', async () => {
    for (let index = 0; index < 5; index += 1) {
      const res = await request(app)
        .post('/api/organisations/register')
        .set('X-Forwarded-For', '203.0.113.33')
        .send({ email: `rm32-org-${index}@forges.test` });

      expect(res.status).not.toBe(429);
    }

    const blocked = await request(app)
      .post('/api/organisations/register')
      .set('X-Forwarded-For', '203.0.113.33')
      .send({ email: 'rm32-org-blocked@forges.test' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('RATE_LIMIT');
  });

  test('RM-32.3 — protège les routes auth sensibles', async () => {
    for (let index = 0; index < 5; index += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '203.0.113.34')
        .send({ email: `unknown-${index}@forges.test`, password: 'bad-password' });

      expect(res.status).not.toBe(429);
    }

    const blocked = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.34')
      .send({ email: 'unknown-blocked@forges.test', password: 'bad-password' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('RATE_LIMIT');
  });
});
