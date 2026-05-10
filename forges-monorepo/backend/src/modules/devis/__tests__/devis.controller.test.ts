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
});
