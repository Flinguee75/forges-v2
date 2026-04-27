const UUID = '550e8400-e29b-41d4-a716-446655440000';

export function buildApprenant(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID,
    email: 'apprenant@test.ci',
    nom: 'Doe',
    prenoms: 'Jane',
    statut: 'ACTIF',
    langue_preferee: 'FR',
    organisation_id: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

export function buildOrganisation(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID,
    email: 'organisation@test.ci',
    raison_sociale: 'ORG TEST',
    contact_referent: 'Referent',
    pays: 'CI',
    statut: 'ACTIF',
    langue_preferee: 'FR',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

export function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID,
    formation_id: 'formation-01',
    date_ouverture: new Date('2026-01-01T00:00:00.000Z'),
    date_cloture: new Date('2026-01-05T00:00:00.000Z'),
    date_debut: new Date('2026-01-10T00:00:00.000Z'),
    date_fin: new Date('2026-01-12T00:00:00.000Z'),
    capacite: 20,
    nb_inscrits: 3,
    places_restantes: 17,
    statut: 'INSCRIPTIONS_OUVERTES',
    ...overrides,
  };
}

export function buildDossier(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID,
    apprenant_id: UUID,
    formation_id: 'formation-01',
    session_id: 'session-01',
    statut: 'PAYE',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    source_financement: 'RETAIL',
    ...overrides,
  };
}

export function buildPaiement(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID,
    dossier_id: UUID,
    montant_catalogue: 100000,
    montant_final: 90000,
    statut: 'CONFIRME',
    confirmed_at: new Date('2026-01-02T00:00:00.000Z'),
    expires_at: new Date('2026-01-03T00:00:00.000Z'),
    tentatives: 0,
    ...overrides,
  };
}
