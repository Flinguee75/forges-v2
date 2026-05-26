# Bot DB Isolation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all direct `this.prisma.*` calls in `BotService` into `BotRepository` methods, so `BotService` has zero Prisma dependency and can be unit-tested without a database.

**Architecture:** `BotService` currently injects `PrismaClient` as its 3rd constructor argument and calls `this.prisma.apprenant.findUnique(...)`, `this.prisma.organisation.findUnique(...)`, `this.prisma.abonnementB2B.findFirst(...)`, and `this.prisma.apprenant.count(...)` directly. Moving these behind `BotRepository` methods gives each a named seam with typed return shapes. After this change, `BotService` only depends on `BotRepository`, `BotEngineService`, and `AuditLogger`.

**Tech Stack:** TypeScript, Prisma, Jest.

**Existing seam:** `BotRepository` already provides: `findSessionActive`, `findSession`, `findSessionsSansFeedback`, `findDernierRefusUpgrade`, `creerSession`, `updateSession`, `cloturerSession`, `enregistrerFeedback`, `enregistrerEnquete`, `filtrerFormations`.

---

### Task 1: Add 4 new methods to `BotRepository`

**Files:**
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/bot.repository.ts`
- Create: `forges-monorepo/backend/src/modules/bot-conseiller/__tests__/bot.repository.test.ts` (or extend existing)

First, check if a test file already exists:
```bash
ls forges-monorepo/backend/src/modules/bot-conseiller/__tests__/
```

- [ ] **Step 1: Read the existing `bot.repository.ts`**

Read `forges-monorepo/backend/src/modules/bot-conseiller/bot.repository.ts` in full before writing any code. The new methods must follow the same naming style and return shape as the existing methods.

- [ ] **Step 2: Write the failing tests for the 4 new methods**

```typescript
// forges-monorepo/backend/src/modules/bot-conseiller/__tests__/bot.repository.new-methods.test.ts
import { BotRepository } from '../bot.repository';

