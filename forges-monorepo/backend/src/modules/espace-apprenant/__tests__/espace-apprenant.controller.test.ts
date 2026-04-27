import { EspaceApprenantController } from '../espace-apprenant.controller';
import { EspaceApprenantService } from '../espace-apprenant.service';
import { createMockReq, createMockRes, createNext } from '../../../__tests__/helpers/http';

describe('EspaceApprenantController', () => {
  let controller: EspaceApprenantController;
  let service: jest.Mocked<EspaceApprenantService>;

  beforeEach(() => {
    service = {
      getMesDossiers: jest.fn(),
      annulerDossier: jest.fn(),
      getAttestationUrl: jest.fn(),
      getAttestationPdf: jest.fn(),
      getMesFormationsDemande: jest.fn(),
      getAccesFormationDemande: jest.fn(),
      updateProgressionFormationDemande: jest.fn(),
    } as any;

    controller = new EspaceApprenantController(service);
  });

  it('retourne les dossiers et délègue les erreurs inattendues', async () => {
    const req = createMockReq({ user: { userId: 'app-01', role: 'APPRENANT', langue: 'FR' } });
    const res = createMockRes();
    const next = createNext();

    service.getMesDossiers.mockResolvedValueOnce([{ id: 'dossier-01' }] as any);
    await controller.getMesDossiers(req, res, next);
    expect(service.getMesDossiers).toHaveBeenCalledWith('app-01');
    expect(res.json).toHaveBeenCalledWith([{ id: 'dossier-01' }]);

    const boom = new Error('BOOM');
    const errorNext = createNext();
    service.getMesDossiers.mockRejectedValueOnce(boom);
    await controller.getMesDossiers(req, createMockRes(), errorNext);
    expect(errorNext).toHaveBeenCalledWith(boom);
  });

  it('annule un dossier et mappe tous les refus métier', async () => {
    const req = createMockReq({
      params: { id: 'dossier-01' },
      user: { userId: 'app-01', role: 'APPRENANT', langue: 'FR' },
    });
    const res = createMockRes();
    const next = createNext();

    service.annulerDossier.mockResolvedValueOnce({ message: 'ok' } as any);
    await controller.annulerDossier(req, res, next);
    expect(service.annulerDossier).toHaveBeenCalledWith('dossier-01', 'app-01');

    for (const [message, status] of [
      ['DOSSIER_NOT_FOUND', 404],
      ['FORBIDDEN', 403],
      ['DOSSIER_RETENU_CONTACT_RESPONSABLE', 409],
      ['DOSSIER_PAYE_NON_ANNULABLE', 409],
      ['ANNULATION_IMPOSSIBLE', 409],
    ] as const) {
      const errorRes = createMockRes();
      service.annulerDossier.mockRejectedValueOnce(new Error(message));
      await controller.annulerDossier(req, errorRes, next);
      expect(errorRes.status).toHaveBeenCalledWith(status);
    }
  });

  it('retourne une attestation et couvre les blocages métier', async () => {
    const req = createMockReq({
      params: { dossierId: 'dossier-01' },
      user: { userId: 'app-01', role: 'APPRENANT', langue: 'FR' },
    });
    const res = createMockRes();
    const next = createNext();

    service.getAttestationPdf.mockResolvedValueOnce({
      filename: 'attestation-test.pdf',
      buffer: Buffer.from('%PDF-1.4\n'),
    } as any);
    await controller.getAttestationUrl(req, res, next);
    expect(service.getAttestationPdf).toHaveBeenCalledWith('dossier-01', 'app-01');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="attestation-test.pdf"');
    expect(res.send).toHaveBeenCalledWith(Buffer.from('%PDF-1.4\n'));

    for (const [message, status] of [
      ['DOSSIER_NOT_FOUND', 404],
      ['ATTESTATION_DOSSIER_NON_PAYE', 403],
      ['ATTESTATION_SESSION_NON_CLOTUREE', 403],
    ] as const) {
      const errorRes = createMockRes();
      service.getAttestationPdf.mockRejectedValueOnce(new Error(message));
      await controller.getAttestationUrl(req, errorRes, next);
      expect(errorRes.status).toHaveBeenCalledWith(status);
    }
  });

  it('retourne les formations à la demande et gère les accès expirés ou suspendus', async () => {
    const req = createMockReq({ user: { userId: 'app-01', role: 'APPRENANT', langue: 'FR' } });
    const res = createMockRes();
    const next = createNext();

    service.getMesFormationsDemande.mockResolvedValueOnce([{ id: 'formation-01' }] as any);
    await controller.getMesFormationsDemande(req, res, next);
    expect(res.json).toHaveBeenCalledWith([{ id: 'formation-01' }]);

    const accessReq = createMockReq({
      params: { accesId: 'acces-01' },
      user: { userId: 'app-01', role: 'APPRENANT', langue: 'FR' },
    });

    service.getAccesFormationDemande.mockResolvedValueOnce({ id: 'acces-01' } as any);
    await controller.getAccesFormationDemande(accessReq, res, next);
    expect(service.getAccesFormationDemande).toHaveBeenCalledWith('acces-01', 'app-01');

    for (const [message, status] of [
      ['ACCES_EXPIRE', 410],
      ['ACCES_SUSPENDU_ABONNEMENT_INACTIF', 403],
      ['ACCES_NON_TROUVE', 404],
    ] as const) {
      const errorRes = createMockRes();
      service.getAccesFormationDemande.mockRejectedValueOnce(new Error(message));
      await controller.getAccesFormationDemande(accessReq, errorRes, next);
      expect(errorRes.status).toHaveBeenCalledWith(status);
    }
  });

  it('met à jour la progression d’un accès formation à la demande', async () => {
    const req = createMockReq({
      params: { accesId: 'acces-01' },
      body: { progression: 55 },
      user: { userId: 'app-01', role: 'APPRENANT', langue: 'FR' },
    });
    const res = createMockRes();
    const next = createNext();

    service.updateProgressionFormationDemande.mockResolvedValueOnce({ id: 'acces-01', progression: 55 } as any);
    await controller.updateProgressionFormationDemande(req, res, next);

    expect(service.updateProgressionFormationDemande).toHaveBeenCalledWith('acces-01', 'app-01', 55);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 200,
      data: { id: 'acces-01', progression: 55 },
    });

    const errorRes = createMockRes();
    service.updateProgressionFormationDemande.mockRejectedValueOnce(new Error('ACCES_NON_TROUVE'));
    await controller.updateProgressionFormationDemande(req, errorRes, next);
    expect(errorRes.status).toHaveBeenCalledWith(404);
  });
});
