const crypto = require('crypto');
const {
  createApprenantAccount,
  ids,
  prisma,
  request,
  API_URL,
} = require('./helpers');

function signWebhook(payload) {
  return crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET || 'dev-secret')
    .update(JSON.stringify(payload))
    .digest('hex');
}

async function creerDossierAvecPaiement(prefix, statutPaiement = 'EN_ATTENTE') {
  const apprenant = await createApprenantAccount(prefix);
  const dossier = await prisma.dossier.create({
    data: {
      apprenant_id: apprenant.id,
      formation_id: ids.standardFormation,
      session_id: ids.standardSession,
      statut: 'PAYE_DIRECTEMENT',
      source_financement: 'RETAIL',
    },
  });
  const formation = await prisma.formation.findUnique({
    where: { id: ids.standardFormation },
  });
  const paiement = await prisma.paiement.create({
    data: {
      dossier_id: dossier.id,
      montant_catalogue: formation.cout_catalogue,
      montant_final: formation.cout_catalogue,
      montant_initie: formation.cout_catalogue,
      methode: 'MOBILE_MONEY',
      statut: statutPaiement,
      tentatives: 0,
      provider: 'LEGACY',
    },
  });

  return { dossier, paiement };
}

describe('UCS09 backend integration — webhook legacy paiements', () => {
  test('/api/paiements/webhook SUCCESS passe par le reglement commun', async () => {
    const { dossier, paiement } = await creerDossierAvecPaiement('legacy-success');
    const payload = {
      transaction_id: `LEGACY-TX-SUCCESS-${Date.now()}`,
      dossier_id: dossier.id,
      statut: 'SUCCESS',
      montant: paiement.montant_final,
    };

    const response = await request(API_URL)
      .post('/api/paiements/webhook')
      .set('x-webhook-signature', signWebhook(payload))
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      statut: 'SUCCESS',
      paiement_statut: 'CONFIRME',
      dossier_statut: 'PAYE',
    });

    const dossierApresWebhook = await prisma.dossier.findUnique({
      where: { id: dossier.id },
      include: { paiement: true },
    });

    expect(dossierApresWebhook.statut).toBe('PAYE');
    expect(dossierApresWebhook.paiement.statut).toBe('CONFIRME');
    expect(dossierApresWebhook.paiement.transaction_id).toBe(payload.transaction_id);
    expect(dossierApresWebhook.paiement.ngser_payload_last).toMatchObject({
      source: 'LEGACY_WEBHOOK',
      transaction_id: payload.transaction_id,
    });
  });

  test('/api/paiements/webhook FAILED passe par le reglement commun et annule le dossier', async () => {
    const { dossier, paiement } = await creerDossierAvecPaiement('legacy-failed');
    const payload = {
      transaction_id: `LEGACY-TX-FAILED-${Date.now()}`,
      dossier_id: dossier.id,
      statut: 'FAILED',
      montant: paiement.montant_final,
    };

    const response = await request(API_URL)
      .post('/api/paiements/webhook')
      .set('x-webhook-signature', signWebhook(payload))
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      statut: 'FAILED',
      paiement_statut: 'ECHOUE',
      dossier_statut: 'ANNULE',
    });

    const dossierApresWebhook = await prisma.dossier.findUnique({
      where: { id: dossier.id },
      include: { paiement: true },
    });

    expect(dossierApresWebhook.statut).toBe('ANNULE');
    expect(dossierApresWebhook.paiement.statut).toBe('ECHOUE');
    expect(dossierApresWebhook.paiement.transaction_id).toBe(payload.transaction_id);
    expect(dossierApresWebhook.paiement.ngser_payload_last).toMatchObject({
      source: 'LEGACY_WEBHOOK',
      transaction_id: payload.transaction_id,
    });
  });
});
