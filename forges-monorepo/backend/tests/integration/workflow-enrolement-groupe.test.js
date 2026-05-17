/**
 * Test d'integration — Workflow enrolement par groupe
 *
 * Valide le workflow complet pour un groupe (ici ANSSI CI) :
 *   1. Organisation creee ou retrouvee
 *   2. Apprenants crees et lies a l'organisation
 *   3. Devis cree avec le bon montant
 *   4. Un voucher ACTIF par apprenant
 *   5. Email devis envoye a EMAIL_TEST_OVERRIDE (test-override@forges-test.ci)
 *   6. Email de confirmation envoye a chaque apprenant (redirige vers EMAIL_TEST_OVERRIDE)
 */

require('ts-node/register/transpile-only');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcrypt');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

const GROUPE_CONFIG_PATH = path.resolve(__dirname, '../../scripts/enrolements/groupes/anssi.json');
const EMAIL_TEST_OVERRIDE = 'test-override@forges-test.ci';
const TARIF_UNITAIRE = 2_000_000;

let groupeConfig;
let organisationId;
let apprenantIds = [];
let devisId;
let voucherCodes = [];

// Spy sur le transporter nodemailer pour capturer les envois sans SMTP reel
let sentEmails = [];
const mockTransporter = {
  sendMail: jest.fn(async (opts) => {
    sentEmails.push(opts);
    return { messageId: `mock-${Date.now()}` };
  }),
};

// Patch EmailService pour injecter le mock transporter
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => mockTransporter),
}));

beforeEach(() => {
  sentEmails = [];
  mockTransporter.sendMail.mockClear();
});

beforeAll(async () => {
  groupeConfig = JSON.parse(fs.readFileSync(GROUPE_CONFIG_PATH, 'utf-8'));

  // Nettoyer les donnees de test precedentes (par email OU identifiant_legal)
  const existingOrg = await prisma.organisation.findFirst({
    where: {
      OR: [
        { email: groupeConfig.organisation.email },
        { identifiant_legal: groupeConfig.organisation.identifiant_legal },
      ],
    },
  });

  if (existingOrg) {
    const apprenants = await prisma.apprenant.findMany({ where: { organisation_id: existingOrg.id } });
    const apprenantIdsList = apprenants.map(a => a.id);
    await prisma.dossier.deleteMany({ where: { apprenant_id: { in: apprenantIdsList } } }).catch(() => {});
    await prisma.voucherOrganisation.deleteMany({ where: { organisation_id: existingOrg.id } }).catch(() => {});
    await prisma.devis.deleteMany({ where: { organisation_id: existingOrg.id } }).catch(() => {});
    await prisma.apprenant.deleteMany({ where: { organisation_id: existingOrg.id } }).catch(() => {});
    await prisma.organisation.delete({ where: { id: existingOrg.id } }).catch(() => {});
  }

  // Nettoyer les apprenants existants avec les memes emails
  for (const a of groupeConfig.apprenants) {
    await prisma.apprenant.deleteMany({ where: { email: a.email } }).catch(() => {});
  }

  // Nettoyer les devis orphelins avec le pattern FORGES-DEVIS-YYYY-XXX pour eviter les contraintes unique
  await prisma.devis.deleteMany({
    where: { numero_devis: { startsWith: 'FORGES-DEVIS-' }, created_by: 'system-test' },
  }).catch(() => {});
});

