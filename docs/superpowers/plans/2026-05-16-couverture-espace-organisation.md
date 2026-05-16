# Couverture tests espace-organisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Porter `espace-organisation.service.ts` de 45% à 85%+ et `espace-organisation.controller.ts` de 47% à 80%+ en couvrant les méthodes et branches non testées, en trouvant les bugs au passage.

**Architecture:** Tests unitaires Jest uniquement — service via mocks Prisma + repo, controller via `createMockReq/createMockRes/createNext`. Chaque tâche touche un ou deux blocs de méthodes thématiquement proches. Aucune modification du code de production sauf correction de bug réel trouvé en écrivant le test.

**Tech Stack:** Node.js 20, TypeScript, Jest, bcrypt (mocké), uuid (mocké), Prisma (mocké), helpers HTTP maison (`src/__tests__/helpers/http.ts`).

---

## Fichiers impactés

- Modify: `src/modules/espace-organisation/__tests__/espace-organisation.service.test.ts`
- Modify: `src/modules/espace-organisation/__tests__/espace-organisation.controller.test.ts`
- Possibly modify: `src/modules/espace-organisation/espace-organisation.service.ts` (si bug trouvé)
- Possibly modify: `src/modules/espace-organisation/espace-organisation.controller.ts` (si bug trouvé)

## Commande de couverture de référence

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
npx jest --no-coverage --testPathPattern="espace-organisation" --coverage --coverageReporters=text 2>&1 | \
grep -E "espace-organisation\.service|espace-organisation\.controller|import-csv|rapport"
```

---

## Gaps à combler

**Service — méthodes 0% :**
- `createMembre` — EMAIL_DEJA_UTILISE, B2B_PLAFOND_ATTEINT, succès (lines 144-203)
- `commanderVouchers` — FORMATION_NOT_FOUND, succès (lines 206-239)
- `getMesPaiements` — pagination + filtres date (lines 280-318)
- `getMonProfil` — succès + ORGANISATION_NOT_FOUND (lines 321-336)
- `updateMonProfil` — succès (lines 339-356)

**Service — branches manquantes dans méthodes testées :**
- `getDashboard` — branche ORGANISATION_NOT_FOUND (ligne 37)
- `getDashboardB2B` — branche ABONNEMENT_B2B_INACTIF (ligne 93)
- `desactiverBeneficiaire` — branche APPRENANT_NOT_FOUND (ligne 116)

**Controller — routes 0% :**
- `createMembre` — 201 succès, 409 B2B_PLAFOND_ATTEINT, 409 EMAIL_DEJA_UTILISE
- `commanderVouchers` — 201 succès, 404 FORMATION_NOT_FOUND
- `getSuiviInscriptions` — 200 succès
- `getMesPaiements` — 200 succès
- `getMonProfil` — 200 succès, 404 ORGANISATION_NOT_FOUND
- `updateMonProfil` — 200 succès

---

## Task 1 : Service — branches d'erreur manquantes dans méthodes déjà partiellement testées

**Files:**
- Modify: `src/modules/espace-organisation/__tests__/espace-organisation.service.test.ts`

### Contexte

Trois méthodes ont des branches d'erreur non couvertes :
- `getDashboard` lance `ORGANISATION_NOT_FOUND` si `orgRepo.findOrganisationById` retourne `null`
- `getDashboardB2B` lance `ABONNEMENT_B2B_INACTIF` si `org?.abonnement_b2b` est falsy
- `desactiverBeneficiaire` lance `APPRENANT_NOT_FOUND` si `prisma.apprenant.findFirst` retourne `null`

- [ ] **Step 1 : Ajouter les tests manquants**

Dans le fichier `espace-organisation.service.test.ts`, ajouter à l'intérieur du `describe('EspaceOrganisationService')` existant, après les blocs actuels :

```typescript
// Branches d'erreur manquantes — méthodes déjà partiellement testées
describe('getDashboard — ORGANISATION_NOT_FOUND', () => {
  it('lance ORGANISATION_NOT_FOUND si l organisation est introuvable', async () => {
    mockRepo.findOrganisationById.mockResolvedValue(null);
    mockRepo.getStatsOrganisation.mockResolvedValue({} as any);
    mockPrisma.dossier.findMany.mockResolvedValue([]);

    await expect(service.getDashboard('org-inconnue')).rejects.toThrow('ORGANISATION_NOT_FOUND');
  });
});

