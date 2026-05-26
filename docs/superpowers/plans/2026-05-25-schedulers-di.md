# Schedulers Dependency Injection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the no-arg constructors in all 7 schedulers with constructor injection so each scheduler's logic can be tested with mocked dependencies without starting a cron job or importing the global Prisma singleton.

**Architecture:** Each scheduler currently calls `this.prisma = prisma` (global), `this.email = new EmailService()`, `this.audit = new AuditLogger()` in its constructor. After this change, the scheduler receives those deps as constructor args. `app.ts` passes the real instances at startup. Tests pass mocks. No SchedulerRegistry is needed — the existing `schedulers` export in `app.ts` is sufficient.

**Tech Stack:** Node.js 20, TypeScript, Jest, node-cron, PrismaClient.

---

### Task 1: Inject deps into `DossierExpirationScheduler`

**Files:**
- Modify: `forges-monorepo/backend/src/schedulers/dossier-expiration.scheduler.ts`
- Create: `forges-monorepo/backend/src/schedulers/__tests__/dossier-expiration.scheduler.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// forges-monorepo/backend/src/schedulers/__tests__/dossier-expiration.scheduler.test.ts
import { DossierExpirationScheduler } from '../dossier-expiration.scheduler';

describe('DossierExpirationScheduler — verifierDossiersExpires', () => {
  const mockPrisma = {
    dossier: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    session: { update: jest.fn().mockResolvedValue({}) },
  } as any;

  const mockEmail = { sendDossierAnnule: jest.fn().mockResolvedValue(undefined) } as any;
  const mockAudit = {
    info: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  } as any;

  it('does nothing when no expired dossiers', async () => {
    const scheduler = new DossierExpirationScheduler(mockPrisma, mockEmail, mockAudit);
    await scheduler.executeNow();
    expect(mockPrisma.dossier.update).not.toHaveBeenCalled();
  });

  it('cancels an expired dossier and sends email', async () => {
    const dossier = {
      id: 'd1',
      apprenant_id: 'a1',
      session_id: 's1',
      expires_at: new Date(Date.now() - 1000),
      apprenant: { email: 'test@test.com', prenoms: 'Aly', nom: 'Samassi', langue_preferee: 'FR' },
      session: {
        date_debut: new Date(),
        date_fin: new Date(),
        formation: { intitule: 'Cybersécurité' },
      },
    };
    mockPrisma.dossier.findMany.mockResolvedValueOnce([dossier]);

    const scheduler = new DossierExpirationScheduler(mockPrisma, mockEmail, mockAudit);
    await scheduler.executeNow();

    expect(mockPrisma.dossier.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'd1' }, data: expect.objectContaining({ statut: 'ANNULE' }) })
    );
    expect(mockEmail.sendDossierAnnule).toHaveBeenCalledTimes(1);
    expect(mockAudit.info).toHaveBeenCalledWith('DOSSIER_ANNULE_EXPIRATION', expect.any(Object));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "forges-monorepo/backend"
npx jest src/schedulers/__tests__/dossier-expiration.scheduler.test.ts --no-coverage
```

Expected: FAIL — constructor does not accept arguments.

- [ ] **Step 3: Update the constructor**

In `forges-monorepo/backend/src/schedulers/dossier-expiration.scheduler.ts`, replace:

```typescript
export class DossierExpirationScheduler {
  private prisma: PrismaClient;
  private email: EmailService;
  private audit: AuditLogger;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.prisma = prisma;
    this.email = new EmailService();
    this.audit = new AuditLogger();
  }
```

With:

```typescript
export class DossierExpirationScheduler {
  private task: cron.ScheduledTask | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly email: EmailService,
    private readonly audit: AuditLogger,
  ) {}
```

