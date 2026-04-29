/**
 * seed-demo-pejedec.js — Démo Ministère de la Jeunesse / PEJEDEC
 * Schéma : conforme Specs v4.8 (Apprenant autonome, intitule, cout_catalogue)
 *
 * Contexte :
 *   - Programme PEJEDEC (IDA/Banque Mondiale Phase 3)
 *   - 50 bénéficiaires seedés
 *   - Jean KOUASSI (BEN-01) : SANS dossier → pour démo live inscription
 *   - Formation GWU Cybersécurité CCDL à 2 000 000 XOF
 *   - Vouchers PEJEDEC-GWU-2026-001 à 010 (10 codes actifs quota 1)
 *
 * Usage :
 *   node prisma/seed-demo-pejedec.js
 *   node prisma/seed-demo-pejedec.js --reset
 *   node prisma/seed-demo-pejedec.js --check
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;
const RESET = process.argv.includes('--reset');
const CHECK = process.argv.includes('--check');

const PASS_ADMIN   = 'FORGES@PEJEDEC2026!';
const PASS_BEN     = 'PEJEDEC@2026!';

// Codes voucher PEJEDEC fixes et mémorisables
const VOUCHER_CODES = [
  'PEJEDEC-GWU-2026-001',
  'PEJEDEC-GWU-2026-002',
  'PEJEDEC-GWU-2026-003',
  'PEJEDEC-GWU-2026-004',
  'PEJEDEC-GWU-2026-005',
  'PEJEDEC-GWU-2026-006',
  'PEJEDEC-GWU-2026-007',
  'PEJEDEC-GWU-2026-008',
  'PEJEDEC-GWU-2026-009',
  'PEJEDEC-GWU-2026-010',
];

// 50 bénéficiaires ivoiriens réalistes
const BENEFICIAIRES = [
  // BEN-01 = Jean KOUASSI — SANS dossier (pour démo live)
  { id: 'BEN-01', nom: 'KOUASSI', prenoms: 'Jean Luc', email: 'jean.kouassi.pejedec@forges-demo.ci', avec_dossier: false },
  { id: 'BEN-02', nom: 'DIALLO',  prenoms: 'Aminata',  email: 'aminata.diallo.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-03', nom: 'KONE',    prenoms: 'Seydou',   email: 'seydou.kone.pejedec@forges-demo.ci',   avec_dossier: true },
  { id: 'BEN-04', nom: 'OUATTARA', prenoms: 'Mariam',  email: 'mariam.ouattara.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-05', nom: 'TRAORE',  prenoms: 'Ibrahim',  email: 'ibrahim.traore.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-06', nom: 'COULIBALY', prenoms: 'Fatoumata', email: 'fatoumata.coulibaly.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-07', nom: 'BAMBA',   prenoms: 'Souleymane', email: 'souleymane.bamba.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-08', nom: 'YAO',     prenoms: 'Kofi Emmanuel', email: 'kofi.yao.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-09', nom: 'GBAGBO',  prenoms: 'Ahou Bernadette', email: 'ahou.gbagbo.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-10', nom: 'SORO',    prenoms: 'Dramane', email: 'dramane.soro.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-11', nom: 'FOFANA',  prenoms: 'Hawa',    email: 'hawa.fofana.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-12', nom: 'CISSE',   prenoms: 'Moussa',  email: 'moussa.cisse.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-13', nom: 'DEMBELE', prenoms: 'Kadiatou', email: 'kadiatou.dembele.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-14', nom: 'SYLLA',   prenoms: 'Adama',   email: 'adama.sylla.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-15', nom: 'CAMARA',  prenoms: 'Mariame', email: 'mariame.camara.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-16', nom: 'SANGARE', prenoms: 'Issouf',  email: 'issouf.sangare.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-17', nom: 'BERTE',   prenoms: 'Nafissatou', email: 'nafissatou.berte.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-18', nom: 'DOUMBIA', prenoms: 'Sekou',   email: 'sekou.doumbia.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-19', nom: 'TOURE',   prenoms: 'Awa',     email: 'awa.toure.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-20', nom: 'KOUYATE', prenoms: 'Lamine',  email: 'lamine.kouyate.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-21', nom: 'GBANE',   prenoms: 'Salimata', email: 'salimata.gbane.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-22', nom: 'KOFFI',   prenoms: 'N\'Goran Christophe', email: 'ngoran.koffi.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-23', nom: 'ASSI',    prenoms: 'Adjoua Marie', email: 'adjoua.assi.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-24', nom: 'N\'GUESSAN', prenoms: 'Akissi Rosine', email: 'akissi.nguessan.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-25', nom: 'DJOMAN',  prenoms: 'Kan Eric', email: 'kan.djoman.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-26', nom: 'TANO',    prenoms: 'Adjoua Solange', email: 'adjoua.tano.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-27', nom: 'AHOUA',   prenoms: 'Amani Didier', email: 'amani.ahoua.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-28', nom: 'BONI',    prenoms: 'Ahi Blaise', email: 'ahi.boni.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-29', nom: 'AKE',     prenoms: 'Kouakou Lambert', email: 'kouakou.ake.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-30', nom: 'ETTIEN',  prenoms: 'Ekra Prisca', email: 'ekra.ettien.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-31', nom: 'ABOU',    prenoms: 'Tanoh Justin', email: 'tanoh.abou.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-32', nom: 'YAPO',    prenoms: 'Ama Lydie', email: 'ama.yapo.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-33', nom: 'KOUAME',  prenoms: 'Yao Fernand', email: 'yao.kouame.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-34', nom: 'NIAMKEY', prenoms: 'Kouadio Serge', email: 'kouadio.niamkey.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-35', nom: 'ABROGOUA', prenoms: 'Tanoh Georges', email: 'tanoh.abrogoua.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-36', nom: 'AMANI',   prenoms: 'Kouakou Valentin', email: 'kouakou.amani.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-37', nom: 'ATTE',    prenoms: 'Ekra Mireille', email: 'ekra.atte.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-38', nom: 'EKRA',    prenoms: 'Assoumou Paul', email: 'assoumou.ekra.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-39', nom: 'BLESSY',  prenoms: 'Ahi Simon', email: 'ahi.blessy.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-40', nom: 'KRAGBE',  prenoms: 'Sery Bernard', email: 'sery.kragbe.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-41', nom: 'MAHO',    prenoms: 'Kpan Sylvie', email: 'kpan.maho.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-42', nom: 'GNAKPA',  prenoms: 'Gnahoua Raoul', email: 'gnahoua.gnakpa.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-43', nom: 'ZADI',    prenoms: 'Bi Arsene', email: 'bi.zadi.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-44', nom: 'GUEHI',   prenoms: 'Gueu Marcel', email: 'gueu.guehi.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-45', nom: 'SERI',    prenoms: 'Bi Epiphane', email: 'bi.seri.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-46', nom: 'GOBA',    prenoms: 'Doh Patrice', email: 'doh.goba.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-47', nom: 'DOUBLE',  prenoms: 'Hue Jacques', email: 'hue.double.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-48', nom: 'BLEU',    prenoms: 'Guei Christelle', email: 'guei.bleu.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-49', nom: 'GNOAN',   prenoms: 'Roger Séverin', email: 'roger.gnoan.pejedec@forges-demo.ci', avec_dossier: true },
  { id: 'BEN-50', nom: 'TAPE',    prenoms: 'Bi Noel', email: 'bi.tape.pejedec@forges-demo.ci', avec_dossier: true },
];

async function main() {
  console.log('🌱 Seed DÉMO PEJEDEC — Ministère de la Jeunesse / IDA Banque Mondiale\n');

  if (CHECK) {
    const [apprenants, dossiers, vouchers] = await Promise.all([
      prisma.apprenant.count({ where: { email: { contains: 'pejedec' } } }),
      prisma.dossier.count(),
      prisma.voucher.count({ where: { code: { startsWith: 'PEJEDEC' } } }),
    ]);
    console.log(`Bénéficiaires: ${apprenants}/50 | Dossiers: ${dossiers} | Vouchers PEJEDEC: ${vouchers}/10`);
    const ben01 = await prisma.apprenant.findFirst({ where: { email: 'jean.kouassi.pejedec@forges-demo.ci' } });
    if (ben01) {
      const d = await prisma.dossier.count({ where: { apprenant_id: ben01.id } });
      console.log(`BEN-01 Jean KOUASSI : ${d === 0 ? '✅ SANS dossier (prêt pour démo)' : `⚠️  ${d} dossier(s) existant(s)`}`);
    }
    return;
  }

  if (RESET) {
    console.log('🗑️  Reset données PEJEDEC...');
    const emails = BENEFICIAIRES.map(b => b.email);
    const bens = await prisma.apprenant.findMany({ where: { email: { in: emails } }, select: { id: true } });
    const ids = bens.map(b => b.id);
    if (ids.length > 0) {
      await prisma.dossier.deleteMany({ where: { apprenant_id: { in: ids } } });
      await prisma.apprenant.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.voucher.deleteMany({ where: { code: { startsWith: 'PEJEDEC' } } });
    await prisma.formation.deleteMany({ where: { id: 'F-GWU-CCDL-PEJEDEC' } });
    await prisma.session.deleteMany({ where: { id: 'S-GWU-CCDL-JUIN2026' } });
    console.log('✅ Données PEJEDEC supprimées\n');
  }

  const hash = await bcrypt.hash(PASS_BEN, SALT_ROUNDS);
  const hashAdmin = await bcrypt.hash(PASS_ADMIN, SALT_ROUNDS);

  // ── Admin démo ────────────────────────────────────────────────────────
  const adminDemo = await prisma.apprenant.upsert({
    where: { email: 'admin.pejedec@forges-demo.ci' },
    update: {},
    create: {
      email: 'admin.pejedec@forges-demo.ci',
      password_hash: hashAdmin,
      nom: 'Admin', prenoms: 'PEJEDEC FORGES',
      type_apprenant: 'PROFESSIONNEL',
      pays_residence: 'CI', pays_nationalite: 'CI',
      langue_preferee: 'FR', statut: 'ACTIF',
      consentement_rgpd: true, consentement_timestamp: new Date(), consentement_version_cgu: '1.0',
    }
  });

  // ── Formation GWU Cybersécurité CCDL ──────────────────────────────────
  console.log('🎓 Création formation GWU Cybersécurité CCDL...');

  const formation = await prisma.formation.upsert({
    where: { id: 'F-GWU-CCDL-PEJEDEC' },
    update: {},
    create: {
      id: 'F-GWU-CCDL-PEJEDEC',
      intitule: 'Cybersécurité & Leadership Numérique — GWU / CCDL',
      description_courte: 'Certification internationale en cybersécurité délivrée par George Washington University. Programme PEJEDEC — IDA/Banque Mondiale. Formation 100% en ligne.',
      duree_jours: 365,
      cout_catalogue: 2000000, // 2 000 000 XOF
      responsable_id: adminDemo.id,
      type_formation: 'PREMIUM',
      mode_formation: 'AVEC_SESSION',
      pilier_abonnement: 'INSTITUTIONNEL',
      inclus_abonnement: false,
      langues_disponibles: ['FR', 'EN'],
      certification_delivree: true,
      statut: 'ACTIVE',
    }
  });

  // ── Session Juin 2026 ─────────────────────────────────────────────────
  const session = await prisma.session.upsert({
    where: { id: 'S-GWU-CCDL-JUIN2026' },
    update: {},
    create: {
      id: 'S-GWU-CCDL-JUIN2026',
      formation_id: 'F-GWU-CCDL-PEJEDEC',
      date_ouverture: new Date('2026-04-01T00:00:00Z'),
      date_cloture: new Date('2026-05-25T00:00:00Z'),
      date_debut: new Date('2026-06-01T00:00:00Z'),
      date_fin: new Date('2026-06-11T23:59:00Z'),
      capacite: 500,
      places_restantes: 451, // 49 inscrits (BEN-02 → BEN-50)
      statut: 'OUVERTE',
    }
  });

  console.log('  ✅ Formation GWU CCDL + Session Juin 2026 créées');

  // ── Vouchers PEJEDEC-GWU-2026-001 → 010 ──────────────────────────────
  console.log('🎫 Création vouchers PEJEDEC...');

  for (const code of VOUCHER_CODES) {
    await prisma.voucher.upsert({
      where: { code },
      update: {},
      create: {
        code,
        type: 'INSTITUTIONNEL',
        formation_id: 'F-GWU-CCDL-PEJEDEC',
        valeur: 2000000, // couverture 100% RM-41
        type_valeur: 'MONTANT',
        quota_max: 1, // usage unique RM-38
        quota_utilise: 0,
        date_expiration: new Date('2026-12-31T23:59:00Z'),
        statut: 'ACTIF',
        cree_par: adminDemo.id,
      }
    });
  }

  console.log(`  ✅ ${VOUCHER_CODES.length} vouchers PEJEDEC-GWU-2026-001→010 créés (ACTIF, quota 0/1)`);

  // ── 50 bénéficiaires ──────────────────────────────────────────────────
  console.log('👥 Création 50 bénéficiaires PEJEDEC...');

  let nbAvecDossier = 0;

  for (const ben of BENEFICIAIRES) {
    const apprenant = await prisma.apprenant.upsert({
      where: { email: ben.email },
      update: {},
      create: {
        email: ben.email,
        password_hash: hash,
        nom: ben.nom,
        prenoms: ben.prenoms,
        type_apprenant: 'APPRENANT',
        niveau_etude: 'BAC+2',
        pays_residence: 'CI',
        pays_nationalite: 'CI',
        langue_preferee: 'FR',
        statut: 'ACTIF',
        consentement_rgpd: true,
        consentement_timestamp: new Date(),
        consentement_version_cgu: '1.0',
      }
    });

    // BEN-01 (Jean KOUASSI) : SANS dossier pour démo live
    if (ben.avec_dossier) {
      await prisma.dossier.upsert({
        where: { id: `D-PEJEDEC-${ben.id}` },
        update: {},
        create: {
          id: `D-PEJEDEC-${ben.id}`,
          apprenant_id: apprenant.id,
          formation_id: 'F-GWU-CCDL-PEJEDEC',
          session_id: 'S-GWU-CCDL-JUIN2026',
          statut: 'PAYE',
          source_financement: 'INSTITUTIONNEL',
        }
      });
      nbAvecDossier++;
    }
  }

  console.log(`  ✅ 50 bénéficiaires créés (${nbAvecDossier} avec dossier PAYÉ, BEN-01 sans dossier)`);

  // ── Résumé démo ───────────────────────────────────────────────────────
  console.log('\n✅ Seed DÉMO PEJEDEC terminé !\n');
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│  SCÉNARIO DÉMO MINISTÈRE DE LA JEUNESSE                          │');
  console.log('├──────────────────────────────────────────────────────────────────┤');
  console.log('│  Formation  : Cybersécurité GWU/CCDL — 2 000 000 XOF            │');
  console.log('│  Session    : Abidjan, 1–11 Juin 2026                            │');
  console.log('│  Bénéficiaires inscrits : 49/500                                 │');
  console.log('├──────────────────────────────────────────────────────────────────┤');
  console.log('│  🎯 DÉMO LIVE — BEN-01 Jean KOUASSI (sans dossier)              │');
  console.log('│     Email    : jean.kouassi.pejedec@forges-demo.ci              │');
  console.log('│     Mot de passe : PEJEDEC@2026!                                 │');
  console.log('│     Voucher  : PEJEDEC-GWU-2026-001 (ACTIF, quota 0/1)          │');
  console.log('├──────────────────────────────────────────────────────────────────┤');
  console.log('│  Admin démo : admin.pejedec@forges-demo.ci                       │');
  console.log('│  Mot de passe admin : FORGES@PEJEDEC2026!                        │');
  console.log('├──────────────────────────────────────────────────────────────────┤');
  console.log('│  Vouchers PEJEDEC actifs (quota 0/1) :                           │');
  VOUCHER_CODES.forEach(c => console.log(`│    ${c}                          │`));
  console.log('└──────────────────────────────────────────────────────────────────┘');
}

main().catch(e => { console.error(e); process.exit(1); })
      .finally(() => prisma.$disconnect());