describe('getDashboardB2B — ABONNEMENT_B2B_INACTIF', () => {
  it('lance ABONNEMENT_B2B_INACTIF si l organisation n a pas d abonnement B2B', async () => {
    const orgSansB2B = { ...orgAvecB2B, abonnement_b2b: null };
    mockRepo.findOrganisationById.mockResolvedValue(orgSansB2B as any);

    await expect(service.getDashboardB2B('org-01')).rejects.toThrow('ABONNEMENT_B2B_INACTIF');
  });

  it('lance ABONNEMENT_B2B_INACTIF si l organisation est introuvable', async () => {
    mockRepo.findOrganisationById.mockResolvedValue(null);

    await expect(service.getDashboardB2B('org-inconnue')).rejects.toThrow('ABONNEMENT_B2B_INACTIF');
  });
});

describe('desactiverBeneficiaire — APPRENANT_NOT_FOUND', () => {
  it('lance APPRENANT_NOT_FOUND si l apprenant n appartient pas a l organisation', async () => {
    mockPrisma.apprenant.findFirst.mockResolvedValue(null);

    await expect(
      service.desactiverBeneficiaire('app-inexistant', 'org-01', 'user-01')
    ).rejects.toThrow('APPRENANT_NOT_FOUND');
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent (RED)**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
npx jest --no-coverage --testPathPattern="espace-organisation.service" 2>&1 | tail -15
```

Ces tests doivent PASSER directement car la logique est déjà en place — si l'un échoue, c'est un bug.

- [ ] **Step 3 : Relancer la suite et vérifier**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
npx jest --no-coverage --testPathPattern="espace-organisation.service" 2>&1 | tail -10
```

Expected: tous les tests PASS.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
git add src/modules/espace-organisation/__tests__/espace-organisation.service.test.ts && \
git commit -m "test(org): couvrir branches ORGANISATION_NOT_FOUND, ABONNEMENT_B2B_INACTIF, APPRENANT_NOT_FOUND"
```

---

## Task 2 : Service — createMembre (RM-61, RM-62)

**Files:**
- Modify: `src/modules/espace-organisation/__tests__/espace-organisation.service.test.ts`

### Contexte

`createMembre` (lignes 144-203) :
1. Vérifie unicité email (`prisma.apprenant.findUnique`)
2. Vérifie plafond B2B (`orgRepo.findOrganisationById` + `orgRepo.countActifsB2B`)
3. Hache le mot de passe avec bcrypt (à mocker avec `jest.mock('bcrypt')`)
4. Crée l'apprenant (`prisma.apprenant.create`)
5. Incrémente `nb_actifs` B2B si `abonnement_b2b_id` présent
6. Audite + envoie email temp

**Important :** `bcrypt.hash` est un appel réel — il faut le mocker au niveau du module. Ajouter en haut du fichier de test (après les imports existants) :

```typescript
jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed-password') }));
jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('uuid-12345678-xxxx') }));
```

- [ ] **Step 1 : Ajouter les mocks bcrypt/uuid en tête de fichier**

Ouvrir `espace-organisation.service.test.ts`. Après les imports existants (ligne 7), avant `describe(...)`, ajouter :

```typescript
jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed-password') }));
jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('uuid-12345678901') }));
```

- [ ] **Step 2 : Ajouter `apprenant.findUnique` et `apprenant.create` au mockPrisma**

Dans le `beforeEach`, dans l'objet `mockPrisma`, ajouter les mocks manquants :

```typescript
mockPrisma = {
  apprenant: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),  // <-- AJOUTER
    update: jest.fn(),
    create: jest.fn(),      // <-- AJOUTER
  },
  abonnementB2B: { update: jest.fn() },
  dossier: { findMany: jest.fn(), count: jest.fn() },
  paiement: { findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  formation: { findUnique: jest.fn() },
  voucherApporteur: { create: jest.fn() },  // <-- AJOUTER pour Task 3
};
```

Et ajouter `mockEmail` avec `sendTempPassword` mocké :

```typescript
mockEmail = { sendTempPassword: jest.fn().mockResolvedValue(undefined) } as any;
```

- [ ] **Step 3 : Ajouter le describe createMembre**

```typescript
describe('createMembre — RM-61', () => {
  const dataCreation = {
    email: 'nouveau@org.ci',
    nom: 'Diallo',
    prenom: 'Aissatou',
    secteur_activite: 'TECH',
    niveau_etude: 'BAC+5',
  };

  it('lance EMAIL_DEJA_UTILISE si l email existe deja', async () => {
    mockPrisma.apprenant.findUnique.mockResolvedValue({ id: 'app-existant' });

    await expect(service.createMembre('org-01', dataCreation)).rejects.toThrow('EMAIL_DEJA_UTILISE');
    expect(mockPrisma.apprenant.create).not.toHaveBeenCalled();
  });

  it('lance B2B_PLAFOND_ATTEINT si quota depasse', async () => {
    mockPrisma.apprenant.findUnique.mockResolvedValue(null);
    const orgPleine = { ...orgAvecB2B, abonnement_b2b: { ...orgAvecB2B.abonnement_b2b, nb_max: 30 } };
    mockRepo.findOrganisationById.mockResolvedValue(orgPleine as any);
    mockRepo.countActifsB2B.mockResolvedValue(30);

    await expect(service.createMembre('org-01', dataCreation)).rejects.toThrow('B2B_PLAFOND_ATTEINT');
    expect(mockPrisma.apprenant.create).not.toHaveBeenCalled();
  });

  it('cree l apprenant et incremente nb_actifs B2B', async () => {
    mockPrisma.apprenant.findUnique.mockResolvedValue(null);
    mockRepo.findOrganisationById.mockResolvedValue(orgAvecB2B as any);
    mockRepo.countActifsB2B.mockResolvedValue(30); // 30/50 — place dispo
    const apprenantCree = { id: 'app-nouveau', email: 'nouveau@org.ci', nom: 'Diallo', prenoms: 'Aissatou' };
    mockPrisma.apprenant.create.mockResolvedValue(apprenantCree);
    mockPrisma.abonnementB2B.update.mockResolvedValue({});
    mockAudit.info.mockResolvedValue(undefined);

    const result = await service.createMembre('org-01', dataCreation);

    expect(mockPrisma.apprenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'nouveau@org.ci',
          nom: 'Diallo',
          organisation_id: 'org-01',
          statut: 'ACTIF',
        }),
      })
    );
    expect(mockPrisma.abonnementB2B.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { nb_actifs: { increment: 1 } } })
    );
    expect(result.apprenant.id).toBe('app-nouveau');
  });
});
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
npx jest --no-coverage --testPathPattern="espace-organisation.service" 2>&1 | tail -10
```

Expected: PASS. Si `bcrypt` ou `uuid` causent une erreur, vérifier que les `jest.mock` sont en tête de fichier (avant tout import de module qui les utilise).

- [ ] **Step 5 : Commit**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
git add src/modules/espace-organisation/__tests__/espace-organisation.service.test.ts && \
git commit -m "test(org): couvrir createMembre — EMAIL_DEJA_UTILISE, B2B_PLAFOND_ATTEINT, succes"
```

