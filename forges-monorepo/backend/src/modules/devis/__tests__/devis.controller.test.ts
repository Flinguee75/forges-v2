import { DevisController } from '../devis.controller';

describe('DevisController', () => {
  it('refuse la creation de devis sans session_id', async () => {
    const service = {
      creerDevis: jest.fn(),
    } as any;
    const controller = new DevisController(service);

    const req = {
      body: {
        organisation_id: '550e8400-e29b-41d4-a716-446655440000',
        formation_id: 'formation-01',
        nb_places: 3,
        tarif_unitaire_xof: 15000,
      },
      user: { userId: 'admin-01' },
    } as any;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await controller.creerDevis(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'VALIDATION_ERROR',
      })
    );
    expect(service.creerDevis).not.toHaveBeenCalled();
  });

  it('accepte un session_id opaque non UUID', async () => {
    const service = {
      creerDevis: jest.fn().mockResolvedValue({ id: 'devis-01' }),
    } as any;
    const controller = new DevisController(service);

    const req = {
      body: {
        organisation_id: '550e8400-e29b-41d4-a716-446655440000',
        formation_id: 'formation-01',
        session_id: 'ses-gwu-ccdl-juin-2026',
        nb_places: 3,
        tarif_unitaire_xof: 15000,
      },
      user: { userId: 'admin-01' },
    } as any;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await controller.creerDevis(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(service.creerDevis).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: 'ses-gwu-ccdl-juin-2026' }),
      'admin-01'
    );
  });

  it('accepte un devis apprenant sans organisation_id', async () => {
    const service = {
      creerDevis: jest.fn().mockResolvedValue({ id: 'devis-02' }),
    } as any;
    const controller = new DevisController(service);

    const req = {
      body: {
        destinataire_nom: 'Koné Mamadou',
        destinataire_email: 'mamadou.kone@example.com',
        formation_id: 'formation-01',
        session_id: 'session-01',
        tarif_unitaire_xof: 150000,
      },
      user: { userId: 'admin-01' },
    } as any;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await controller.creerDevis(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(service.creerDevis).toHaveBeenCalledWith(
      expect.objectContaining({
        destinataire_nom: 'Koné Mamadou',
        destinataire_email: 'mamadou.kone@example.com',
      }),
      'admin-01'
    );
  });

  it('refuse si ni organisation_id ni destinataire_nom fourni', async () => {
    const service = { creerDevis: jest.fn() } as any;
    const controller = new DevisController(service);

    const req = {
      body: {
        formation_id: 'formation-01',
        session_id: 'session-01',
        nb_places: 2,
        tarif_unitaire_xof: 150000,
      },
      user: { userId: 'admin-01' },
    } as any;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await controller.creerDevis(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'VALIDATION_ERROR' })
    );
    expect(service.creerDevis).not.toHaveBeenCalled();
  });

  it('refuse si organisation_id et destinataire_nom fournis simultanement', async () => {
    const service = { creerDevis: jest.fn() } as any;
    const controller = new DevisController(service);

    const req = {
      body: {
        organisation_id: '550e8400-e29b-41d4-a716-446655440000',
        destinataire_nom: 'Koné Mamadou',
        destinataire_email: 'mamadou.kone@example.com',
        formation_id: 'formation-01',
        session_id: 'session-01',
        nb_places: 1,
        tarif_unitaire_xof: 150000,
      },
      user: { userId: 'admin-01' },
    } as any;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await controller.creerDevis(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'VALIDATION_ERROR' })
    );
    expect(service.creerDevis).not.toHaveBeenCalled();
  });

  it('mappe SESSION_NON_ELIGIBLE_DEVIS en 400', async () => {
    const service = {
      creerDevis: jest.fn().mockRejectedValue(new Error('SESSION_NON_ELIGIBLE_DEVIS')),
    } as any;
    const controller = new DevisController(service);

    const req = {
      body: {
        organisation_id: '550e8400-e29b-41d4-a716-446655440000',
        formation_id: 'formation-01',
        session_id: '550e8400-e29b-41d4-a716-446655440001',
        nb_places: 3,
        tarif_unitaire_xof: 15000,
      },
      user: { userId: 'admin-01' },
    } as any;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await controller.creerDevis(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'SESSION_NON_ELIGIBLE_DEVIS',
      })
    );
  });

  it('mappe NUMERO_DEVIS_COLLISION en 409 avec message utilisateur', async () => {
    const service = {
      creerDevis: jest.fn().mockRejectedValue(new Error('NUMERO_DEVIS_COLLISION')),
    } as any;
    const controller = new DevisController(service);

    const req = {
      body: {
        organisation_id: '550e8400-e29b-41d4-a716-446655440000',
        formation_id: 'formation-01',
        session_id: '550e8400-e29b-41d4-a716-446655440001',
        nb_places: 3,
        tarif_unitaire_xof: 15000,
      },
      user: { userId: 'admin-01' },
    } as any;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await controller.creerDevis(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'NUMERO_DEVIS_COLLISION',
        message: expect.stringContaining('Réessayez'),
      })
    );
  });
});
