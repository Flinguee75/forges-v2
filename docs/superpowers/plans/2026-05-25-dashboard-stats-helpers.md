# Dashboard Stats Helpers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `xofToCentimes` and `buildDateCondition` from `dashboard.repository.ts` into `src/shared/stats/stats.helpers.ts` so both functions can be unit-tested in isolation and reused without importing the full repository.

**Architecture:** Two pure, side-effect-free functions currently defined (but unexported) in `dashboard.repository.ts` at lines 80–82 and 36–52. Moving them to a shared helpers module gives them a stable seam: callers import helpers, not internals. The repository re-imports from the helpers file.

**Tech Stack:** TypeScript, Jest.

---

### Task 1: Create `stats.helpers.ts` with the two pure functions

**Files:**
- Create: `forges-monorepo/backend/src/shared/stats/stats.helpers.ts`
- Create: `forges-monorepo/backend/src/shared/stats/__tests__/stats.helpers.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// forges-monorepo/backend/src/shared/stats/__tests__/stats.helpers.test.ts
import { xofToCentimes, buildDateCondition } from '../stats.helpers';

describe('xofToCentimes', () => {
  it('converts positive XOF to centimes', () => {
    expect(xofToCentimes(1000)).toBe(100000);
  });
  it('returns 0 for null', () => {
    expect(xofToCentimes(null)).toBe(0);
  });
  it('returns 0 for undefined', () => {
    expect(xofToCentimes(undefined)).toBe(0);
  });
  it('handles fractional XOF', () => {
    expect(xofToCentimes(1.5)).toBe(150);
  });
});

describe('buildDateCondition', () => {
  it('returns null when no dates provided', () => {
    expect(buildDateCondition()).toBeNull();
  });
  it('builds gte condition from dateFrom only', () => {
    const result = buildDateCondition('2025-01-01');
    expect(result).toEqual({ created_at: { gte: new Date('2025-01-01') } });
  });
  it('builds lte condition from dateTo only', () => {
    const result = buildDateCondition(undefined, '2025-12-31');
    expect(result).toEqual({ created_at: { lte: new Date('2025-12-31') } });
  });
  it('builds gte+lte condition from both dates', () => {
    const result = buildDateCondition('2025-01-01', '2025-12-31');
    expect(result).toEqual({
      created_at: {
        gte: new Date('2025-01-01'),
        lte: new Date('2025-12-31'),
      },
    });
  });
  it('accepts Date objects directly', () => {
    const from = new Date('2025-06-01');
    const result = buildDateCondition(from);
    expect(result).toEqual({ created_at: { gte: from } });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "forges-monorepo/backend"
npx jest src/shared/stats/__tests__/stats.helpers.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the helpers file**

```typescript
// forges-monorepo/backend/src/shared/stats/stats.helpers.ts
const CENTIMES_PER_XOF = 100;

export function xofToCentimes(amountXof?: number | null): number {
  return Number(amountXof || 0) * CENTIMES_PER_XOF;
}

export function buildDateCondition(
  dateFrom?: string | Date,
  dateTo?: string | Date,
): Record<string, { gte?: Date; lte?: Date }> | null {
  if (!dateFrom && !dateTo) {
    return null;
  }

  const createdAt: Record<string, Date> = {};

  if (dateFrom) {
    createdAt.gte = new Date(dateFrom);
  }

  if (dateTo) {
    createdAt.lte = new Date(dateTo);
  }

  return { created_at: createdAt };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "forges-monorepo/backend"
npx jest src/shared/stats/__tests__/stats.helpers.test.ts --no-coverage
```

Expected: PASS — 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add forges-monorepo/backend/src/shared/stats/stats.helpers.ts forges-monorepo/backend/src/shared/stats/__tests__/stats.helpers.test.ts
git commit -m "feat: extract xofToCentimes and buildDateCondition to shared/stats/stats.helpers"
```

---

### Task 2: Migrate `dashboard.repository.ts` to import from helpers

**Files:**
- Modify: `forges-monorepo/backend/src/modules/dashboard/dashboard.repository.ts`

- [ ] **Step 1: Update the import in dashboard.repository.ts**

At the top of `forges-monorepo/backend/src/modules/dashboard/dashboard.repository.ts`, add the import and remove the local definitions.

Replace lines 1–82 (up to the end of the `xofToCentimes` function definition) — specifically:
- Remove the private `function xofToCentimes` definition (lines 80–82)
- Remove the private `function buildDateCondition` definition (lines 36–52)
- Add import at the top

The file's new top section should be:

```typescript
import { PrismaClient } from '@prisma/client';
import { xofToCentimes, buildDateCondition } from '../../shared/stats/stats.helpers';

type DashboardScope = {
  formations?: any;
  sessions?: any;
  dossiers?: any;
  paiements?: any;
};

type DashboardFilters = {
  date_from?: string | Date;
  date_to?: string | Date;
  formation_id?: string;
  session_id?: string;
  dossier_statut?: string;
  paiement_statut?: string;
  methode?: string;
};

const PAID_DOSSIER_STATUSES = ['PAYE'];
const OPEN_SESSION_STATUSES = ['OUVERTE', 'INSCRIPTIONS_OUVERTES', 'EN_COURS'];
const ACTIVE_ORGANISATION_STATUSES = ['ACTIF', 'ACTIVE'];
const NON_DEVIS_PAIEMENT_REVENUE_WHERE = {
  NOT: {
    dossier: {
      voucher_organisation: {
        is: {
          devis_id: { not: null },
        },
      },
    },
  },
};
```

The `mergeWhere`, `normalizeGroupBy`, `groupByMonth`, `mergeDossiersEtDevisParStatut` functions remain local (they're repository-specific). Only `xofToCentimes` and `buildDateCondition` move out.

- [ ] **Step 2: Run the existing dashboard tests**

```bash
cd "forges-monorepo/backend"
npx jest src/modules/dashboard --no-coverage
```

Expected: same pass/fail count as before (no regressions).

- [ ] **Step 3: Run full test suite to verify no regressions**

```bash
cd "forges-monorepo/backend"
npm test -- --no-coverage 2>&1 | tail -20
```

Expected: same pass/fail count as before the change.

- [ ] **Step 4: Commit**

```bash
git add forges-monorepo/backend/src/modules/dashboard/dashboard.repository.ts
git commit -m "refactor: dashboard.repository imports xofToCentimes and buildDateCondition from shared/stats"
```
