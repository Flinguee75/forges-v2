const { request, API_URL, prisma, createApprenantAccount, createOrganisationAccount, auth, accounts } = require('./helpers');
const { hash } = require('bcrypt');

describe('RM-28 — Unicité Email (Criticité 5)', () => {

  const testPassword = 'Test@FORGES2026!';
  const createdIds = [];

  // Nettoyer après les tests
  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.apprenant.deleteMany({
        where: { id: { in: createdIds.filter(item => item.type === 'apprenant').map(item => item.id) } }
      });
      await prisma.organisation.deleteMany({
        where: { id: { in: createdIds.filter(item => item.type === 'organisation').map(item => item.id) } }
      });
      await prisma.partenaire.deleteMany({
        where: { id: { in: createdIds.filter(item => item.type === 'partenaire').map(item => item.id) } }
      });
      await prisma.apporteur.deleteMany({
        where: { id: { in: createdIds.filter(item => item.type === 'apporteur').map(item => item.id) } }
      });
    }
    await prisma.$disconnect();
  });

  test('RM-28.1 — Email unique : Apprenant ne peut créer compte avec email existant (Apprenant)', async () => {
    const uniqueEmail = `rm28-app-${Date.now()}@forges.test`;

    // Créer le premier apprenant directement en DB
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const id1 = `app-rm28-1-${suffix}`;
    await prisma.apprenant.create({
      data: {
        id: id1,
        email: uniqueEmail,
        password_hash: await hash(testPassword, 12),
        nom: 'Test',
        prenoms: 'RM28',
        role: 'APPRENANT',
        statut: 'ACTIF',
        type_apprenant: 'APPRENANT',
        niveau_etude: 'LICENCE',
        pays_residence: 'CI',
        pays_nationalite: 'CI',
        langue_preferee: 'FR',
        consentement_rgpd: true,
        consentement_timestamp: new Date(),
        consentement_version_cgu: '1.0',
      },
    });
    createdIds.push({ id: id1, type: 'apprenant' });

    // Tenter de créer un second apprenant avec le même email via API
    const duplicateRes = await request(API_URL)
      .post('/api/apprenants/register')
      .send({
        email: uniqueEmail, // Même email
        password: testPassword,
        nom: 'Duplicate',
        prenoms: 'Test',
        type_apprenant: 'APPRENANT',
        niveau_etude: 'LICENCE',
        pays_residence: 'CI',
        pays_nationalite: 'CI',
        consentement_rgpd: true,
        consentement_version_cgu: '1.0',
      });

    // RM-28 : Email déjà utilisé → rejet 409
    if (duplicateRes.status !== 409) {
      console.log('RM-28.1 error:', duplicateRes.status, duplicateRes.body);
    }
    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error).toBe('EMAIL_ALREADY_EXISTS');
  });

  test('RM-28.2 — Email unique : Organisation ne peut créer compte avec email existant (Organisation)', async () => {
    const orgEmail = `rm28-org-${Date.now()}@forges.test`;

    // Créer la première organisation directement en DB
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const id1 = `org-rm28-1-${suffix}`;
    await prisma.organisation.create({
      data: {
        id: id1,
        raison_sociale: 'Organisation Test RM28',
        email: orgEmail,
        password_hash: await hash(testPassword, 12),
        type: 'ENTREPRISE',
        sous_types: ['FORMATION'],
        identifiant_legal: `RM28-ORG-${suffix}`,
        contact_referent: 'Contact RH',
        pays: 'CI',
        langue_preferee: 'FR',
        statut: 'ACTIF',
        date_fin_essai: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    createdIds.push({ id: id1, type: 'organisation' });

    // Tenter de créer une seconde organisation avec le même email via API
    const duplicateRes = await request(API_URL)
      .post('/api/organisations/register')
      .send({
        email: orgEmail, // Même email
        password: testPassword,
        raison_sociale: 'Organisation Duplicate',
        type: 'ENTREPRISE',
        sous_types: ['FORMATION'],
        identifiant_legal: `RM28-DUP-${Date.now()}`,
        contact_referent: 'Contact Test',
        pays: 'CI',
        consentement_rgpd: true,
      });

    // RM-28 : Email déjà utilisé → rejet 409
    if (duplicateRes.status !== 409) {
      console.log('RM-28.2 error:', duplicateRes.status, duplicateRes.body);
    }
    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error).toBe('EMAIL_ALREADY_EXISTS');
  });

  test('RM-28.3 — Email unique cross-rôles : Apprenant ne peut utiliser email Organisation', async () => {
    const crossEmail = `rm28-cross-${Date.now()}@forges.test`;

    // Créer une organisation d'abord (directement en DB)
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const orgId = `org-rm28-cross-${suffix}`;
    await prisma.organisation.create({
      data: {
        id: orgId,
        raison_sociale: 'Organisation Cross RM28',
        email: crossEmail,
        password_hash: await hash(testPassword, 12),
        type: 'ENTREPRISE',
        sous_types: ['FORMATION'],
        identifiant_legal: `RM28-CROSS-ORG-${suffix}`,
        contact_referent: 'Contact RH',
        pays: 'CI',
        langue_preferee: 'FR',
        statut: 'ACTIF',
        date_fin_essai: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    createdIds.push({ id: orgId, type: 'organisation' });

    // Tenter de créer un apprenant avec le même email via API
    const apprenantRes = await request(API_URL)
      .post('/api/apprenants/register')
      .send({
        email: crossEmail, // Email déjà utilisé par Organisation
        password: testPassword,
        nom: 'Test',
        prenoms: 'Cross',
        type_apprenant: 'APPRENANT',
        niveau_etude: 'LICENCE',
        pays_residence: 'CI',
        pays_nationalite: 'CI',
        consentement_rgpd: true,
        consentement_version_cgu: '1.0',
      });

    // RM-28 : Email unique tous rôles confondus → rejet 409
    if (apprenantRes.status !== 409) {
      console.log('RM-28.3 error:', apprenantRes.status, apprenantRes.body);
    }
    expect(apprenantRes.status).toBe(409);
    expect(apprenantRes.body.error).toBe('EMAIL_ALREADY_EXISTS');
  });

  test('RM-28.4 — Email unique cross-rôles : Organisation ne peut utiliser email Apprenant', async () => {
    const crossEmail2 = `rm28-cross2-${Date.now()}@forges.test`;

    // Créer un apprenant d'abord (directement en DB)
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const appId = `app-rm28-cross2-${suffix}`;
    await prisma.apprenant.create({
      data: {
        id: appId,
        email: crossEmail2,
        password_hash: await hash(testPassword, 12),
        nom: 'Test',
        prenoms: 'Cross2',
        role: 'APPRENANT',
        statut: 'ACTIF',
        type_apprenant: 'APPRENANT',
        niveau_etude: 'LICENCE',
        pays_residence: 'CI',
        pays_nationalite: 'CI',
        langue_preferee: 'FR',
        consentement_rgpd: true,
        consentement_timestamp: new Date(),
        consentement_version_cgu: '1.0',
      },
    });
    createdIds.push({ id: appId, type: 'apprenant' });

    // Tenter de créer une organisation avec le même email via API
    const orgRes = await request(API_URL)
      .post('/api/organisations/register')
      .send({
        email: crossEmail2, // Email déjà utilisé par Apprenant
        password: testPassword,
        raison_sociale: 'Organisation Cross2 RM28',
        type: 'ENTREPRISE',
        sous_types: ['FORMATION'],
        identifiant_legal: `RM28-CROSS2-ORG-${Date.now()}`,
        contact_referent: 'Contact RH',
        pays: 'CI',
        consentement_rgpd: true,
      });

    // RM-28 : Email unique tous rôles confondus → rejet 409
    if (orgRes.status !== 409) {
      console.log('RM-28.4 error:', orgRes.status, orgRes.body);
    }
    expect(orgRes.status).toBe(409);
    expect(orgRes.body.error).toBe('EMAIL_ALREADY_EXISTS');
  });

  test('RM-28.5 — Admin ne peut inviter Partenaire avec email Apprenant existant', async () => {
    const crossEmail = `rm28-part-${Date.now()}@forges.test`;

    // Créer un apprenant d'abord (directement en DB)
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const appId = `app-rm28-part-${suffix}`;
    await prisma.apprenant.create({
      data: {
        id: appId,
        email: crossEmail,
        password_hash: await hash(testPassword, 12),
        nom: 'Test',
        prenoms: 'RM28Part',
        role: 'APPRENANT',
        statut: 'ACTIF',
        type_apprenant: 'APPRENANT',
        niveau_etude: 'LICENCE',
        pays_residence: 'CI',
        pays_nationalite: 'CI',
        langue_preferee: 'FR',
        consentement_rgpd: true,
        consentement_timestamp: new Date(),
        consentement_version_cgu: '1.0',
      },
    });
    createdIds.push({ id: appId, type: 'apprenant' });

    // Tenter d'inviter un partenaire avec le même email via API Admin
    const adminHeaders = await auth(accounts.admin);
    const partRes = await request(API_URL)
      .post('/api/admin/partenaires')
      .set(adminHeaders)
      .send({
        email: crossEmail,
        raison_sociale: 'Partenaire Test RM28',
        type: 'ENTREPRISE_FORMATION',
        commission_forges_pct: 20,
      });

    // RM-28 : Email unique tous rôles confondus → rejet 500 avec EMAIL_ALREADY_EXISTS
    if (partRes.status !== 500 || !partRes.body.error?.includes('EMAIL_ALREADY_EXISTS')) {
      console.log('RM-28.5 error:', partRes.status, partRes.body);
    }
    expect(partRes.status).toBe(500);
    expect(partRes.body.error).toContain('EMAIL_ALREADY_EXISTS');
  });

  test('RM-28.6 — Admin ne peut créer Apporteur avec email Organisation existant', async () => {
    const crossEmail = `rm28-apt-${Date.now()}@forges.test`;

    // Créer une organisation d'abord (directement en DB)
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const orgId = `org-rm28-apt-${suffix}`;
    await prisma.organisation.create({
      data: {
        id: orgId,
        raison_sociale: 'Organisation RM28 Apporteur',
        email: crossEmail,
        password_hash: await hash(testPassword, 12),
        type: 'ENTREPRISE',
        sous_types: ['FORMATION'],
        identifiant_legal: `RM28-APT-ORG-${suffix}`,
        contact_referent: 'Contact RH',
        pays: 'CI',
        langue_preferee: 'FR',
        statut: 'ACTIF',
        date_fin_essai: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    createdIds.push({ id: orgId, type: 'organisation' });

    // Tenter de créer un apporteur avec le même email via API Admin
    const adminHeaders = await auth(accounts.admin);
    const aptRes = await request(API_URL)
      .post('/api/admin/apporteurs')
      .set(adminHeaders)
      .send({
        nom: 'Apporteur Test RM28',
        email: crossEmail,
        type: 'INDIVIDU',
        taux_commission_pct: 5,
      });

    // RM-28 : Email unique tous rôles confondus → rejet 500 avec EMAIL_ALREADY_EXISTS
    if (aptRes.status !== 500 || !aptRes.body.error?.includes('EMAIL_ALREADY_EXISTS')) {
      console.log('RM-28.6 error:', aptRes.status, aptRes.body);
    }
    expect(aptRes.status).toBe(500);
    expect(aptRes.body.error).toContain('EMAIL_ALREADY_EXISTS');
  });

  test('RM-28.7 — Apporteur ne peut s\'inscrire avec email Partenaire existant', async () => {
    const crossEmail = `rm28-apt-self-${Date.now()}@forges.test`;

    // Créer un partenaire d'abord (directement en DB)
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const partId = `part-rm28-apt-${suffix}`;
    await prisma.partenaire.create({
      data: {
        id: partId,
        email_principal: crossEmail,
        raison_sociale: 'Partenaire RM28',
        type: 'ENTREPRISE',
        pays: 'CI',
        statut: 'ACTIF',
        mode_inscription: 'INVITATION_ADMIN',
      },
    });
    createdIds.push({ id: partId, type: 'partenaire' });

    // Tenter d'inscrire un apporteur avec le même email via API publique
    const aptRes = await request(API_URL)
      .post('/api/apporteurs/register')
      .send({
        nom: 'Apporteur Self RM28',
        email: crossEmail,
        password: testPassword,
        type: 'INDIVIDU',
        telephone: '+2250101010101',
      });

    // RM-28 : Email unique tous rôles confondus → rejet 409 avec EMAIL_ALREADY_EXISTS
    if (aptRes.status !== 409) {
      console.log('RM-28.7 error:', aptRes.status, aptRes.body);
    }
    expect(aptRes.status).toBe(409);
    expect(aptRes.body.error).toBe('EMAIL_ALREADY_EXISTS');
  });
});
