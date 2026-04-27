const { auth, createApprenantAccount, ids, prisma, request, API_URL } = require('./helpers');

describe('[RM-02] Minimal test',  () => {
  test('Simple inscription', async () => {
    try {
      const apprenant = await createApprenantAccount('rm02-minimal');
      console.log('Apprenant created:', apprenant.id);

      const headers = await auth(apprenant);
      console.log('Auth token obtained');

      const res = await request(API_URL)
        .post(`/api/sessions/${ids.standardSession}/inscrire`)
        .set(headers)
        .send({ source_financement: 'RETAIL' });

      console.log('Status:', res.status);
      console.log('Body:', JSON.stringify(res.body, null, 2));

      expect([201, 409]).toContain(res.status);
    } catch (error) {
      console.error('ERROR:', error);
      throw error;
    }
  });
});
