const crypto = require('crypto');
const { accounts, auth, ids, prisma, request, API_URL } = require('./helpers');

describe('RM-157 — Liaison d une formation existante a un partenaire', () => {
  test('admin peut lier une formation existante a un partenaire actif', async () => {
    const suffix = Date.now();
    const formationId = `F-RM157-${crypto.randomUUID()}`;
    const partenaireId = `P-RM157-${suffix}`;

    await prisma.partenaire.create({
      data: {
        id: partenaireId,
        raison_sociale: `Partenaire RM-157 ${suffix}`,
        type: 'ENTREPRISE',
        pays: 'CI',
        email_principal: `part-rm157-${suffix}@forges.test`,
        password_hash: null,
        commission_forges_pct: 25,
        statut: 'ACTIF',
        mode_inscription: 'INVITATION',
        responsable_designe_id: ids.responsable,
      },
    });

    await prisma.formation.create({
      data: {
        id: formationId,
        intitule: `Formation RM-157 ${suffix}`,
        description_courte: 'Formation deja existante a lier',
        description_longue: 'Test RM-157',
        duree_jours: 4,
        cout_catalogue: 180000,
        responsable_id: ids.responsable,
        type_formation: 'STANDARD',
        mode_formation: 'AVEC_SESSION',
        pilier_abonnement: 'RETAIL',
        statut: 'ACTIVE',
        inclus_abonnement: false,
        langues_disponibles: ['FR'],
        certification_delivree: true,
        public_cible: 'Professionnels',
        objectifs_pedagogiques: ['Verifier la liaison partenaire'],
        prerequis: 'Aucun',
      },
    });

    try {
      const headers = await auth(accounts.admin);
      const res = await request(API_URL)
        .patch(`/api/formations/backoffice/${formationId}/lier-partenaire`)
        .set(headers)
        .send({
          partenaire_id: partenaireId,
          prix_coutant_soumis: 120000,
        });

      expect(res.status).toBe(200);
      expect(res.body.statusCode).toBe(200);
      expect(res.body.data.formation_id).toBe(formationId);
      expect(res.body.data.partenaire_id).toBe(partenaireId);

      const formation = await prisma.formation.findUnique({
        where: { id: formationId },
      });
      expect(formation.partenaire_id).toBe(partenaireId);
      expect(formation.statut).toBe('EN_ATTENTE_VALIDATION');

      const fp = await prisma.formationPartenaire.findUnique({
        where: { formation_id: formationId },
      });
      expect(fp).not.toBeNull();
      expect(fp.prix_coutant_soumis).toBe(120000);
      expect(fp.statut_validation).toBe('EN_ATTENTE');

      const duplicate = await request(API_URL)
        .patch(`/api/formations/backoffice/${formationId}/lier-partenaire`)
        .set(headers)
        .send({
          partenaire_id: partenaireId,
        });

      expect(duplicate.status).toBe(409);
      expect(duplicate.body.error).toBe('FORMATION_DEJA_LIEE');
    } finally {
      await prisma.formationPartenaire.deleteMany({ where: { formation_id: formationId } }).catch(() => {});
      await prisma.formation.deleteMany({ where: { id: formationId } }).catch(() => {});
      await prisma.partenaire.deleteMany({ where: { id: partenaireId } }).catch(() => {});
    }
  });

  test('superviseur peut aussi lier une formation existante a un partenaire actif', async () => {
    const suffix = Date.now();
    const formationId = `F-RM157-S-${crypto.randomUUID()}`;
    const partenaireId = `P-RM157-S-${suffix}`;

    await prisma.partenaire.create({
      data: {
        id: partenaireId,
        raison_sociale: `Partenaire RM-157 S ${suffix}`,
        type: 'ENTREPRISE',
        pays: 'CI',
        email_principal: `part-rm157-s-${suffix}@forges.test`,
        password_hash: null,
        commission_forges_pct: 25,
        statut: 'ACTIF',
        mode_inscription: 'INVITATION',
        responsable_designe_id: ids.responsable,
      },
    });

    await prisma.formation.create({
      data: {
        id: formationId,
        intitule: `Formation RM-157 S ${suffix}`,
        description_courte: 'Formation deja existante a lier',
        description_longue: 'Test RM-157 superviseur',
        duree_jours: 4,
        cout_catalogue: 180000,
        responsable_id: ids.responsable,
        type_formation: 'STANDARD',
        mode_formation: 'AVEC_SESSION',
        pilier_abonnement: 'RETAIL',
        statut: 'ACTIVE',
        inclus_abonnement: false,
        langues_disponibles: ['FR'],
        certification_delivree: true,
        public_cible: 'Professionnels',
        objectifs_pedagogiques: ['Verifier la liaison partenaire'],
        prerequis: 'Aucun',
      },
    });

    try {
      const headers = await auth(accounts.superviseur);
      const res = await request(API_URL)
        .patch(`/api/formations/backoffice/${formationId}/lier-partenaire`)
        .set(headers)
        .send({
          partenaire_id: partenaireId,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.partenaire_id).toBe(partenaireId);
    } finally {
      await prisma.formationPartenaire.deleteMany({ where: { formation_id: formationId } }).catch(() => {});
      await prisma.formation.deleteMany({ where: { id: formationId } }).catch(() => {});
      await prisma.partenaire.deleteMany({ where: { id: partenaireId } }).catch(() => {});
    }
  });
});
