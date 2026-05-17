import { PaiementReglementService } from '../paiement-reglement.service';

describe('PaiementReglementService', () => {
  const audit = {
    info: jest.fn().mockResolvedValue(undefined),
    warning: jest.fn().mockResolvedValue(undefined),
  };
  const commissionService = {
    creerCommissionsApresSuccessPayment: jest.fn().mockResolvedValue({
      partenaire: { id: 'cp-01' },
      apporteur: { id: 'ca-01' },
    }),
  };

  function createTx(updateManyCount = 1) {
    return {
      paiement: {
        updateMany: jest.fn().mockResolvedValue({ count: updateManyCount }),
      },
      dossier: {
        update: jest.fn().mockResolvedValue({ id: 'dossier-01', statut: 'PAYE' }),
      },
    };
  }

  function createPrisma(tx: any) {
    return {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(tx)),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('confirme un paiement provider et passe le dossier a PAYE avec commissions', async () => {
    const tx = createTx();
    const prisma = createPrisma(tx);
    const service = new PaiementReglementService(prisma as any, audit as any, commissionService as any);
    const paiement = {
      id: 'paiement-01',
      dossier_id: 'dossier-01',
      dossier: {
        id: 'dossier-01',
        formation: { id: 'formation-01', partenaire_id: 'partenaire-01' },
      },
    };

    const result = await service.confirmerProvider({
      paiement,
      transactionId: 'FNO-REF-01',
      providerStatus: 'SUCCESS',
      wallet: 'orange',
      payload: { reference: 'FNO-REF-01' },
      envoyerRecu: false,
    });

    expect(tx.paiement.updateMany).toHaveBeenCalledWith({
      where: { id: 'paiement-01', statut: { not: 'CONFIRME' } },
      data: expect.objectContaining({
        statut: 'CONFIRME',
        status_ngser: 'SUCCESS',
        transaction_id: 'FNO-REF-01',
        wallet_ngser: 'orange',
      }),
    });
    expect(tx.dossier.update).toHaveBeenCalledWith({
      where: { id: 'dossier-01' },
      data: { statut: 'PAYE' },
    });
    expect(commissionService.creerCommissionsApresSuccessPayment).toHaveBeenCalledWith(
      paiement,
      paiement.dossier,
      paiement.dossier.formation,
      tx
    );
    expect(result).toMatchObject({
      paiement_statut: 'CONFIRME',
      dossier_statut: 'PAYE',
      commissions_created: true,
    });
  });

  it('ignore un reglement provider si le paiement est deja CONFIRME', async () => {
    const tx = createTx(0);
    const prisma = createPrisma(tx);
    const service = new PaiementReglementService(prisma as any, audit as any, commissionService as any);

    const result = await service.echouerProvider({
      paiement: { id: 'paiement-02', dossier_id: 'dossier-02' },
      transactionId: 'FNO-REF-FAIL',
      providerStatus: 'FAIL',
      payload: { reference: 'FNO-REF-FAIL' },
      annulerDossier: true,
    });

    expect(tx.paiement.updateMany).toHaveBeenCalledWith({
      where: { id: 'paiement-02', statut: { not: 'CONFIRME' } },
      data: expect.objectContaining({
        statut: 'ECHOUE',
        status_ngser: 'FAIL',
        transaction_id: 'FNO-REF-FAIL',
      }),
    });
    expect(tx.dossier.update).not.toHaveBeenCalled();
    expect(result).toEqual({ already_processed: true, action: 'NONE' });
  });
});
