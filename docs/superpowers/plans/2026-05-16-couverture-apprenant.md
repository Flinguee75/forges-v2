# Couverture Tests Apprenant — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Porter la couverture des modules apprenant (inscription, espace-apprenant) à >90% statements et >85% branches en ajoutant des tests qui cherchent activement des bugs.

**Architecture:** Tests unitaires Jest avec mocks Prisma/repo. Chaque tâche cible une zone non couverte précise. TDD strict : écrire le test, vérifier qu'il échoue pour la bonne raison, implémenter ou corriger, vérifier qu'il passe. Commit après chaque tâche.

**Tech Stack:** Jest, TypeScript, mocks manuels (pas de jest.mock automatique), fichiers de test dans `__tests__/`

**Commande de vérification coverage à utiliser après chaque tâche :**
```bash
cd forges-monorepo/backend
npx jest --no-coverage --testPathPattern="espace-apprenant|inscriptions/.*service" --coverage --coverageReporters=text 2>&1 | grep -E "inscription\.service|espace-apprenant\.service|espace-apprenant\.controller|attestation"
```

---

## Fichiers touchés

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/modules/inscriptions/__tests__/inscription.service.test.ts` | Modifier | Ajouter blocs de tests manquants |
| `src/modules/espace-apprenant/__tests__/espace-apprenant.service.test.ts` | Modifier | Ajouter tests getAccesFormationDemande + updateProgression |
| `src/modules/espace-apprenant/__tests__/espace-apprenant.controller.test.ts` | Modifier | Ajouter tests erreurs HTTP manquantes |

---

## Task 1 : inscription.service — ABONNEMENT source (RM-72)

**Lignes cibles :** 44-49

**Files:**
- Modify: `src/modules/inscriptions/__tests__/inscription.service.test.ts`

Ces deux cas ne sont pas testés : inscription avec `source_financement='ABONNEMENT'` sans abonnement actif → `ABONNEMENT_REQUIS`, et avec abonnement actif mais 3 formations déjà en cours → `FORMATION_LIMIT_REACHED` (RM-72).

- [ ] **Step 1 : Écrire les tests RED**

Ajouter ce bloc dans `inscription.service.test.ts`, après les tests existants, à l'intérieur du `describe('InscriptionService', ...)` :

```typescript
describe('RM-72 — Source ABONNEMENT', () => {
  it('rejette si aucun abonnement actif', async () => {
    mockSessionRepo.findById.mockResolvedValue(baseSession as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
    mockRetailRepo.countFormationsActives.mockResolvedValue(0);
    // findActifByApprenant n'existe pas sur mockRetailRepo — il faut l'ajouter au beforeEach
    mockRetailRepo.findActifByApprenant = jest.fn().mockResolvedValue(null);

    await expect(
      service.inscrire({ session_id: 'session-01', apprenantId: 'app-01', source_financement: 'ABONNEMENT' })
    ).rejects.toThrow('ABONNEMENT_REQUIS');
  });

  it('rejette si 3 formations actives déjà en cours (RM-72)', async () => {
    mockSessionRepo.findById.mockResolvedValue(baseSession as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
    mockRetailRepo.findActifByApprenant = jest.fn().mockResolvedValue({ id: 'abo-01', statut: 'ACTIF' });
    mockRetailRepo.countFormationsActives = jest.fn().mockResolvedValue(3);

    await expect(
      service.inscrire({ session_id: 'session-01', apprenantId: 'app-01', source_financement: 'ABONNEMENT' })
    ).rejects.toThrow('FORMATION_LIMIT_REACHED');
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd forges-monorepo/backend
npx jest --no-coverage --testPathPattern="inscription.service.test" 2>&1 | grep -E "PASS|FAIL|ABONNEMENT|FORMATION_LIMIT"
```

Attendu : FAIL — `mockRetailRepo.findActifByApprenant is not a function` ou erreur similaire.

- [ ] **Step 3 : Ajouter `findActifByApprenant` au mock dans `beforeEach`**

Dans le `beforeEach` de `inscription.service.test.ts`, modifier le mock `mockRetailRepo` :

```typescript
mockRetailRepo = {
  countFormationsActives: jest.fn(),
  findActifByApprenant: jest.fn().mockResolvedValue(null),
};
```

- [ ] **Step 4 : Relancer et vérifier GREEN**

```bash
npx jest --no-coverage --testPathPattern="inscription.service.test" 2>&1 | grep -E "PASS|FAIL|RM-72"
```

Attendu : PASS sur les 2 nouveaux tests.

- [ ] **Step 5 : Commit**

```bash
git add forges-monorepo/backend/src/modules/inscriptions/__tests__/inscription.service.test.ts
git commit -m "test(inscriptions): couvrir RM-72 source ABONNEMENT — ABONNEMENT_REQUIS + FORMATION_LIMIT_REACHED"
```

---

## Task 2 : inscription.service — Fenêtre GRIS (RM-18)

**Lignes cibles :** 72-77

**Files:**
- Modify: `src/modules/inscriptions/__tests__/inscription.service.test.ts`

Le type de fenêtre GRIS (100% < taux ≤ 110%) n'est jamais déclenché dans les tests. Il faut simuler une session presque pleine (ex : 9/10 inscrits → 10e inscription → taux = 100% → NORMAL ; 10/10 → 11e → taux = 110% → GRIS).

- [ ] **Step 1 : Écrire le test RED**

```typescript
describe('RM-18 — Type fenêtre inscription', () => {
  it('marque le dossier GRIS si taux > 100% et <= 110%', async () => {
    // session capacite=10, nbDossiersActifs=10 → (10+1)/10*100 = 110% → GRIS
    const sessionPleine = { ...baseSession, capacite: 10 };
    mockSessionRepo.findById.mockResolvedValue(sessionPleine as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
    mockFormationRepo.findById.mockResolvedValue({ id: 'formation-01', type_formation: 'STANDARD', cout_catalogue: 100000 } as any);
    mockPrisma.dossier.count.mockResolvedValue(10); // 10 actifs → taux (10+1)/10 = 110%
    mockDossierRepo.create.mockResolvedValue({ id: 'dossier-gris', statut: 'PAYE_DIRECTEMENT' } as any);
    mockPrisma.paiement.create.mockResolvedValue({ id: 'p-gris' } as any);
    mockAudit.info.mockResolvedValue(undefined);

    await service.inscrire({ session_id: 'session-01', apprenantId: 'app-01', source_financement: 'RETAIL' });

    expect(mockDossierRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ type_fenetre: 'GRIS' })
    );
  });

  it('marque le dossier EXCEPTION si taux > 110%', async () => {
    // session capacite=10, nbDossiersActifs=11 → (11+1)/10*100 = 120% → EXCEPTION
    const sessionPleine = { ...baseSession, capacite: 10 };
    mockSessionRepo.findById.mockResolvedValue(sessionPleine as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
    mockFormationRepo.findById.mockResolvedValue({ id: 'formation-01', type_formation: 'STANDARD', cout_catalogue: 100000 } as any);
    mockPrisma.dossier.count.mockResolvedValue(11); // taux (11+1)/10 = 120% → EXCEPTION
    mockDossierRepo.create.mockResolvedValue({ id: 'dossier-exc', statut: 'PAYE_DIRECTEMENT' } as any);
    mockPrisma.paiement.create.mockResolvedValue({ id: 'p-exc' } as any);
    mockAudit.info.mockResolvedValue(undefined);

    await service.inscrire({ session_id: 'session-01', apprenantId: 'app-01', source_financement: 'RETAIL' });

    expect(mockDossierRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ type_fenetre: 'EXCEPTION' })
    );
  });
});
```

- [ ] **Step 2 : Vérifier RED → GREEN**

```bash
npx jest --no-coverage --testPathPattern="inscription.service.test" 2>&1 | grep -E "RM-18|GRIS|EXCEPTION|PASS|FAIL"
```

- [ ] **Step 3 : Commit**

```bash
git add forges-monorepo/backend/src/modules/inscriptions/__tests__/inscription.service.test.ts
git commit -m "test(inscriptions): couvrir RM-18 fenêtres GRIS et EXCEPTION"
```

---

## Task 3 : inscription.service — Voucher ORGANISATION (RM-41, RM-140)

**Lignes cibles :** 103-118, 156-165, 181-210

**Files:**
- Modify: `src/modules/inscriptions/__tests__/inscription.service.test.ts`

Le path `source_financement='VOUCHER'` avec un voucher ORGANISATION mène au statut `PAYE` (pas `PAYE_DIRECTEMENT`), pose `voucher_organisation_id`, incrémente le quota, et notifie l'apprenant. C'est le chemin le plus important non testé — bug potentiel si le statut est mal assigné.

- [ ] **Step 1 : Écrire les tests RED**

```typescript
describe('RM-41 — Voucher ORGANISATION → statut PAYE', () => {
  const voucherOrg = {
    id: 'voucher-org-01',
    type: 'ORGANISATION',
    organisation_id: 'org-01',
    quota_max: 10,
    quota_utilise: 2,
    statut: 'ACTIF',
  };

  beforeEach(() => {
    mockSessionRepo.findById.mockResolvedValue(baseSession as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
    mockFormationRepo.findById.mockResolvedValue({ id: 'formation-01', type_formation: 'STANDARD', cout_catalogue: 100000 } as any);
    mockPrisma.dossier.count.mockResolvedValue(2);
    mockVoucherValidation.validerVoucher.mockResolvedValue(voucherOrg as any);
    mockPrisma.dossier.findFirst.mockResolvedValue(null); // pas de doublon voucher
    mockDossierRepo.create.mockResolvedValue({ id: 'dossier-org', statut: 'PAYE' } as any);
    mockPrisma.voucherOrganisation = { update: jest.fn().mockResolvedValue({ ...voucherOrg, quota_utilise: 3 }) };
    mockPrisma.paiement.create.mockResolvedValue({ id: 'p-org' } as any);
    mockPrisma.apprenant = { findUnique: jest.fn().mockResolvedValue({ email: 'a@test.ci', nom: 'Cisse', prenoms: 'Tidiane', langue_preferee: 'FR' }) };
    mockPrisma.organisation = { findUnique: jest.fn().mockResolvedValue({ raison_sociale: 'ACME Corp' }) };
    mockAudit.info.mockResolvedValue(undefined);
    mockEmail.sendEnrolementConfirmationApprenant = jest.fn().mockResolvedValue(undefined);
    mockEmail.sendPaiementConfirme = jest.fn().mockResolvedValue(undefined);
  });

  it('crée un dossier PAYE (pas PAYE_DIRECTEMENT) avec voucher_organisation_id positionné', async () => {
    const result = await service.inscrire({
      session_id: 'session-01',
      apprenantId: 'app-01',
      source_financement: 'VOUCHER',
      voucher_code: 'ORG-CODE-01',
    });

    expect(mockDossierRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        statut: 'PAYE',
        voucher_organisation_id: 'voucher-org-01',
      })
    );
  });

  it('rejette si le même voucher organisation a déjà été utilisé pour ce dossier (VOUCHER_ALREADY_USED)', async () => {
    mockPrisma.dossier.findFirst.mockResolvedValueOnce({ id: 'dossier-existant' }); // doublon détecté

    await expect(
      service.inscrire({
        session_id: 'session-01',
        apprenantId: 'app-01',
        source_financement: 'VOUCHER',
        voucher_code: 'ORG-CODE-01',
      })
    ).rejects.toThrow('VOUCHER_ALREADY_USED');
  });

  it('marque le voucher EPUISE quand quota_utilise atteint quota_max', async () => {
    const voucherPlein = { ...voucherOrg, quota_max: 3, quota_utilise: 2 };
    mockVoucherValidation.validerVoucher.mockResolvedValue(voucherPlein as any);
    mockPrisma.voucherOrganisation.update
      .mockResolvedValueOnce({ ...voucherPlein, quota_utilise: 3 }) // incrémente
      .mockResolvedValueOnce({ statut: 'EPUISE' });               // epuise

    await service.inscrire({
      session_id: 'session-01',
      apprenantId: 'app-01',
      source_financement: 'VOUCHER',
      voucher_code: 'ORG-CODE-01',
    });

    expect(mockPrisma.voucherOrganisation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ statut: 'EPUISE' }) })
    );
  });
});
```

- [ ] **Step 2 : Run RED**

```bash
npx jest --no-coverage --testPathPattern="inscription.service.test" 2>&1 | grep -E "RM-41|VOUCHER|PAYE|EPUISE|PASS|FAIL"
```

- [ ] **Step 3 : Corriger si bug découvert, sinon vérifier GREEN**

Si le test `statut PAYE` échoue parce que le code pose `PAYE_DIRECTEMENT`, c'est un bug réel — noter et corriger dans `inscription.service.ts` ligne ~156.

- [ ] **Step 4 : Commit**

```bash
git add forges-monorepo/backend/src/modules/inscriptions/__tests__/inscription.service.test.ts
git commit -m "test(inscriptions): couvrir RM-41 voucher ORGANISATION — statut PAYE + EPUISE + VOUCHER_ALREADY_USED"
```

---

## Task 4 : inscription.service — Réduction -15% abonnement à l'inscription (RM-88)

**Lignes cibles :** 126-138

**Files:**
- Modify: `src/modules/inscriptions/__tests__/inscription.service.test.ts`

La réduction de 15% pour abonnés Premium actifs est calculée au moment de l'inscription (`montant_remise`), mais aucun test ne vérifie ce path dans `inscrire()`. Risque : `montant_remise` posé à 0 même pour un abonné.

- [ ] **Step 1 : Écrire le test RED**

```typescript
describe('RM-88 — Réduction -15% abonné Premium à l inscription', () => {
  it('applique -15% sur montant_remise pour un abonné PREMIUM+RETAIL actif', async () => {
    mockSessionRepo.findById.mockResolvedValue(baseSession as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
    mockFormationRepo.findById.mockResolvedValue({
      id: 'formation-01',
      type_formation: 'PREMIUM',
      cout_catalogue: 100000,
      intitule: 'Cert Premium',
    } as any);
    mockPrisma.dossier.count.mockResolvedValue(2);
    mockPrisma.abonnementRetail.findFirst.mockResolvedValue({ id: 'abo-01', statut: 'ACTIF', offre: 'PREMIUM' });
    mockPrisma.voucherApporteur.findFirst.mockResolvedValue(null);
    mockDossierRepo.create.mockResolvedValue({ id: 'dossier-premium', statut: 'EN_ATTENTE_VERIFICATION' } as any);
    mockAudit.info.mockResolvedValue(undefined);
    mockEmail.notifyResponsable = jest.fn().mockResolvedValue(undefined);

    await service.inscrire({ session_id: 'session-01', apprenantId: 'app-01', source_financement: 'RETAIL' });

    expect(mockDossierRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        montant_remise: 15000, // 100000 * 0.15
      })
    );
  });

  it('n applique pas de réduction si pas d abonnement actif', async () => {
    mockSessionRepo.findById.mockResolvedValue(baseSession as any);
    mockDossierRepo.findActiveByApprenantAndSession.mockResolvedValue(null);
    mockFormationRepo.findById.mockResolvedValue({ id: 'formation-01', type_formation: 'PREMIUM', cout_catalogue: 100000 } as any);
    mockPrisma.dossier.count.mockResolvedValue(2);
    mockPrisma.abonnementRetail.findFirst.mockResolvedValue(null);
    mockPrisma.voucherApporteur.findFirst.mockResolvedValue(null);
    mockDossierRepo.create.mockResolvedValue({ id: 'dossier-premium', statut: 'EN_ATTENTE_VERIFICATION' } as any);
    mockAudit.info.mockResolvedValue(undefined);
    mockEmail.notifyResponsable = jest.fn().mockResolvedValue(undefined);

    await service.inscrire({ session_id: 'session-01', apprenantId: 'app-01', source_financement: 'RETAIL' });

    expect(mockDossierRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ montant_remise: 0 })
    );
  });
});
```

- [ ] **Step 2 : Run et vérifier (RED puis GREEN)**

```bash
npx jest --no-coverage --testPathPattern="inscription.service.test" 2>&1 | grep -E "RM-88|montant_remise|PASS|FAIL"
```

- [ ] **Step 3 : Commit**

```bash
git add forges-monorepo/backend/src/modules/inscriptions/__tests__/inscription.service.test.ts
git commit -m "test(inscriptions): couvrir RM-88 réduction -15% abonnement à l inscription"
```

---

## Task 5 : inscription.service — getDossiersByApprenant + getDossiersBackoffice (tri RM-19)

**Lignes cibles :** 578-628

**Files:**
- Modify: `src/modules/inscriptions/__tests__/inscription.service.test.ts`

`getDossiersByApprenant` avec filtre statut non testé. `getDossiersBackoffice` avec son tri EXCEPTION > GRIS > NORMAL non testé — c'est une logique métier critique pour le Responsable (RM-19).

- [ ] **Step 1 : Écrire les tests RED**

```typescript
describe('getDossiersByApprenant + getDossiersBackoffice', () => {
  it('getDossiersByApprenant filtre par statut si fourni', async () => {
    mockPrisma.dossier.findMany.mockResolvedValue([{ id: 'd-retenu', statut: 'RETENU' }]);

    const result = await service.getDossiersByApprenant('app-01', { statut: 'RETENU' });

    expect(mockPrisma.dossier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { apprenant_id: 'app-01', statut: 'RETENU' } })
    );
    expect(result).toHaveLength(1);
  });

  it('getDossiersBackoffice trie EXCEPTION < GRIS < NORMAL (RM-19)', async () => {
    mockPrisma.dossier.findMany.mockResolvedValue([
      { id: 'd-normal', type_fenetre: 'NORMAL', statut: 'PAYE_DIRECTEMENT' },
      { id: 'd-exception', type_fenetre: 'EXCEPTION', statut: 'EN_ATTENTE_VERIFICATION' },
      { id: 'd-gris', type_fenetre: 'GRIS', statut: 'EN_ATTENTE_VERIFICATION' },
    ] as any);

    const result = await service.getDossiersBackoffice({});

    expect(result[0].id).toBe('d-exception');
    expect(result[1].id).toBe('d-gris');
    expect(result[2].id).toBe('d-normal');
  });

  it('getDossiersBackoffice filtre par statut et search', async () => {
    mockPrisma.dossier.findMany.mockResolvedValue([]);

    await service.getDossiersBackoffice({ statut: 'RETENU', search: 'Cisse' });

    expect(mockPrisma.dossier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          statut: 'RETENU',
          apprenant: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      })
    );
  });
});
```

- [ ] **Step 2 : Run RED → GREEN**

```bash
npx jest --no-coverage --testPathPattern="inscription.service.test" 2>&1 | grep -E "getDossiers|backoffice|GRIS|EXCEPTION|PASS|FAIL"
```

- [ ] **Step 3 : Commit**

```bash
git add forges-monorepo/backend/src/modules/inscriptions/__tests__/inscription.service.test.ts
git commit -m "test(inscriptions): couvrir getDossiersByApprenant + getDossiersBackoffice tri RM-19"
```

---

## Task 6 : inscription.service — traiterException + getDossiersPrioritaires (RM-05, RM-19)

**Lignes cibles :** 744-761

**Files:**
- Modify: `src/modules/inscriptions/__tests__/inscription.service.test.ts`

`traiterException` et `getDossiersPrioritaires` sont entièrement non testés.

- [ ] **Step 1 : Écrire les tests RED**

```typescript
describe('traiterException (RM-05, RM-19)', () => {
  it('lance DOSSIER_NOT_FOUND si dossier inexistant', async () => {
    mockDossierRepo.findById.mockResolvedValue(null);
    await expect(service.traiterException('d-x', 'RETENU', undefined, 'resp-01')).rejects.toThrow('DOSSIER_NOT_FOUND');
  });

  it('lance NOT_EXCEPTION si le dossier n est pas de type EXCEPTION', async () => {
    mockDossierRepo.findById.mockResolvedValue({ id: 'd-01', type_fenetre: 'GRIS', statut: 'EN_ATTENTE_VERIFICATION', source_financement: 'RETAIL', session_id: 'session-01' } as any);
    await expect(service.traiterException('d-01', 'RETENU', undefined, 'resp-01')).rejects.toThrow('NOT_EXCEPTION');
  });

  it('lance MOTIF_OBLIGATOIRE si décision REFUSE sans motif suffisant', async () => {
    mockDossierRepo.findById.mockResolvedValue({ id: 'd-01', type_fenetre: 'EXCEPTION', statut: 'EN_ATTENTE_VERIFICATION', source_financement: 'RETAIL', session_id: 'session-01' } as any);
    await expect(service.traiterException('d-01', 'REFUSE', 'ok', 'resp-01')).rejects.toThrow('MOTIF_OBLIGATOIRE');
  });

  it('délègue à retenir() si décision RETENU', async () => {
    mockDossierRepo.findById
      .mockResolvedValueOnce({ id: 'd-01', type_fenetre: 'EXCEPTION', statut: 'EN_ATTENTE_VERIFICATION', source_financement: 'RETAIL', session_id: 'session-01', apprenant_id: 'app-01' } as any)
      .mockResolvedValueOnce({ id: 'd-01', statut: 'EN_ATTENTE_VERIFICATION', source_financement: 'RETAIL', session_id: 'session-01', apprenant_id: 'app-01' } as any);
    mockSessionRepo.findById.mockResolvedValue({ id: 'session-01', formation_id: 'formation-01', date_debut: new Date(), date_fin: new Date() } as any);
    mockFormationRepo.findById.mockResolvedValue({ id: 'formation-01', type_formation: 'PREMIUM', intitule: 'Test' } as any);
    mockDossierRepo.updateStatut.mockResolvedValue(undefined);
    mockDossierRepo.setDelaiPaiement.mockResolvedValue(undefined);
    mockAudit.info.mockResolvedValue(undefined);
    mockAudit.warning.mockResolvedValue(undefined);
    mockPrisma.apprenant.findUnique.mockResolvedValue({ email: 'a@test.ci', nom: 'X', prenoms: 'Y', langue_preferee: 'FR' } as any);
    (mockEmail as any).sendDossierRetenu = jest.fn().mockResolvedValue(undefined);

    const result = await service.traiterException('d-01', 'RETENU', undefined, 'resp-01');
    expect(result.success).toBe(true);
    expect(mockDossierRepo.updateStatut).toHaveBeenCalledWith('d-01', 'RETENU');
  });
});