---

## Task 3 : Service — commanderVouchers + getMesPaiements

**Files:**
- Modify: `src/modules/espace-organisation/__tests__/espace-organisation.service.test.ts`

### Contexte

`commanderVouchers` (lignes 206-239) :
- Lance `FORMATION_NOT_FOUND` si `prisma.formation.findUnique` retourne null
- Crée `data.quantite` vouchers via `prisma.voucherApporteur.create`

`getMesPaiements` (lignes 280-318) :
- Pagination avec `page`/`limit` (défaut 1/20)
- Filtres date via `date_debut`/`date_fin` → `confirmed_at`
- Retourne `{ paiements, total, page, limit }`

- [ ] **Step 1 : Ajouter describe commanderVouchers**

```typescript
describe('commanderVouchers', () => {
  it('lance FORMATION_NOT_FOUND si la formation est introuvable', async () => {
    mockPrisma.formation.findUnique.mockResolvedValue(null);

    await expect(
      service.commanderVouchers('org-01', { formation_id: 'f-inconnue', quantite: 5 })
    ).rejects.toThrow('FORMATION_NOT_FOUND');
    expect(mockPrisma.voucherApporteur.create).not.toHaveBeenCalled();
  });

  it('cree le bon nombre de vouchers et journalise', async () => {
    const formation = { id: 'f-01', cout_catalogue: 150000 };
    mockPrisma.formation.findUnique.mockResolvedValue(formation as any);
    mockPrisma.voucherApporteur.create.mockResolvedValue({ id: 'v-01', code: 'ORG-xxx', statut: 'ACTIF' });
    mockAudit.info.mockResolvedValue(undefined);

    const result = await service.commanderVouchers('org-01', { formation_id: 'f-01', quantite: 3 });

    expect(mockPrisma.voucherApporteur.create).toHaveBeenCalledTimes(3);
    expect(mockPrisma.voucherApporteur.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organisation_id: 'org-01',
          formation_id: 'f-01',
          statut: 'ACTIF',
          type: 'PROMOTIONNEL',
          valeur: 150000,
        }),
      })
    );
    expect(result.vouchers).toHaveLength(3);
    expect(mockAudit.info).toHaveBeenCalledWith('VOUCHERS_COMMANDES', expect.objectContaining({ quantite: 3 }));
  });
});
```