Also remove the unused top-level import `import { prisma } from '../shared/prisma/prisma.client';` since the scheduler no longer imports the global singleton.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "forges-monorepo/backend"
npx jest src/schedulers/__tests__/dossier-expiration.scheduler.test.ts --no-coverage
```

Expected: PASS — 2 tests green.

- [ ] **Step 5: Update `app.ts` to pass deps**

In `forges-monorepo/backend/src/app.ts`, the existing import block at the top already has:

```typescript
import { prisma } from './shared/prisma/prisma.client';
import { EmailService } from './shared/email/email.service';
import { AuditLogger } from './shared/audit/audit.logger';
```

If those imports don't exist yet, add them. Then change:

```typescript
const dossierExpirationScheduler = new DossierExpirationScheduler();
```

To:

```typescript
const _email = new EmailService();
const _audit = new AuditLogger();
const dossierExpirationScheduler = new DossierExpirationScheduler(prisma, _email, _audit);
```

We'll reuse `_email` and `_audit` for all schedulers in subsequent tasks to avoid creating multiple instances. For now, just fix this one scheduler and leave others as-is temporarily.

- [ ] **Step 6: Commit**

```bash
git add forges-monorepo/backend/src/schedulers/dossier-expiration.scheduler.ts \
        forges-monorepo/backend/src/schedulers/__tests__/dossier-expiration.scheduler.test.ts \
        forges-monorepo/backend/src/app.ts
git commit -m "refactor(scheduler): inject deps into DossierExpirationScheduler"
```

---

### Task 2: Inject deps into `AlerteValidationScheduler`

**Files:**
- Modify: `forges-monorepo/backend/src/schedulers/alerte-validation.scheduler.ts`
- Create: `forges-monorepo/backend/src/schedulers/__tests__/alerte-validation.scheduler.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// forges-monorepo/backend/src/schedulers/__tests__/alerte-validation.scheduler.test.ts
import { AlerteValidationScheduler } from '../alerte-validation.scheduler';

