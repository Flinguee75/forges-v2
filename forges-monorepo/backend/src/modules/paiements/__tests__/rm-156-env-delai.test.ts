/**
 * Tests unitaires — RM-156 : PAIEMENT_EXPIRATION_HEURES depuis .env
 *
 * Couvre :
 *   RM-156.3 : delai 72h lu depuis PAIEMENT_EXPIRATION_HEURES (pas hardcode)
 *   RM-156.4 : fallback = 72 si var env absente
 *   RM-156.5 : surcharge via env (ex: 48h en test)
 */

describe('RM-156 — PAIEMENT_EXPIRATION_HEURES depuis .env', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('getDelaiPaiementMs() retourne 72h (RM-07) par defaut', async () => {
    delete process.env.PAIEMENT_EXPIRATION_HEURES;
    const { getDelaiPaiementMs } = await import('../../../config/env.config');
    expect(getDelaiPaiementMs()).toBe(72 * 3600 * 1000);
  });

  it('getDelaiPaiementMs() retourne la valeur de PAIEMENT_EXPIRATION_HEURES si definie', async () => {
    process.env.PAIEMENT_EXPIRATION_HEURES = '48';
    const { getDelaiPaiementMs } = await import('../../../config/env.config');
    expect(getDelaiPaiementMs()).toBe(48 * 3600 * 1000);
  });

  it('ne hardcode jamais 72 — la valeur vient toujours de PAIEMENT_EXPIRATION_HEURES', async () => {
    process.env.PAIEMENT_EXPIRATION_HEURES = '24';
    const { getDelaiPaiementMs } = await import('../../../config/env.config');
    expect(getDelaiPaiementMs()).not.toBe(72 * 3600 * 1000);
    expect(getDelaiPaiementMs()).toBe(24 * 3600 * 1000);
  });
});

describe('RM-156 — SEUIL_REVERSEMENT_APPORTEUR_XOF depuis .env', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('getSeuilReversementApporteur() retourne 5000 par defaut', async () => {
    delete process.env.SEUIL_REVERSEMENT_APPORTEUR_XOF;
    const { getSeuilReversementApporteur } = await import('../../../config/env.config');
    expect(getSeuilReversementApporteur()).toBe(5000);
  });

  it('getSeuilReversementApporteur() lit depuis env si defini', async () => {
    process.env.SEUIL_REVERSEMENT_APPORTEUR_XOF = '10000';
    const { getSeuilReversementApporteur } = await import('../../../config/env.config');
    expect(getSeuilReversementApporteur()).toBe(10000);
  });
});

describe('RM-156 — COMMISSION_FORGES_DEFAULT_PCT depuis .env', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('getCommissionForgesDefaut() retourne 30 par defaut (v4.9)', async () => {
    delete process.env.COMMISSION_FORGES_DEFAULT_PCT;
    const { getCommissionForgesDefaut } = await import('../../../config/env.config');
    expect(getCommissionForgesDefaut()).toBe(30);
  });

  it('getCommissionForgesDefaut() ne retourne jamais 20', async () => {
    delete process.env.COMMISSION_FORGES_DEFAULT_PCT;
    const { getCommissionForgesDefaut } = await import('../../../config/env.config');
    expect(getCommissionForgesDefaut()).not.toBe(20);
  });

  it('getCommissionForgesDefaut() lit depuis env si defini', async () => {
    process.env.COMMISSION_FORGES_DEFAULT_PCT = '35';
    const { getCommissionForgesDefaut } = await import('../../../config/env.config');
    expect(getCommissionForgesDefaut()).toBe(35);
  });
});