- [ ] **Step 2 : Ajouter describe getMesPaiements**

```typescript
describe('getMesPaiements', () => {
  const paiementFixture = [
    {
      id: 'p-01',
      statut: 'CONFIRME',
      confirmed_at: new Date('2026-03-15'),
      montant_final: 200000,
      dossier: {
        apprenant: { nom: 'Cisse', prenoms: 'Tidiane', email: 't@org.ci' },
        formation: { intitule: 'Cloud AWS' },
      },
    },
  ];

  it('retourne la liste paginee des paiements', async () => {
    mockPrisma.paiement.findMany.mockResolvedValue(paiementFixture);
    mockPrisma.paiement.count.mockResolvedValue(1);

    const result = await service.getMesPaiements('org-01', { page: 1, limit: 20 });

    expect(result.paiements).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('applique le filtre date_debut dans le where Prisma', async () => {
    mockPrisma.paiement.findMany.mockResolvedValue([]);
    mockPrisma.paiement.count.mockResolvedValue(0);

    await service.getMesPaiements('org-01', { date_debut: '2026-01-01', page: 1, limit: 20 });

    const whereArg = mockPrisma.paiement.findMany.mock.calls[0][0].where;
    expect(whereArg.confirmed_at).toBeDefined();
    expect(whereArg.confirmed_at.gte).toEqual(new Date('2026-01-01'));
  });

  it('applique date_debut et date_fin ensemble', async () => {
    mockPrisma.paiement.findMany.mockResolvedValue([]);
    mockPrisma.paiement.count.mockResolvedValue(0);

    await service.getMesPaiements('org-01', { date_debut: '2026-01-01', date_fin: '2026-03-31', page: 1, limit: 20 });

    const whereArg = mockPrisma.paiement.findMany.mock.calls[0][0].where;
    expect(whereArg.confirmed_at.gte).toEqual(new Date('2026-01-01'));
    expect(whereArg.confirmed_at.lte).toEqual(new Date('2026-03-31'));
  });
});
```

