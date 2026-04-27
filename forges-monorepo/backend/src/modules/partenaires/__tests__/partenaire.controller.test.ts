import { PartenaireController } from '../partenaire.controller';
import { PartenaireService } from '../partenaire.service';
import { ValidationFormationService } from '../validation-formation.service';
import { createMockReq, createMockRes, createNext } from '../../../__tests__/helpers/http';

describe('PartenaireController', () => {
  let controller: PartenaireController;
  let partenaireService: jest.Mocked<PartenaireService>;
  let validationService: jest.Mocked<ValidationFormationService>;

  const autoInscriptionBody = {
    raison_sociale: 'Tech Formation',
    type: 'ONG',
    pays: 'CI',
    email_principal: 'PARTENAIRE@TEST.CI',
    password: 'Password1',
  };

  const soumissionBody = {
    intitule: 'Formation test',
    description_courte: 'Description courte',
    description_longue: 'Description longue',
    duree_jours: 3,
    mode_formation: 'AVEC_SESSION',
    langues_disponibles: ['FR'],
    certification_delivree: false,
    objectifs_pedagogiques: ['Objectif 1'],
    prix_coutant_propose: 100000,
  };

  beforeEach(() => {
    partenaireService = {
      autoInscrire: jest.fn(),
      activerViaToken: jest.fn(),
      soumettreFormation: jest.fn(),
      getDashboard: jest.fn(),
    } as any;

    validationService = {
      getFormationsEnAttente: jest.fn(),
      valider: jest.fn(),
      rejeter: jest.fn(),
    } as any;

    controller = new PartenaireController(partenaireService, validationService);
  });

  it('gère auto-inscription et activation via token', async () => {
    const invalidRes = createMockRes();
    const invalidNext = createNext();
    await controller.autoInscrire(createMockReq({ body: {} }), invalidRes, invalidNext);
    expect(invalidRes.status).toHaveBeenCalledWith(400);

    const autoReq = createMockReq({ body: autoInscriptionBody });
    const autoRes = createMockRes();
    const next = createNext();
    partenaireService.autoInscrire.mockResolvedValueOnce({ id: 'part-01' } as any);
    await controller.autoInscrire(autoReq, autoRes, next);
    expect(partenaireService.autoInscrire).toHaveBeenCalledWith(
      expect.objectContaining({ email_principal: 'partenaire@test.ci' })
    );
    expect(autoRes.status).toHaveBeenCalledWith(201);

    const emailConflictRes = createMockRes();
    partenaireService.autoInscrire.mockRejectedValueOnce(new Error('EMAIL_ALREADY_EXISTS'));
    await controller.autoInscrire(autoReq, emailConflictRes, next);
    expect(emailConflictRes.status).toHaveBeenCalledWith(409);

    const activateReq = createMockReq({ body: { token: 'token-01', password: 'Password1' } });
    const activateRes = createMockRes();
    partenaireService.activerViaToken.mockResolvedValueOnce({ message: 'ok' } as any);
    await controller.activerViaToken(activateReq, activateRes, next);
    expect(partenaireService.activerViaToken).toHaveBeenCalledWith('token-01', 'Password1');

    const tokenInvalidRes = createMockRes();
    partenaireService.activerViaToken.mockRejectedValueOnce(new Error('TOKEN_INVALID'));
    await controller.activerViaToken(activateReq, tokenInvalidRes, next);
    expect(tokenInvalidRes.status).toHaveBeenCalledWith(404);

    const tokenExpiredRes = createMockRes();
    partenaireService.activerViaToken.mockRejectedValueOnce(new Error('TOKEN_EXPIRE'));
    await controller.activerViaToken(activateReq, tokenExpiredRes, next);
    expect(tokenExpiredRes.status).toHaveBeenCalledWith(410);
  });

  it('soumet une formation et mappe l’état partenaire inactif', async () => {
    const invalidRes = createMockRes();
    const invalidNext = createNext();
    await controller.soumettreFormation(createMockReq({ body: {} }), invalidRes, invalidNext);
    expect(invalidRes.status).toHaveBeenCalledWith(400);

    const req = createMockReq({
      body: soumissionBody,
      user: { userId: 'part-01', role: 'PARTENAIRE', langue: 'FR' },
    });
    const res = createMockRes();
    const next = createNext();
    partenaireService.soumettreFormation.mockResolvedValueOnce({ formation_id: 'formation-01' } as any);
    await controller.soumettreFormation(req, res, next);
    expect(partenaireService.soumettreFormation).toHaveBeenCalledWith(soumissionBody, 'part-01');
    expect(res.status).toHaveBeenCalledWith(201);

    const forbiddenRes = createMockRes();
    partenaireService.soumettreFormation.mockRejectedValueOnce(new Error('PARTENAIRE_INACTIF'));
    await controller.soumettreFormation(req, forbiddenRes, next);
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
  });

  it('retourne le dashboard et les formations en attente', async () => {
    const req = createMockReq({ user: { userId: 'part-01', role: 'PARTENAIRE', langue: 'FR' } });
    const res = createMockRes();
    const next = createNext();

    partenaireService.getDashboard.mockResolvedValueOnce({ formations: [] } as any);
    await controller.getDashboard(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: { formations: [] } });

    validationService.getFormationsEnAttente.mockResolvedValueOnce([{ id: 'fp-01' }] as any);
    await controller.getFormationsEnAttente(
      createMockReq({ user: { userId: 'resp-01', role: 'RESPONSABLE', langue: 'FR' } }),
      res,
      next
    );
    expect(validationService.getFormationsEnAttente).toHaveBeenCalledWith('resp-01');
    expect(res.json).toHaveBeenCalledWith({ statusCode: 200, data: [{ id: 'fp-01' }] });
  });

  it('valide une formation et couvre les différents statuts d’erreur', async () => {
    const invalidRes = createMockRes();
    const invalidNext = createNext();
    await controller.validerFormation(createMockReq({ body: {} }), invalidRes, invalidNext);
    expect(invalidRes.status).toHaveBeenCalledWith(400);

    const req = createMockReq({
      params: { id: 'fp-01' },
      body: {
        type_formation: 'STANDARD',
        pilier_abonnement: 'TOUS',
        prix_coutant_valide: 120000,
      },
      user: { userId: 'resp-01', role: 'RESPONSABLE', langue: 'FR' },
    });
    const res = createMockRes();
    const next = createNext();

    validationService.valider.mockResolvedValueOnce({ formation_id: 'formation-01' } as any);
    await controller.validerFormation(req, res, next);
    expect(validationService.valider).toHaveBeenCalledWith('fp-01', {
      type_formation: 'STANDARD',
      pilier_abonnement: 'TOUS',
      prix_coutant_valide: 120000,
      responsable_id: 'resp-01',
    });

    const forbiddenRes = createMockRes();
    validationService.valider.mockRejectedValueOnce(new Error('RESPONSABLE_NON_DESIGNE'));
    await controller.validerFormation(req, forbiddenRes, next);
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);

    const conflictRes = createMockRes();
    validationService.valider.mockRejectedValueOnce(new Error('FORMATION_DEJA_TRAITEE'));
    await controller.validerFormation(req, conflictRes, next);
    expect(conflictRes.status).toHaveBeenCalledWith(409);

    const boom = new Error('BOOM');
    const errorNext = createNext();
    validationService.valider.mockRejectedValueOnce(boom);
    await controller.validerFormation(req, createMockRes(), errorNext);
    expect(errorNext).toHaveBeenCalledWith(boom);
  });

  it('rejette une formation avec motif obligatoire et responsable désigné', async () => {
    const invalidRes = createMockRes();
    const invalidNext = createNext();
    await controller.rejeterFormation(createMockReq({ body: {} }), invalidRes, invalidNext);
    expect(invalidRes.status).toHaveBeenCalledWith(400);

    const req = createMockReq({
      params: { id: 'fp-01' },
      body: {
        motif: 'Motif de rejet valide',
        corrections_suggeres: 'Corriger le programme',
      },
      user: { userId: 'resp-01', role: 'RESPONSABLE', langue: 'FR' },
    });
    const res = createMockRes();
    const next = createNext();

    validationService.rejeter.mockResolvedValueOnce({ message: 'rejected' } as any);
    await controller.rejeterFormation(req, res, next);
    expect(validationService.rejeter).toHaveBeenCalledWith(
      'fp-01',
      'Motif de rejet valide',
      'Corriger le programme',
      'resp-01'
    );

    const motifRes = createMockRes();
    validationService.rejeter.mockRejectedValueOnce(new Error('MOTIF_OBLIGATOIRE'));
    await controller.rejeterFormation(req, motifRes, next);
    expect(motifRes.status).toHaveBeenCalledWith(400);

    const forbiddenRes = createMockRes();
    validationService.rejeter.mockRejectedValueOnce(new Error('RESPONSABLE_NON_DESIGNE'));
    await controller.rejeterFormation(req, forbiddenRes, next);
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
  });
});