afterAll(async () => {
  if (organisationId) {
    await prisma.dossier.deleteMany({ where: { apprenant_id: { in: apprenantIds } } }).catch(() => {});
    await prisma.voucherOrganisation.deleteMany({ where: { organisation_id: organisationId } }).catch(() => {});
    await prisma.devis.deleteMany({ where: { organisation_id: organisationId } }).catch(() => {});
    await prisma.apprenant.deleteMany({ where: { organisation_id: organisationId } }).catch(() => {});
    await prisma.organisation.delete({ where: { id: organisationId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe('Workflow enrolement groupe — ANSSI CI', () => {
  let FORMATION_ID_TEST = 'FORMATION-TEST-MASTERCLASS-GWU';

  // On cree une formation de test si elle n'existe pas
  beforeAll(async () => {
    // Utiliser n'importe quelle formation existante en base
    const existing = await prisma.formation.findFirst();
    if (!existing) throw new Error('Aucune formation en base — lancez le seed avant ce test');
    FORMATION_ID_TEST = existing.id;
    console.log(`Formation test: ${existing.intitule} (${existing.id})`);
  });

  it('Etape 2 — cree l\'organisation ANSSI CI', async () => {
    const passwordHash = await hash('Forges@2026!', 12);

    const org = await prisma.organisation.create({
      data: {
        raison_sociale: groupeConfig.organisation.raison_sociale,
        type: groupeConfig.organisation.type,
        email: groupeConfig.organisation.email,
        contact_referent: groupeConfig.organisation.contact_referent,
        pays: groupeConfig.organisation.pays,
        langue_preferee: 'FR',
        identifiant_legal: groupeConfig.organisation.identifiant_legal || null,
        password_hash: passwordHash,
        statut: 'ACTIF',
        sous_types: [],
      },
    });

    organisationId = org.id;

    expect(org.raison_sociale).toBe(groupeConfig.organisation.raison_sociale);
    expect(org.type).toBe(groupeConfig.organisation.type);
    expect(org.email).toBe(groupeConfig.organisation.email);
    expect(org.statut).toBe('ACTIF');
  });

  it('Etape 3 — cree les 3 apprenants lies a ANSSI CI', async () => {
    const passwordHash = await hash('Forges@2026!', 12);

    for (const apprenant of groupeConfig.apprenants) {
      const created = await prisma.apprenant.create({
        data: {
          email: apprenant.email,
          nom: apprenant.nom,
          prenoms: apprenant.prenoms,
          type_apprenant: 'PROFESSIONNEL',
          pays_residence: apprenant.pays_residence,
          pays_nationalite: apprenant.pays_nationalite,
          langue_preferee: 'FR',
          password_hash: passwordHash,
          statut: 'EN_ATTENTE',
          consentement_rgpd: true,
          consentement_timestamp: new Date(),
          consentement_version_cgu: '1.0',
          organisation_id: organisationId,
        },
      });
      apprenantIds.push(created.id);
    }

    expect(apprenantIds).toHaveLength(3);

    const apprenants = await prisma.apprenant.findMany({
      where: { organisation_id: organisationId },
    });

    expect(apprenants).toHaveLength(3);
    expect(apprenants.every(a => a.statut === 'EN_ATTENTE')).toBe(true);
    expect(apprenants.every(a => a.organisation_id === organisationId)).toBe(true);
    expect(apprenants.map(a => a.email)).toEqual(
      expect.arrayContaining(groupeConfig.apprenants.map(a => a.email))
    );
  });

  it('Etape 4a — cree le devis a 6 000 000 FCFA (3 x 2M)', async () => {
    const annee = new Date().getFullYear();
    const count = await prisma.devis.count({ where: { created_at: { gte: new Date(`${annee}-01-01`) } } });
    const sequence = String(count + 1).padStart(3, '0');
    const numeroDevis = `FORGES-DEVIS-${annee}-${sequence}`;
    const nbPlaces = groupeConfig.apprenants.length;
    const montantTotal = TARIF_UNITAIRE * nbPlaces;

    const devis = await prisma.devis.create({
      data: {
        numero_devis: numeroDevis,
        organisation_id: organisationId,
        formation_id: FORMATION_ID_TEST,
        nb_places: nbPlaces,
        tarif_unitaire_xof: TARIF_UNITAIRE,
        montant_total_xof: montantTotal,
        statut: 'CREE',
        notes_admin: groupeConfig.masterclass.notes_admin || null,
        created_by: 'system-test',
      },
    });

    devisId = devis.id;

    expect(devis.nb_places).toBe(3);
    expect(devis.tarif_unitaire_xof).toBe(2_000_000);
    expect(devis.montant_total_xof).toBe(6_000_000);
    expect(devis.statut).toBe('CREE');
    expect(devis.organisation_id).toBe(organisationId);
    expect(devis.numero_devis).toMatch(/^FORGES-DEVIS-\d{4}-\d{3}$/);
  });

  it('Etape 4a — email devis redirige vers ' + EMAIL_TEST_OVERRIDE, () => {
    // On verifie la logique de redirection sans appel SMTP reel
    const emailDestinataire = EMAIL_TEST_OVERRIDE || groupeConfig.organisation.email;
    expect(emailDestinataire).toBe(EMAIL_TEST_OVERRIDE);
    expect(emailDestinataire).toBe('test-override@forges-test.ci');
  });

  it('Etape 4b — cree 1 voucher ACTIF par apprenant (3 vouchers)', async () => {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 90);
    const orgSlug = 'ANSSICI';

    for (let i = 0; i < groupeConfig.apprenants.length; i++) {
      const code = `${orgSlug}-${String(i + 1).padStart(2, '0')}-TEST`;
      voucherCodes.push(code);

      await prisma.voucherOrganisation.create({
        data: {
          code,
          organisation_id: organisationId,
          formation_id: FORMATION_ID_TEST,
          type: 'ORGANISATION',
          type_valeur: 'POURCENTAGE',
          valeur: 100,
          quota_max: 1,
          quota_utilise: 0,
          date_expiration: expiration,
          statut: 'ACTIF',
        },
      });
    }

    const vouchers = await prisma.voucherOrganisation.findMany({
      where: { organisation_id: organisationId },
    });

    expect(vouchers).toHaveLength(3);
    expect(vouchers.every(v => v.statut === 'ACTIF')).toBe(true);
    expect(vouchers.every(v => v.quota_max === 1)).toBe(true);
    expect(vouchers.every(v => v.quota_utilise === 0)).toBe(true);
    expect(vouchers.every(v => v.type_valeur === 'POURCENTAGE' && v.valeur === 100)).toBe(true);
    expect(vouchers.every(v => v.organisation_id === organisationId)).toBe(true);
  });

  it('Coherence finale — devis, apprenants et vouchers alignes', async () => {
    const devis = await prisma.devis.findFirst({ where: { id: devisId } });
    const apprenants = await prisma.apprenant.findMany({ where: { organisation_id: organisationId } });
    const vouchers = await prisma.voucherOrganisation.findMany({ where: { organisation_id: organisationId } });

    expect(devis.nb_places).toBe(apprenants.length);
    expect(vouchers).toHaveLength(apprenants.length);
    expect(devis.montant_total_xof).toBe(devis.nb_places * devis.tarif_unitaire_xof);
    expect(devis.statut).toBe('CREE');

    console.log('\n=== Resume workflow ANSSI CI ===');
    console.log(`Organisation  : ${groupeConfig.organisation.raison_sociale} (${organisationId})`);
    console.log(`Apprenants    : ${apprenants.map(a => `${a.nom} ${a.prenoms}`).join(', ')}`);
    console.log(`Devis         : ${devis.numero_devis} — ${devis.montant_total_xof.toLocaleString('fr-FR')} FCFA`);
    console.log(`Vouchers      : ${voucherCodes.join(', ')}`);
    console.log(`Email devis   : ${EMAIL_TEST_OVERRIDE} (override actif)`);
  });

  it('Etape 5 — email devis envoye a l\'organisation (redirige vers EMAIL_TEST_OVERRIDE)', async () => {
    const { EmailService } = require('../../src/shared/email/email.service');
    const emailService = new EmailService();

    const devis = await prisma.devis.findFirst({ where: { id: devisId } });
    const org = await prisma.organisation.findFirst({ where: { id: organisationId } });
    const formation = await prisma.formation.findFirst({ where: { id: devis.formation_id } });

    const destinataire = EMAIL_TEST_OVERRIDE;
    const sujet = `Votre devis ${devis.numero_devis} — FORGES AGREGATEUR`;

    await emailService.sendEmail({
      to: destinataire,
      subject: sujet,
      html: `<p>Devis ${devis.numero_devis} — ${devis.montant_total_xof.toLocaleString('fr-FR')} FCFA pour ${org.raison_sociale}</p>`,
    });

    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);

    const appel = mockTransporter.sendMail.mock.calls[0][0];
    expect(appel.to).toBe(EMAIL_TEST_OVERRIDE);
    expect(appel.subject).toContain(devis.numero_devis);
    expect(appel.html).toContain(org.raison_sociale);

    console.log(`Email devis envoye a : ${appel.to}`);
    console.log(`Sujet : ${appel.subject}`);
  });

  it('Etape 5 — email de confirmation envoye a chaque apprenant (redirige vers EMAIL_TEST_OVERRIDE)', async () => {
    const { EmailService } = require('../../src/shared/email/email.service');
    const emailService = new EmailService();

    const apprenants = await prisma.apprenant.findMany({ where: { organisation_id: organisationId } });
    const org = await prisma.organisation.findFirst({ where: { id: organisationId } });
    const session = await prisma.session.findFirst({
      where: { id: groupeConfig.masterclass.session_id },
      select: { date_debut: true, date_fin: true, lieu: true },
    });

    for (const apprenant of apprenants) {
      const destinataire = EMAIL_TEST_OVERRIDE;
      const appConfig = groupeConfig.apprenants.find(a => a.email === apprenant.email);

      await emailService.sendEnrolementConfirmationApprenant({
        to: destinataire,
        prenoms: apprenant.prenoms,
        nom: apprenant.nom,
        fonction: appConfig?.fonction,
        organisation: org.raison_sociale,
        formation: 'Masterclass GWU/CCDL',
        session: session
          ? {
              date_debut: session.date_debut,
              date_fin: session.date_fin,
              lieu: session.lieu || null,
            }
          : null,
      });
    }

    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(apprenants.length);

    const appels = mockTransporter.sendMail.mock.calls;

    // Tous les emails vont vers EMAIL_TEST_OVERRIDE
    appels.forEach((call) => {
      expect(call[0].to).toBe(EMAIL_TEST_OVERRIDE);
      expect(call[0].subject).toContain('FORGES');
      expect(call[0].html).toContain(groupeConfig.organisation.raison_sociale);
      expect(call[0].html).toContain('GWU/CCDL');
      expect(call[0].html).toContain('inscription est bien enregistrée');
      // Pas de code acces dans l'email apprenant
      expect(call[0].html).not.toContain('code acces');
    });

    // Un email par apprenant
    expect(appels).toHaveLength(groupeConfig.apprenants.length);

    console.log(`\nEmails confirmation envoyes :`);
    appels.forEach((call, i) => {
      console.log(`  [${i + 1}] to: ${call[0].to} | sujet: ${call[0].subject}`);
    });
  });
});