- [ ] **Step 3 : Lancer les tests**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
npx jest --no-coverage --testPathPattern="espace-organisation.service" 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
git add src/modules/espace-organisation/__tests__/espace-organisation.service.test.ts && \
git commit -m "test(org): couvrir commanderVouchers + getMesPaiements (pagination, filtres date)"
```

---

## Task 4 : Service — getMonProfil + updateMonProfil

**Files:**
- Modify: `src/modules/espace-organisation/__tests__/espace-organisation.service.test.ts`

### Contexte

`getMonProfil` (lignes 321-336) :
- Lance `ORGANISATION_NOT_FOUND` si `orgRepo.findOrganisationById` retourne null
- Retourne un sous-ensemble des champs de l'organisation (id, raison_sociale, email, etc.)

`updateMonProfil` (lignes 339-356) :
- Appelle `prisma.organisation.update`
- Audite `PROFIL_ORGANISATION_MIS_A_JOUR`
- Retourne `{ message, organisation }`

**Important :** Ajouter `organisation: { update: jest.fn() }` au `mockPrisma` dans `beforeEach`.

- [ ] **Step 1 : Ajouter `organisation.update` au mockPrisma**

Dans le `beforeEach`, dans `mockPrisma`, ajouter :

```typescript
organisation: { update: jest.fn() },
```

- [ ] **Step 2 : Ajouter describe getMonProfil**

```typescript
describe('getMonProfil', () => {
  it('retourne le profil de l organisation', async () => {
    const orgComplete = {
      ...orgAvecB2B,
      email: 'contact@techcorp.ci',
      contact_referent: 'Moussa Koné',
      type: 'ENTREPRISE',
      sous_types: ['PME'],
      pays: 'CI',
      langue_preferee: 'FR',
    };
    mockRepo.findOrganisationById.mockResolvedValue(orgComplete as any);

    const result = await service.getMonProfil('org-01');

    expect(result.raison_sociale).toBe('TechCorp CI');
    expect(result.email).toBe('contact@techcorp.ci');
    expect(result.statut).toBe('ACTIF');
    // Vérifier que les champs sensibles internes ne sont pas exposés
    expect((result as any).password_hash).toBeUndefined();
  });

  it('lance ORGANISATION_NOT_FOUND si l organisation est introuvable', async () => {
    mockRepo.findOrganisationById.mockResolvedValue(null);

    await expect(service.getMonProfil('org-inconnue')).rejects.toThrow('ORGANISATION_NOT_FOUND');
  });
});
```

- [ ] **Step 3 : Ajouter describe updateMonProfil**

```typescript
describe('updateMonProfil', () => {
  it('met a jour et journalise PROFIL_ORGANISATION_MIS_A_JOUR', async () => {
    const updated = { id: 'org-01', raison_sociale: 'TechCorp Nouvelle', email: 'new@techcorp.ci' };
    mockPrisma.organisation.update.mockResolvedValue(updated);
    mockAudit.info.mockResolvedValue(undefined);

    const result = await service.updateMonProfil('org-01', {
      raison_sociale: 'TechCorp Nouvelle',
      email: 'new@techcorp.ci',
      contact_referent: 'Moussa',
      pays: 'CI',
      langue_preferee: 'FR',
    });

    expect(mockPrisma.organisation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'org-01' },
        data: expect.objectContaining({ raison_sociale: 'TechCorp Nouvelle', email: 'new@techcorp.ci' }),
      })
    );
    expect(mockAudit.info).toHaveBeenCalledWith('PROFIL_ORGANISATION_MIS_A_JOUR', expect.objectContaining({ organisation_id: 'org-01' }));
    expect(result.organisation.raison_sociale).toBe('TechCorp Nouvelle');
  });
});
```

- [ ] **Step 4 : Lancer les tests**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
npx jest --no-coverage --testPathPattern="espace-organisation.service" 2>&1 | tail -10
```

Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
git add src/modules/espace-organisation/__tests__/espace-organisation.service.test.ts && \
git commit -m "test(org): couvrir getMonProfil + updateMonProfil"
```

---

## Task 5 : Controller — routes non testées (createMembre, commanderVouchers, getSuiviInscriptions, getMesPaiements, getMonProfil, updateMonProfil)

**Files:**
- Modify: `src/modules/espace-organisation/__tests__/espace-organisation.controller.test.ts`

### Contexte

Le controller mock est déclaré dans `beforeEach` comme :
```typescript
service = {
  getDashboard: jest.fn(),
  getBeneficiaires: jest.fn(),
  importerBeneficiairesCSV: jest.fn(),
  getMesVouchers: jest.fn(),
  getRapportBailleur: jest.fn(),
  getDashboardB2B: jest.fn(),
  desactiverBeneficiaire: jest.fn(),
} as any;
```

Il faut ajouter les méthodes manquantes à ce mock.

Les helpers HTTP sont dans `src/__tests__/helpers/http.ts` :
- `createMockReq({ params?, query?, body?, user? })` → Request mock
- `createMockRes()` → Response mock avec `status`, `json`, `set` comme `jest.fn()` chainés
- `createNext()` → NextFunction mock

- [ ] **Step 1 : Étendre le mock service dans beforeEach**

Remplacer le bloc `service = { ... } as any;` par :

```typescript
service = {
  getDashboard: jest.fn(),
  getBeneficiaires: jest.fn(),
  importerBeneficiairesCSV: jest.fn(),
  getMesVouchers: jest.fn(),
  getRapportBailleur: jest.fn(),
  getDashboardB2B: jest.fn(),
  desactiverBeneficiaire: jest.fn(),
  createMembre: jest.fn(),
  commanderVouchers: jest.fn(),
  getSuiviInscriptions: jest.fn(),
  getMesPaiements: jest.fn(),
  getMonProfil: jest.fn(),
  updateMonProfil: jest.fn(),
} as any;
```

- [ ] **Step 2 : Ajouter les tests controller manquants**

Ajouter à la fin du `describe('EspaceOrganisationController')` :

```typescript
it('createMembre — 201 succes, 409 B2B_PLAFOND_ATTEINT, 409 EMAIL_DEJA_UTILISE', async () => {
  const next = createNext();

  // Succès
  const res1 = createMockRes();
  service.createMembre.mockResolvedValueOnce({ message: 'ok', apprenant: { id: 'app-01' } } as any);
  await controller.createMembre(
    createMockReq({ body: { email: 'n@org.ci', nom: 'D', prenom: 'A' }, user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
    res1, next
  );
  expect(res1.status).toHaveBeenCalledWith(201);

  // B2B_PLAFOND_ATTEINT
  const res2 = createMockRes();
  service.createMembre.mockRejectedValueOnce(new Error('B2B_PLAFOND_ATTEINT'));
  await controller.createMembre(
    createMockReq({ body: { email: 'n@org.ci' }, user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
    res2, next
  );
  expect(res2.status).toHaveBeenCalledWith(409);

  // EMAIL_DEJA_UTILISE
  const res3 = createMockRes();
  service.createMembre.mockRejectedValueOnce(new Error('EMAIL_DEJA_UTILISE'));
  await controller.createMembre(
    createMockReq({ body: { email: 'existant@org.ci' }, user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
    res3, next
  );
  expect(res3.status).toHaveBeenCalledWith(409);
});

it('commanderVouchers — 201 succes, 404 FORMATION_NOT_FOUND', async () => {
  const next = createNext();

  // Succès
  const res1 = createMockRes();
  service.commanderVouchers.mockResolvedValueOnce({ message: '3 vouchers créés', vouchers: [{}, {}, {}] } as any);
  await controller.commanderVouchers(
    createMockReq({ body: { formation_id: 'f-01', quantite: 3 }, user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
    res1, next
  );
  expect(res1.status).toHaveBeenCalledWith(201);

  // FORMATION_NOT_FOUND
  const res2 = createMockRes();
  service.commanderVouchers.mockRejectedValueOnce(new Error('FORMATION_NOT_FOUND'));
  await controller.commanderVouchers(
    createMockReq({ body: { formation_id: 'f-inconnue', quantite: 1 }, user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
    res2, next
  );
  expect(res2.status).toHaveBeenCalledWith(404);
});

it('getSuiviInscriptions — 200 succes avec pagination', async () => {
  const next = createNext();
  const res = createMockRes();
  service.getSuiviInscriptions.mockResolvedValueOnce({ dossiers: [], total: 0, page: 1, limit: 20 } as any);

  await controller.getSuiviInscriptions(
    createMockReq({ query: { page: '1', limit: '20' }, user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
    res, next
  );

  expect(service.getSuiviInscriptions).toHaveBeenCalledWith('org-01', expect.any(Object));
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 0 }));
});

it('getMesPaiements — 200 succes', async () => {
  const next = createNext();
  const res = createMockRes();
  service.getMesPaiements.mockResolvedValueOnce({ paiements: [], total: 0, page: 1, limit: 20 } as any);

  await controller.getMesPaiements(
    createMockReq({ query: {}, user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
    res, next
  );

  expect(service.getMesPaiements).toHaveBeenCalledWith('org-01', expect.any(Object));
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 0 }));
});

it('getMonProfil — 200 succes, 404 ORGANISATION_NOT_FOUND', async () => {
  const next = createNext();

  const res1 = createMockRes();
  service.getMonProfil.mockResolvedValueOnce({ id: 'org-01', raison_sociale: 'TechCorp' } as any);
  await controller.getMonProfil(
    createMockReq({ user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' } }),
    res1, next
  );
  expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ raison_sociale: 'TechCorp' }));

  const res2 = createMockRes();
  service.getMonProfil.mockRejectedValueOnce(new Error('ORGANISATION_NOT_FOUND'));
  await controller.getMonProfil(
    createMockReq({ user: { userId: 'org-inconnue', role: 'ORGANISATION', langue: 'FR' } }),
    res2, next
  );
  expect(res2.status).toHaveBeenCalledWith(404);
});

it('updateMonProfil — 200 succes', async () => {
  const next = createNext();
  const res = createMockRes();
  service.updateMonProfil.mockResolvedValueOnce({ message: 'ok', organisation: { id: 'org-01' } } as any);

  await controller.updateMonProfil(
    createMockReq({
      body: { raison_sociale: 'Nouveau nom', email: 'new@org.ci' },
      user: { userId: 'org-01', role: 'ORGANISATION', langue: 'FR' },
    }),
    res, next
  );

  expect(service.updateMonProfil).toHaveBeenCalledWith('org-01', expect.objectContaining({ raison_sociale: 'Nouveau nom' }));
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'ok' }));
});
```

- [ ] **Step 3 : Lancer tous les tests espace-organisation**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
npx jest --no-coverage --testPathPattern="espace-organisation" 2>&1 | tail -15
```

Expected: tous les tests PASS.

- [ ] **Step 4 : Commit**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
git add src/modules/espace-organisation/__tests__/espace-organisation.controller.test.ts && \
git commit -m "test(org): couvrir controller createMembre, commanderVouchers, getSuiviInscriptions, getMesPaiements, getMonProfil, updateMonProfil"
```

---

## Task 6 : Vérification coverage finale + push

**Files:** Aucun (lecture seule + git push)

- [ ] **Step 1 : Coverage complète sur le module**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
npx jest --no-coverage --testPathPattern="espace-organisation" --coverage --coverageReporters=text 2>&1 | \
grep -E "espace-organisation\.service|espace-organisation\.controller|import-csv|rapport|All files"
```

Objectifs :
- `espace-organisation.service.ts` : Statements ≥ 82%, Branches ≥ 70%, Functions ≥ 90%
- `espace-organisation.controller.ts` : Statements ≥ 80%, Functions ≥ 90%

- [ ] **Step 2 : Suite complète non-régression**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2/forges-monorepo/backend" && \
npx jest --no-coverage 2>&1 | tail -10
```

Expected: 750+ tests, 0 nouveaux échecs (1 échec pré-existant dans `ipn-fineo` est attendu).

- [ ] **Step 3 : Push**

```bash
cd "/Users/tidianecisse/PROJET_INFO/forges-kit 2" && git push origin develop
```

- [ ] **Step 4 : Rapport final**

Rapporter :
- Coverage finale par fichier (copier la ligne du tableau)
- Nombre total de tests
- Bugs trouvés (si applicable)