describe('BotRepository — new methods', () => {
  const mockPrisma = {
    apprenant: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    organisation: {
      findUnique: jest.fn(),
    },
    abonnementB2B: {
      findFirst: jest.fn(),
    },
  } as any;

  const repo = new BotRepository(mockPrisma);

  beforeEach(() => jest.clearAllMocks());

  describe('getProfilApprenant', () => {
    it('returns apprenant profil fields', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue({
        type_apprenant: 'PROFESSIONNEL',
        secteur_activite: 'IT',
        langue_preferee: 'FR',
        abonnement_retail: null,
      });

      const result = await repo.getProfilApprenant('a1');

      expect(mockPrisma.apprenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'a1' },
        select: expect.objectContaining({ type_apprenant: true }),
      });
      expect(result?.type_apprenant).toBe('PROFESSIONNEL');
    });

    it('returns null when apprenant not found', async () => {
      mockPrisma.apprenant.findUnique.mockResolvedValue(null);
      const result = await repo.getProfilApprenant('unknown');
      expect(result).toBeNull();
    });
  });

  describe('getProfilOrganisation', () => {
    it('returns organisation langue_preferee', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue({ langue_preferee: 'EN' });
      const result = await repo.getProfilOrganisation('o1');
      expect(result?.langue_preferee).toBe('EN');
    });
  });

  describe('getAbonnementB2B', () => {
    it('returns first active B2B subscription for organisation', async () => {
      mockPrisma.abonnementB2B.findFirst.mockResolvedValue({ palier: 'STARTER', statut: 'ACTIF' });
      const result = await repo.getAbonnementB2B('o1');
      expect(result?.palier).toBe('STARTER');
    });

    it('returns null when no active B2B', async () => {
      mockPrisma.abonnementB2B.findFirst.mockResolvedValue(null);
      const result = await repo.getAbonnementB2B('o1');
      expect(result).toBeNull();
    });
  });

  describe('countApprenantsActifsOrganisation', () => {
    it('counts active apprenants for organisation', async () => {
      mockPrisma.apprenant.count.mockResolvedValue(42);
      const result = await repo.countApprenantsActifsOrganisation('o1');
      expect(mockPrisma.apprenant.count).toHaveBeenCalledWith({
        where: { organisation_id: 'o1', statut: 'ACTIF' },
      });
      expect(result).toBe(42);
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd "forges-monorepo/backend"
npx jest src/modules/bot-conseiller/__tests__/bot.repository.new-methods.test.ts --no-coverage
```

Expected: FAIL — methods don't exist yet.

- [ ] **Step 4: Add the 4 methods to `bot.repository.ts`**

After reading `bot.repository.ts` in Step 1, add these 4 methods to the `BotRepository` class:

```typescript
async getProfilApprenant(apprenant_id: string) {
  return this.prisma.apprenant.findUnique({
    where: { id: apprenant_id },
    select: {
      type_apprenant: true,
      secteur_activite: true,
      langue_preferee: true,
      abonnement_retail: { select: { offre: true, statut: true } },
    },
  });
}

async getProfilOrganisation(organisation_id: string) {
  return this.prisma.organisation.findUnique({
    where: { id: organisation_id },
    select: { langue_preferee: true },
  });
}

async getAbonnementB2B(organisation_id: string) {
  return this.prisma.abonnementB2B.findFirst({
    where: { organisation_id },
    select: { palier: true, statut: true },
  });
}

async countApprenantsActifsOrganisation(organisation_id: string): Promise<number> {
  return this.prisma.apprenant.count({
    where: { organisation_id, statut: 'ACTIF' },
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd "forges-monorepo/backend"
npx jest src/modules/bot-conseiller/__tests__/bot.repository.new-methods.test.ts --no-coverage
```

Expected: PASS — 6 tests green.

- [ ] **Step 6: Commit**

```bash
git add forges-monorepo/backend/src/modules/bot-conseiller/bot.repository.ts \
        forges-monorepo/backend/src/modules/bot-conseiller/__tests__/bot.repository.new-methods.test.ts
git commit -m "feat(bot): add getProfilApprenant, getProfilOrganisation, getAbonnementB2B, countApprenantsActifsOrganisation to BotRepository"
```

---

### Task 2: Remove `PrismaClient` dependency from `BotService`

**Files:**
- Modify: `forges-monorepo/backend/src/modules/bot-conseiller/bot.service.ts`
- Create: `forges-monorepo/backend/src/modules/bot-conseiller/__tests__/bot.service.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// forges-monorepo/backend/src/modules/bot-conseiller/__tests__/bot.service.test.ts
import { BotService } from '../bot.service';
import { BotEngineService } from '../bot-engine.service';

describe('BotService — demarrerSessionApprenant', () => {
  const mockRepo = {
    findSessionActive: jest.fn().mockResolvedValue(null),
    findSessionsSansFeedback: jest.fn().mockResolvedValue([]),
    findDernierRefusUpgrade: jest.fn().mockResolvedValue(null),
    creerSession: jest.fn().mockResolvedValue({ id: 'sess1' }),
    updateSession: jest.fn(),
    getProfilApprenant: jest.fn().mockResolvedValue({
      type_apprenant: 'PROFESSIONNEL',
      secteur_activite: 'IT',
      langue_preferee: 'FR',
      abonnement_retail: null,
    }),
    getProfilOrganisation: jest.fn(),
    getAbonnementB2B: jest.fn(),
    countApprenantsActifsOrganisation: jest.fn(),
  } as any;

  const mockEngine = new BotEngineService(mockRepo, {} as any);
  const mockAudit = { info: jest.fn().mockResolvedValue(undefined) } as any;

  it('creates a session without PrismaClient in constructor', async () => {
    const service = new BotService(mockRepo, mockEngine, mockAudit);
    const result = await service.demarrerSessionApprenant('a1', 'FR');

    expect(mockRepo.getProfilApprenant).toHaveBeenCalledWith('a1');
    expect(mockRepo.creerSession).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty('session_id');
  });

  it('returns PROFIL_INCOMPLET when secteur_activite missing for PROFESSIONNEL', async () => {
    mockRepo.getProfilApprenant.mockResolvedValueOnce({
      type_apprenant: 'PROFESSIONNEL',
      secteur_activite: null,
      langue_preferee: 'FR',
      abonnement_retail: null,
    });

    const service = new BotService(mockRepo, mockEngine, mockAudit);
    const result = await service.demarrerSessionApprenant('a1', 'FR');

    expect(result.flux).toBe('PROFIL_INCOMPLET');
    expect(mockRepo.creerSession).not.toHaveBeenCalled();
  });
});

describe('BotService — demarrerSessionOrganisation', () => {
  const mockRepo = {
    findSessionsSansFeedback: jest.fn().mockResolvedValue([]),
    findDernierRefusUpgrade: jest.fn().mockResolvedValue(null),
    creerSession: jest.fn().mockResolvedValue({ id: 'sess2' }),
    getProfilApprenant: jest.fn(),
    getProfilOrganisation: jest.fn().mockResolvedValue({ langue_preferee: 'FR' }),
    getAbonnementB2B: jest.fn().mockResolvedValue(null),
    countApprenantsActifsOrganisation: jest.fn().mockResolvedValue(5),
  } as any;

  const mockEngine = new BotEngineService(mockRepo, {} as any);
  const mockAudit = { info: jest.fn().mockResolvedValue(undefined) } as any;

  it('creates a session for organisation with IDLE flux when no triggers', async () => {
    const service = new BotService(mockRepo, mockEngine, mockAudit);
    const result = await service.demarrerSessionOrganisation('o1', 'FR');

    expect(mockRepo.getProfilOrganisation).toHaveBeenCalledWith('o1');
    expect(mockRepo.getAbonnementB2B).toHaveBeenCalledWith('o1');
    expect(mockRepo.countApprenantsActifsOrganisation).toHaveBeenCalledWith('o1');
    expect(result.flux).toBe('IDLE');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "forges-monorepo/backend"
npx jest src/modules/bot-conseiller/__tests__/bot.service.test.ts --no-coverage
```

Expected: FAIL — `BotService` constructor still requires `PrismaClient` as 3rd arg.

- [ ] **Step 3: Update `BotService` constructor and methods**

In `forges-monorepo/backend/src/modules/bot-conseiller/bot.service.ts`:

1. Remove `import { PrismaClient } from '@prisma/client';`

2. Change the constructor from:
```typescript
constructor(
  private readonly botRepo: BotRepository,
  private readonly engine: BotEngineService,
  private readonly prisma: PrismaClient,
  private readonly audit: AuditLogger
) {}
```
To:
```typescript
constructor(
  private readonly botRepo: BotRepository,
  private readonly engine: BotEngineService,
  private readonly audit: AuditLogger
) {}
```

3. In `demarrerSessionApprenant`, replace:
```typescript
const apprenant = await this.prisma.apprenant.findUnique({
  where: { id: apprenant_id },
  select: {
    type_apprenant: true, secteur_activite: true,
    langue_preferee: true,
    abonnement_retail: { select: { offre: true, statut: true } }
  }
});
```
With:
```typescript
const apprenant = await this.botRepo.getProfilApprenant(apprenant_id);
```

4. In `demarrerSessionOrganisation`, replace:
```typescript
const organisation = await this.prisma.organisation.findUnique({
  where: { id: organisation_id },
  select: { langue_preferee: true }
});

const aboB2B = await this.prisma.abonnementB2B.findFirst({
  where: { organisation_id },
  select: { palier: true, statut: true }
});

const nbApprenants = await this.prisma.apprenant.count({
  where: { organisation_id, statut: 'ACTIF' }
});
```
With:
```typescript
const organisation = await this.botRepo.getProfilOrganisation(organisation_id);
const aboB2B = await this.botRepo.getAbonnementB2B(organisation_id);
const nbApprenants = await this.botRepo.countApprenantsActifsOrganisation(organisation_id);
```

- [ ] **Step 4: Update all call sites of `new BotService(...)` to remove the `prisma` argument**

Search for all instantiations of `BotService`:

```bash
grep -rn "new BotService(" forges-monorepo/backend/src --include="*.ts"
```

For each occurrence, remove the `prisma` argument (3rd positional arg). Example:

```typescript
// Before
new BotService(botRepo, botEngine, prisma, audit)

// After
new BotService(botRepo, botEngine, audit)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd "forges-monorepo/backend"
npx jest src/modules/bot-conseiller/__tests__/bot.service.test.ts --no-coverage
```

Expected: PASS — 3 tests green.

- [ ] **Step 6: Run full test suite**

```bash
cd "forges-monorepo/backend"
npm test -- --no-coverage 2>&1 | tail -20
```

Expected: same or better pass/fail count.

- [ ] **Step 7: Commit**

```bash
git add forges-monorepo/backend/src/modules/bot-conseiller/bot.service.ts \
        forges-monorepo/backend/src/modules/bot-conseiller/__tests__/bot.service.test.ts
git commit -m "refactor(bot): remove PrismaClient from BotService, route DB calls through BotRepository"
```