describe('getDossiersPrioritaires (RM-19)', () => {
  it('délègue au repository', async () => {
    mockDossierRepo.findPrioritairesByResponsable = jest.fn().mockResolvedValue([{ id: 'd-prio' }]);
    const result = await service.getDossiersPrioritaires('resp-01');
    expect(result).toEqual([{ id: 'd-prio' }]);
    expect(mockDossierRepo.findPrioritairesByResponsable).toHaveBeenCalledWith('resp-01');
  });
});
```

- [ ] **Step 2 : Ajouter `findPrioritairesByResponsable` au mock dossierRepo dans `beforeEach`**

```typescript
mockDossierRepo = {
  findActiveByApprenantAndSession: jest.fn(),
  findBySession: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  updateStatut: jest.fn(),
  setDelaiPaiement: jest.fn(),
  findPrioritairesByResponsable: jest.fn(),
} as any;
```

- [ ] **Step 3 : Run RED → GREEN**

```bash
npx jest --no-coverage --testPathPattern="inscription.service.test" 2>&1 | grep -E "traiterException|getDossiersPrioritaires|PASS|FAIL"
```

- [ ] **Step 4 : Commit**

```bash
git add forges-monorepo/backend/src/modules/inscriptions/__tests__/inscription.service.test.ts
git commit -m "test(inscriptions): couvrir traiterException RM-05 + getDossiersPrioritaires RM-19"
```

---

## Task 7 : espace-apprenant.service — getAccesFormationDemande (RM-92, RM-103)

**Lignes cibles :** 131-168

**Files:**
- Modify: `src/modules/espace-apprenant/__tests__/espace-apprenant.service.test.ts`

`getAccesFormationDemande` n'est pas testé du tout. C'est une règle métier critique : accès expiré → 410, abonnement suspendu → 403, et mise à jour `last_access_at`.

- [ ] **Step 1 : Lire le début du fichier de test existant pour trouver le bon endroit**

Le fichier `espace-apprenant.service.test.ts` se termine avant `describe('getAccesFormationDemande')`. Ajouter à la fin, à l'intérieur du `describe('EspaceApprenantService', ...)`.

- [ ] **Step 2 : Écrire les tests RED**

```typescript
describe('getAccesFormationDemande (RM-92, RM-103)', () => {
  const accesActif = {
    id: 'acces-01',
    apprenant_id: 'a-01',
    formation_id: 'formation-01',
    statut: 'ACTIF',
    date_expiration: new Date(Date.now() + 30 * 24 * 3600 * 1000), // dans 30j
    source_financement: 'ABONNEMENT',
    progression: 45,
    formation: {
      id: 'formation-01',
      intitule: 'Cloud Computing',
      description_courte: 'Formation cloud',
      duree_jours: 30,
      type_formation: 'STANDARD',
      mode_formation: 'ELEARNING',
    },
  };

  beforeEach(() => {
    mockPrisma.accesFormationDemande = { update: jest.fn().mockResolvedValue({}) };
  });

  it('lance ACCES_NON_TROUVE si acces introuvable', async () => {
    mockRepo.findAccesFormationById.mockResolvedValue(null);
    await expect(service.getAccesFormationDemande('acces-01', 'a-01')).rejects.toThrow('ACCES_NON_TROUVE');
  });

  it('lance ACCES_EXPIRE si date_expiration dans le passé (RM-92)', async () => {
    mockRepo.findAccesFormationById.mockResolvedValue({
      ...accesActif,
      date_expiration: new Date(Date.now() - 1000), // expiré
    } as any);
    await expect(service.getAccesFormationDemande('acces-01', 'a-01')).rejects.toThrow('ACCES_EXPIRE');
  });

  it('lance ACCES_SUSPENDU_ABONNEMENT_INACTIF si statut SUSPENDU (RM-103)', async () => {
    mockRepo.findAccesFormationById.mockResolvedValue({
      ...accesActif,
      statut: 'SUSPENDU',
    } as any);
    await expect(service.getAccesFormationDemande('acces-01', 'a-01')).rejects.toThrow('ACCES_SUSPENDU_ABONNEMENT_INACTIF');
  });

  it('met à jour last_access_at et retourne l acces avec url_contenu', async () => {
    mockRepo.findAccesFormationById.mockResolvedValue(accesActif as any);

    const result = await service.getAccesFormationDemande('acces-01', 'a-01');

    expect(mockPrisma.accesFormationDemande.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'acces-01' }, data: expect.objectContaining({ last_access_at: expect.any(Date) }) })
    );
    expect(result.id).toBe('acces-01');
    expect(result.url_contenu).toContain('formations/formation-01');
    expect(result.formation.titre).toBe('Cloud Computing'); // mapping intitule → titre
  });
});
```

- [ ] **Step 3 : Run RED → GREEN**

```bash
npx jest --no-coverage --testPathPattern="espace-apprenant.service.test" 2>&1 | grep -E "getAccesFormation|RM-92|RM-103|PASS|FAIL"
```

- [ ] **Step 4 : Commit**

```bash
git add forges-monorepo/backend/src/modules/espace-apprenant/__tests__/espace-apprenant.service.test.ts
git commit -m "test(espace-apprenant): couvrir getAccesFormationDemande RM-92 + RM-103"
```

---

## Task 8 : espace-apprenant.service — updateProgressionFormationDemande

**Lignes cibles :** 172-190 (branches FORBIDDEN + ACCES_NON_MODIFIABLE non couvertes)

**Files:**
- Modify: `src/modules/espace-apprenant/__tests__/espace-apprenant.service.test.ts`

- [ ] **Step 1 : Écrire les tests RED**

```typescript
describe('updateProgressionFormationDemande', () => {
  it('lance ACCES_NON_TROUVE si acces introuvable', async () => {
    mockRepo.findAccesFormationById.mockResolvedValue(null);
    await expect(service.updateProgressionFormationDemande('acces-01', 'a-01', 50)).rejects.toThrow('ACCES_NON_TROUVE');
  });

  it('lance ACCES_NON_MODIFIABLE si statut != ACTIF', async () => {
    mockRepo.findAccesFormationById.mockResolvedValue({
      id: 'acces-01', apprenant_id: 'a-01', statut: 'SUSPENDU',
    } as any);
    await expect(service.updateProgressionFormationDemande('acces-01', 'a-01', 50)).rejects.toThrow('ACCES_NON_MODIFIABLE');
  });

  it('normalise la progression entre 0 et 100 et met à jour', async () => {
    mockRepo.findAccesFormationById.mockResolvedValue({
      id: 'acces-01', apprenant_id: 'a-01', statut: 'ACTIF',
    } as any);
    mockRepo.updateProgression.mockResolvedValue({ id: 'acces-01', progression: 100 } as any);

    const result = await service.updateProgressionFormationDemande('acces-01', 'a-01', 150); // > 100 → clamped
    expect(mockRepo.updateProgression).toHaveBeenCalledWith('acces-01', 100);
  });
});
```

- [ ] **Step 2 : Run RED → GREEN**

```bash
npx jest --no-coverage --testPathPattern="espace-apprenant.service.test" 2>&1 | grep -E "updateProgression|ACCES_NON_MODIFIABLE|PASS|FAIL"
```

- [ ] **Step 3 : Commit**

```bash
git add forges-monorepo/backend/src/modules/espace-apprenant/__tests__/espace-apprenant.service.test.ts
git commit -m "test(espace-apprenant): couvrir updateProgressionFormationDemande"
```

---

## Task 9 : espace-apprenant.controller — erreurs HTTP manquantes

**Lignes cibles :** 10-14, 58-74, 97-107, 122-139

**Files:**
- Modify: `src/modules/espace-apprenant/__tests__/espace-apprenant.controller.test.ts`

Les handlers de codes HTTP pour `getAttestationUrl` (INVALID_ENCRYPTION_KEY, ATTESTATION_DOSSIER_NON_PAYE, ATTESTATION_SESSION_NON_CLOTUREE), `getMesAttestations` (next(error)), et `updateProgressionFormationDemande` (ZodError 400, ACCES_NON_MODIFIABLE 409) ne sont pas testés.

- [ ] **Step 1 : Écrire les tests RED**

```typescript
describe('getMesAttestations', () => {
  it('retourne 200 avec les attestations', async () => {
    const req = createMockReq({ user: { userId: 'app-01', role: 'APPRENANT', langue: 'FR' } });
    const res = createMockRes();
    const next = createNext();
    service.getMesAttestations = jest.fn().mockResolvedValue([{ dossier_id: 'd-01' }]);

    await controller.getMesAttestations(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('délègue les erreurs inattendues à next', async () => {
    const req = createMockReq({ user: { userId: 'app-01', role: 'APPRENANT', langue: 'FR' } });
    const next = createNext();
    service.getMesAttestations = jest.fn().mockRejectedValue(new Error('DB_DOWN'));

    await controller.getMesAttestations(req, createMockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'DB_DOWN' }));
  });
});

describe('getAttestationUrl — erreurs HTTP', () => {
  const req = createMockReq({ params: { dossierId: 'd-01' }, user: { userId: 'app-01', role: 'APPRENANT', langue: 'FR' } });

  it.each([
    ['ATTESTATION_DOSSIER_NON_PAYE', 403],
    ['ATTESTATION_SESSION_NON_CLOTUREE', 403],
    ['INVALID_ENCRYPTION_KEY', 500],
    ['DOSSIER_NOT_FOUND', 404],
  ])('retourne %s → HTTP %i', async (message, status) => {
    service.getAttestationPdf = jest.fn().mockRejectedValue(new Error(message));
    const res = createMockRes();
    await controller.getAttestationUrl(req, res, createNext());
    expect(res.status).toHaveBeenCalledWith(status);
  });
});

describe('getAccesFormationDemande — erreurs HTTP', () => {
  const req = createMockReq({ params: { accesId: 'acces-01' }, user: { userId: 'app-01', role: 'APPRENANT', langue: 'FR' } });

  it.each([
    ['ACCES_NON_TROUVE', 404],
    ['ACCES_EXPIRE', 410],
    ['ACCES_SUSPENDU_ABONNEMENT_INACTIF', 403],
  ])('retourne %s → HTTP %i', async (message, status) => {
    service.getAccesFormationDemande = jest.fn().mockRejectedValue(new Error(message));
    const res = createMockRes();
    await controller.getAccesFormationDemande(req, res, createNext());
    expect(res.status).toHaveBeenCalledWith(status);
  });
});

describe('updateProgressionFormationDemande — erreurs HTTP', () => {
  const req = createMockReq({
    params: { accesId: 'acces-01' },
    user: { userId: 'app-01', role: 'APPRENANT', langue: 'FR' },
    body: { progression: 'invalide' },
  });

  it('retourne 400 si progression invalide (ZodError)', async () => {
    const res = createMockRes();
    await controller.updateProgressionFormationDemande(req, res, createNext());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retourne 409 si ACCES_NON_MODIFIABLE', async () => {
    const reqOk = createMockReq({ params: { accesId: 'acces-01' }, user: { userId: 'app-01', role: 'APPRENANT', langue: 'FR' }, body: { progression: 50 } });
    service.updateProgressionFormationDemande = jest.fn().mockRejectedValue(new Error('ACCES_NON_MODIFIABLE'));
    const res = createMockRes();
    await controller.updateProgressionFormationDemande(reqOk, res, createNext());
    expect(res.status).toHaveBeenCalledWith(409);
  });
});
```

- [ ] **Step 2 : Run RED → GREEN**

```bash
npx jest --no-coverage --testPathPattern="espace-apprenant.controller.test" 2>&1 | grep -E "getMesAttestations|getAttestationUrl|getAccesFormation|updateProgression|PASS|FAIL"
```

- [ ] **Step 3 : Commit**

```bash
git add forges-monorepo/backend/src/modules/espace-apprenant/__tests__/espace-apprenant.controller.test.ts
git commit -m "test(espace-apprenant): couvrir erreurs HTTP manquantes du controller"
```

---

## Task 10 : Vérification coverage finale + push

- [ ] **Step 1 : Lancer coverage complet**

```bash
cd forges-monorepo/backend
npx jest --no-coverage --testPathPattern="espace-apprenant|inscriptions/.*service" --coverage --coverageReporters=text 2>&1 | grep -E "inscription\.service|espace-apprenant\.service|espace-apprenant\.controller|attestation"
```

Objectifs :
- `inscription.service.ts` : > 85% stmts, > 75% branches
- `espace-apprenant.service.ts` : > 92% stmts, > 88% branches
- `espace-apprenant.controller.ts` : > 92% stmts, > 88% branches
- `attestation.service.ts` : 100% stmts (déjà atteint)

- [ ] **Step 2 : Suite complète non-régression**

```bash
npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 1 seul échec pré-existant (`paiement-fineo.service.test.ts`), tous les autres PASS.

- [ ] **Step 3 : Push**

```bash
git push forges-v2 develop
```
