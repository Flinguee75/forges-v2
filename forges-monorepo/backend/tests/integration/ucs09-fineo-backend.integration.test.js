const {
  auth,
  createApprenantAccount,
  ids,
  prisma,
  request,
  API_URL,
} = require('./helpers');
const { FineoClient } = require('../../src/modules/paiements/fineo.client');

describe('UCS09 backend integration — paiement dossier FineoPay', () => {
  let createCheckoutSpy;
  let getTransactionSpy;
  let transactionVerifiee;

  beforeEach(() => {
    jest.restoreAllMocks();

    process.env.FINEO_BUSINESS_CODE = 'test-business-code';
    process.env.FINEO_API_KEY = 'test-api-key';
    process.env.FINEO_BASE_URL = 'https://fineo.test/api/v1/business/test';

    transactionVerifiee = null;

    createCheckoutSpy = jest
      .spyOn(FineoClient.prototype, 'createCheckoutLink')
      .mockImplementation(async (payload) => ({
        checkoutLink: `https://fineo.test/checkout/${payload.syncRef}`,
      }));

    getTransactionSpy = jest
      .spyOn(FineoClient.prototype, 'getTransaction')
      .mockImplementation(async (reference) => {
        if (!transactionVerifiee) {
          throw new Error(`Transaction Fineo non preparee: ${reference}`);
        }
        return { ...transactionVerifiee, reference };
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('inscription, initiation Fineo, callback verifie et dossier PAYE', async () => {
    const apprenant = await createApprenantAccount('fineo-backend');
    const headers = await auth(apprenant);

    const inscription = await request(API_URL)
      .post(`/api/sessions/${ids.standardSession}/inscrire`)
      .set(headers)
      .send({ source_financement: 'RETAIL' });

    expect(inscription.status).toBe(201);
    expect(inscription.body.dossier.statut).toBe('PAYE_DIRECTEMENT');
    const dossierId = inscription.body.dossier.id;

    const initiation = await request(API_URL)
      .post('/api/paiements')
      .set(headers)
      .send({ dossier_id: dossierId, methode: 'MOBILE_MONEY' });

    expect(initiation.status).toBe(201);
    expect(initiation.body.data.payment_url).toMatch(/^https:\/\/fineo\.test\/checkout\/FRG-FNO-/);

    const paiementPending = await prisma.paiement.findUnique({
      where: { dossier_id: dossierId },
    });

    expect(paiementPending.provider).toBe('FINEO');
    expect(paiementPending.statut).toBe('PENDING');
    expect(paiementPending.order_ngser).toMatch(/^FRG-FNO-/);
    expect(paiementPending.montant_initie).toBe(paiementPending.montant_final);

    expect(createCheckoutSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: Math.round(paiementPending.montant_initie / 100),
        syncRef: paiementPending.order_ngser,
        callbackUrl: expect.stringContaining('/webhooks/fineo'),
      })
    );

    const referenceFineo = `FNO-REF-${Date.now()}`;
    transactionVerifiee = {
      reference: referenceFineo,
      amount: Math.round(paiementPending.montant_initie / 100),
      fees: 0,
      canal: 'ORANGE_MONEY',
      direction: 'cashin',
      status: 'success',
      date: new Date().toISOString(),
      syncRef: paiementPending.order_ngser,
      formValue: { clientAccountNumber: '0700000000' },
    };

    const callback = await request(API_URL)
      .post('/webhooks/fineo')
      .send({
        reference: referenceFineo,
        amount: transactionVerifiee.amount,
        status: 'failed',
        clientAccountNumber: '0700000000',
        timestamp: transactionVerifiee.date,
        syncRef: paiementPending.order_ngser,
      });

    expect(callback.status).toBe(200);
    expect(callback.body.received).toBe(true);
    expect(getTransactionSpy).toHaveBeenCalledWith(referenceFineo);

    const dossierApresCallback = await prisma.dossier.findUnique({
      where: { id: dossierId },
      include: { paiement: true },
    });

    expect(dossierApresCallback.statut).toBe('PAYE');
    expect(dossierApresCallback.paiement.statut).toBe('CONFIRME');
    expect(dossierApresCallback.paiement.provider).toBe('FINEO');
    expect(dossierApresCallback.paiement.transaction_id).toBe(referenceFineo);
    expect(dossierApresCallback.paiement.confirmed_at).toBeDefined();
    expect(dossierApresCallback.paiement.ngser_payload_last).toEqual(
      expect.objectContaining({
        reference: referenceFineo,
        status: 'success',
        syncRef: paiementPending.order_ngser,
      })
    );
  });
});