describe('AlerteValidationScheduler — verifierFormationsEnAttente', () => {
  const mockPrisma = {
    formationPartenaire: { findMany: jest.fn().mockResolvedValue([]) },
    apprenant: { findUnique: jest.fn() },
  } as any;

  const mockEmail = {
    sendAlerteValidationJ5: jest.fn().mockResolvedValue(undefined),
    sendAlerteValidationJ10: jest.fn().mockResolvedValue(undefined),
  } as any;

  const mockAudit = {
    info: jest.fn().mockResolvedValue(undefined),
    warning: jest.fn().mockResolvedValue(undefined),
    error: jest.fn().mockResolvedValue(undefined),
  } as any;

  it('does nothing when no formations en attente', async () => {
    const scheduler = new AlerteValidationScheduler(mockPrisma, mockEmail, mockAudit);
    await scheduler.executeNow();
    expect(mockEmail.sendAlerteValidationJ5).not.toHaveBeenCalled();
    expect(mockEmail.sendAlerteValidationJ10).not.toHaveBeenCalled();
  });

  it('sends J5 alerte when formation is 5 days old', async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 3600 * 1000);
    mockPrisma.formationPartenaire.findMany.mockResolvedValueOnce([{
      id: 'fp1',
      partenaire_id: 'p1',
      responsable_validateur_id: 'r1',
      date_soumission: fiveDaysAgo,
      partenaire: { raison_sociale: 'Acme' },
      formation: { intitule: 'Cyber 101' },
    }]);
    mockPrisma.apprenant.findUnique.mockResolvedValueOnce({ email: 'resp@test.com' });

    const scheduler = new AlerteValidationScheduler(mockPrisma, mockEmail, mockAudit);
    await scheduler.executeNow();

    expect(mockEmail.sendAlerteValidationJ5).toHaveBeenCalledTimes(1);
    expect(mockAudit.warning).toHaveBeenCalledWith('VALIDATION_DELAI_DEPASSE_J5', expect.any(Object));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd "forges-monorepo/backend"
npx jest src/schedulers/__tests__/alerte-validation.scheduler.test.ts --no-coverage
```

Expected: FAIL — constructor does not accept arguments.

- [ ] **Step 3: Update the constructor**

In `forges-monorepo/backend/src/schedulers/alerte-validation.scheduler.ts`, replace:

```typescript
export class AlerteValidationScheduler {
  private prisma: PrismaClient;
  private email: EmailService;
  private audit: AuditLogger;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.prisma = prisma;
    this.email = new EmailService();
    this.audit = new AuditLogger();
  }
```

With:

```typescript
export class AlerteValidationScheduler {
  private task: cron.ScheduledTask | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly email: EmailService,
    private readonly audit: AuditLogger,
  ) {}
```

Remove the unused `import { prisma } from '../shared/prisma/prisma.client';` import.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd "forges-monorepo/backend"
npx jest src/schedulers/__tests__/alerte-validation.scheduler.test.ts --no-coverage
```

Expected: PASS — 2 tests green.

- [ ] **Step 5: Update `app.ts`**

Change:
```typescript
const alerteValidationScheduler = new AlerteValidationScheduler();
```

To (reusing the `_email` and `_audit` created in Task 1):
```typescript
const alerteValidationScheduler = new AlerteValidationScheduler(prisma, _email, _audit);
```

- [ ] **Step 6: Commit**

```bash
git add forges-monorepo/backend/src/schedulers/alerte-validation.scheduler.ts \
        forges-monorepo/backend/src/schedulers/__tests__/alerte-validation.scheduler.test.ts \
        forges-monorepo/backend/src/app.ts
git commit -m "refactor(scheduler): inject deps into AlerteValidationScheduler"
```

---

### Task 3: Inject deps into remaining 5 schedulers

**Files:**
- Modify: `forges-monorepo/backend/src/schedulers/alerte-b2b.scheduler.ts`
- Modify: `forges-monorepo/backend/src/schedulers/session-transition.scheduler.ts`
- Modify: `forges-monorepo/backend/src/schedulers/commission-agregateur.scheduler.ts`
- Modify: `forges-monorepo/backend/src/schedulers/reversement-abonnement.scheduler.ts`
- Modify: `forges-monorepo/backend/src/schedulers/reconciliation-ngser.scheduler.ts`
- Modify: `forges-monorepo/backend/src/app.ts`

Note: `reconciliation-ngser.scheduler.ts` also instantiates `IpnNgserService` and `NgserClient` — inject those too.

- [ ] **Step 1: Write failing tests for all 5 schedulers**

```typescript
// forges-monorepo/backend/src/schedulers/__tests__/alerte-b2b.scheduler.test.ts
import { AlerteB2BScheduler } from '../alerte-b2b.scheduler';

describe('AlerteB2BScheduler', () => {
  const mockPrisma = { abonnementB2B: { findMany: jest.fn().mockResolvedValue([]) } } as any;
  const mockEmail = { sendAlerteExpirationB2B: jest.fn().mockResolvedValue(undefined) } as any;
  const mockAudit = { info: jest.fn(), warning: jest.fn(), error: jest.fn() } as any;

  it('accepts injected deps and does nothing on empty result', async () => {
    const scheduler = new AlerteB2BScheduler(mockPrisma, mockEmail, mockAudit);
    await scheduler.executeNow();
    expect(mockEmail.sendAlerteExpirationB2B).not.toHaveBeenCalled();
  });
});
```

```typescript
// forges-monorepo/backend/src/schedulers/__tests__/session-transition.scheduler.test.ts
import { SessionTransitionScheduler } from '../session-transition.scheduler';

describe('SessionTransitionScheduler', () => {
  const mockPrisma = { session: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 0 }) } } as any;
  const mockAudit = { info: jest.fn(), error: jest.fn() } as any;

  it('accepts injected deps and runs without error on empty result', async () => {
    const scheduler = new SessionTransitionScheduler(mockPrisma, mockAudit);
    await scheduler.executeNow();
    expect(mockAudit.error).not.toHaveBeenCalled();
  });
});
```

```typescript
// forges-monorepo/backend/src/schedulers/__tests__/commission-agregateur.scheduler.test.ts
import { CommissionAgregateurScheduler } from '../commission-agregateur.scheduler';

describe('CommissionAgregateurScheduler', () => {
  const mockPrisma = {
    commissionApporteur: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
  } as any;
  const mockAudit = { info: jest.fn(), error: jest.fn() } as any;

  it('accepts injected deps and runs without error on empty result', async () => {
    const scheduler = new CommissionAgregateurScheduler(mockPrisma, mockAudit);
    await scheduler.executeNow();
    expect(mockAudit.error).not.toHaveBeenCalled();
  });
});
```

```typescript
// forges-monorepo/backend/src/schedulers/__tests__/reversement-abonnement.scheduler.test.ts
import { ReversementAbonnementScheduler } from '../reversement-abonnement.scheduler';

describe('ReversementAbonnementScheduler', () => {
  const mockPrisma = {
    formationPartenaire: { findMany: jest.fn().mockResolvedValue([]) },
  } as any;
  const mockAudit = { info: jest.fn(), error: jest.fn() } as any;

  it('accepts injected deps and does nothing on empty result', async () => {
    const scheduler = new ReversementAbonnementScheduler(mockPrisma, mockAudit);
    await scheduler.executeNow();
    expect(mockAudit.error).not.toHaveBeenCalled();
  });
});
```

```typescript
// forges-monorepo/backend/src/schedulers/__tests__/reconciliation-ngser.scheduler.test.ts
import { ReconciliationNgserScheduler } from '../reconciliation-ngser.scheduler';

describe('ReconciliationNgserScheduler', () => {
  const mockPrisma = {
    paiement: { findMany: jest.fn().mockResolvedValue([]) },
  } as any;
  const mockAudit = { info: jest.fn(), error: jest.fn() } as any;
  const mockIpnService = { traiterIPN: jest.fn() } as any;

  it('accepts injected deps and does nothing on empty result', async () => {
    const scheduler = new ReconciliationNgserScheduler(mockPrisma, mockAudit, mockIpnService);
    await scheduler.executeNow();
    expect(mockIpnService.traiterIPN).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they all fail**

```bash
cd "forges-monorepo/backend"
npx jest src/schedulers/__tests__/alerte-b2b.scheduler.test.ts \
         src/schedulers/__tests__/session-transition.scheduler.test.ts \
         src/schedulers/__tests__/commission-agregateur.scheduler.test.ts \
         src/schedulers/__tests__/reversement-abonnement.scheduler.test.ts \
         src/schedulers/__tests__/reconciliation-ngser.scheduler.test.ts \
         --no-coverage
```

Expected: all FAIL — constructors don't accept arguments.

- [ ] **Step 3: Update `alerte-b2b.scheduler.ts`**

Replace:
```typescript
export class AlerteB2BScheduler {
  private prisma: PrismaClient;
  private email: EmailService;
  private audit: AuditLogger;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.prisma = prisma;
    this.email = new EmailService();
    this.audit = new AuditLogger();
  }
```

With:
```typescript
export class AlerteB2BScheduler {
  private task: cron.ScheduledTask | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly email: EmailService,
    private readonly audit: AuditLogger,
  ) {}
```

Remove `import { prisma } from '../shared/prisma/prisma.client';`.

- [ ] **Step 4: Update `session-transition.scheduler.ts`**

Replace:
```typescript
export class SessionTransitionScheduler {
  private prisma: PrismaClient;
  private audit: AuditLogger;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.prisma = prisma;
    this.audit = new AuditLogger();
  }
```

With:
```typescript
export class SessionTransitionScheduler {
  private task: cron.ScheduledTask | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
  ) {}
```

Remove `import { prisma } from '../shared/prisma/prisma.client';`.

- [ ] **Step 5: Update `commission-agregateur.scheduler.ts`**

Replace:
```typescript
export class CommissionAgregateurScheduler {
  private prisma: PrismaClient;
  private audit: AuditLogger;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.prisma = prisma;
    this.audit = new AuditLogger();
  }
```

With:
```typescript
export class CommissionAgregateurScheduler {
  private task: cron.ScheduledTask | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
  ) {}
```

Remove `import { prisma } from '../shared/prisma/prisma.client';`.

- [ ] **Step 6: Update `reversement-abonnement.scheduler.ts`**

Replace:
```typescript
export class ReversementAbonnementScheduler {
  private prisma: PrismaClient;
  private audit: AuditLogger;
  private task: cron.ScheduledTask | null = null;

  constructor() {
    this.prisma = prisma;
    this.audit = new AuditLogger();
  }
```

With:
```typescript
export class ReversementAbonnementScheduler {
  private task: cron.ScheduledTask | null = null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
  ) {}
```

Remove `import { prisma } from '../shared/prisma/prisma.client';`.

- [ ] **Step 7: Update `reconciliation-ngser.scheduler.ts`**

The ReconciliationNgserScheduler also creates `IpnNgserService` and `NgserClient` internally. Read the full constructor section first to see what it instantiates, then apply the same pattern: remove all `new X()` calls from the constructor and accept them as injected parameters.

Replace the constructor so it accepts `(prisma: PrismaClient, audit: AuditLogger, ipnService: IpnNgserService)`. The `NgserClient` is used only by `IpnNgserService`, so no need to inject it separately.

Remove `import { prisma } from '../shared/prisma/prisma.client';`.

- [ ] **Step 8: Run all 5 tests to verify they pass**

```bash
cd "forges-monorepo/backend"
npx jest src/schedulers/__tests__/alerte-b2b.scheduler.test.ts \
         src/schedulers/__tests__/session-transition.scheduler.test.ts \
         src/schedulers/__tests__/commission-agregateur.scheduler.test.ts \
         src/schedulers/__tests__/reversement-abonnement.scheduler.test.ts \
         src/schedulers/__tests__/reconciliation-ngser.scheduler.test.ts \
         --no-coverage
```

Expected: all PASS.

- [ ] **Step 9: Update `app.ts` for remaining 5 schedulers**

```typescript
// In app.ts, replace the 5 remaining no-arg constructors (reusing _email, _audit, prisma from Task 1):
const sessionTransitionScheduler = new SessionTransitionScheduler(prisma, _audit);
const commissionAgregateurScheduler = new CommissionAgregateurScheduler(prisma, _audit);
const alerteB2BScheduler = new AlerteB2BScheduler(prisma, _email, _audit);
const reversementAbonnementScheduler = new ReversementAbonnementScheduler(prisma, _audit);

// For reconciliation, also instantiate IpnNgserService and NgserClient:
import { IpnNgserService } from './modules/paiements/ipn-ngser.service';
import { NgserClient } from './modules/paiements/ngser.client';
const _ngserClient = new NgserClient();
const _ipnNgserService = new IpnNgserService(prisma, _ngserClient, _audit);
const reconciliationNgserScheduler = new ReconciliationNgserScheduler(prisma, _audit, _ipnNgserService);
```

Note: Check the actual constructors of `IpnNgserService` and `NgserClient` before writing the above — adjust signatures as needed.

- [ ] **Step 10: Run full test suite**

```bash
cd "forges-monorepo/backend"
npm test -- --no-coverage 2>&1 | tail -20
```

Expected: same or better pass/fail count as before.

- [ ] **Step 11: Commit**

```bash
git add forges-monorepo/backend/src/schedulers/ forges-monorepo/backend/src/app.ts
git commit -m "refactor(scheduler): inject deps into remaining 5 schedulers"
```
