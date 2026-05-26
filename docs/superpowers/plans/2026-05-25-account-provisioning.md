# Account Provisioning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the duplicated `SALT_ROUNDS=12 / TOKEN_EXPIRATION_HOURS=24 / bcrypt.hash / uuid token generation` logic shared by `ApprenantService` and `OrganisationService` into a single `AccountProvisioning` helper module.

**Architecture:** Both services independently define `SALT_ROUNDS = 12` and `TOKEN_EXPIRATION_HOURS = 24`, then call `hash(password, SALT_ROUNDS)` and `uuidv4()/randomUUID()`. A shared `AccountProvisioning` module exposes two pure operations: `hashPassword(password)` and `generateVerificationToken()`. The services import these instead of duplicating the constants and calls. No constructor injection needed — these are stateless pure functions.

**Tech Stack:** TypeScript, bcrypt, Node.js `crypto`, Jest.

---

### Task 1: Create `AccountProvisioning` helpers

**Files:**
- Create: `forges-monorepo/backend/src/shared/account/account-provisioning.ts`
- Create: `forges-monorepo/backend/src/shared/account/__tests__/account-provisioning.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// forges-monorepo/backend/src/shared/account/__tests__/account-provisioning.test.ts
import { hashPassword, generateVerificationToken } from '../account-provisioning';
import { compare } from 'bcrypt';

describe('hashPassword', () => {
  it('produces a bcrypt hash verifiable against the original password', async () => {
    const hash = await hashPassword('MySecret123!');
    const valid = await compare('MySecret123!', hash);
    expect(valid).toBe(true);
  });

  it('produces different hashes for the same input (salt randomness)', async () => {
    const h1 = await hashPassword('SamePassword');
    const h2 = await hashPassword('SamePassword');
    expect(h1).not.toBe(h2);
  });
});

describe('generateVerificationToken', () => {
  it('returns a UUID-format token and expiration 24 hours in the future', () => {
    const before = Date.now();
    const { token, expiration } = generateVerificationToken();
    const after = Date.now();

    // UUID v4 format
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    const expectedExpMs = 24 * 3600 * 1000;
    expect(expiration.getTime() - before).toBeGreaterThanOrEqual(expectedExpMs);
    expect(expiration.getTime() - after).toBeLessThan(expectedExpMs + 1000); // within 1s
  });

  it('produces a different token each call', () => {
    const { token: t1 } = generateVerificationToken();
    const { token: t2 } = generateVerificationToken();
    expect(t1).not.toBe(t2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "forges-monorepo/backend"
npx jest src/shared/account/__tests__/account-provisioning.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the helpers file**

```typescript
// forges-monorepo/backend/src/shared/account/account-provisioning.ts
import { hash } from 'bcrypt';
import { randomUUID } from 'crypto';

const SALT_ROUNDS = 12; // MT-02
const TOKEN_EXPIRATION_HOURS = 24; // RM-30

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export function generateVerificationToken(): { token: string; expiration: Date } {
  return {
    token: randomUUID(),
    expiration: new Date(Date.now() + TOKEN_EXPIRATION_HOURS * 3600 * 1000),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "forges-monorepo/backend"
npx jest src/shared/account/__tests__/account-provisioning.test.ts --no-coverage
```

Expected: PASS — 4 tests green. Note: `hashPassword` tests will be slightly slow (bcrypt cost=12) but under 5s each.

- [ ] **Step 5: Commit**

```bash
git add forges-monorepo/backend/src/shared/account/account-provisioning.ts \
        forges-monorepo/backend/src/shared/account/__tests__/account-provisioning.test.ts
git commit -m "feat: add shared AccountProvisioning helpers (hashPassword, generateVerificationToken)"
```

---

### Task 2: Migrate `ApprenantService` to use `AccountProvisioning`

**Files:**
- Modify: `forges-monorepo/backend/src/modules/comptes/apprenant/apprenant.service.ts`

- [ ] **Step 1: Update the imports and `register` method**

In `forges-monorepo/backend/src/modules/comptes/apprenant/apprenant.service.ts`:

1. Add import at the top:
```typescript
import { hashPassword, generateVerificationToken } from '../../../shared/account/account-provisioning';
```

2. Remove these two lines:
```typescript
const SALT_ROUNDS = 12; // MT-02
const TOKEN_EXPIRATION_HOURS = 24; // RM-30
```

3. Remove `import { hash } from 'bcrypt';` and `import { v4 as uuidv4 } from 'uuid';` since they're no longer needed directly.

4. In the `register` method, replace:
```typescript
const password_hash = await hash(dto.password, SALT_ROUNDS);
const token_confirmation = uuidv4();
const token_expiration = new Date(Date.now() + TOKEN_EXPIRATION_HOURS * 3600 * 1000);
```

With:
```typescript
const password_hash = await hashPassword(dto.password);
const { token: token_confirmation, expiration: token_expiration } = generateVerificationToken();
```

5. In the `resendConfirmation` method, replace:
```typescript
const token = uuidv4();
const expiration = new Date(Date.now() + TOKEN_EXPIRATION_HOURS * 3600 * 1000);
```

With:
```typescript
const { token, expiration } = generateVerificationToken();
```

- [ ] **Step 2: Run `apprenant.service` tests**

```bash
cd "forges-monorepo/backend"
npx jest src/modules/comptes/apprenant --no-coverage
```

Expected: same pass/fail count as before.

- [ ] **Step 3: Run full test suite**

```bash
cd "forges-monorepo/backend"
npm test -- --no-coverage 2>&1 | tail -20
```

Expected: same pass/fail count as before.

- [ ] **Step 4: Commit**

```bash
git add forges-monorepo/backend/src/modules/comptes/apprenant/apprenant.service.ts
git commit -m "refactor(apprenant): use shared AccountProvisioning helpers"
```

---

### Task 3: Migrate `OrganisationService` to use `AccountProvisioning`

**Files:**
- Modify: `forges-monorepo/backend/src/modules/comptes/organisation/organisation.service.ts`

- [ ] **Step 1: Update the imports and `register` method**

In `forges-monorepo/backend/src/modules/comptes/organisation/organisation.service.ts`:

1. Add import at the top:
```typescript
import { hashPassword, generateVerificationToken } from '../../../shared/account/account-provisioning';
```

2. Remove these two lines:
```typescript
const SALT_ROUNDS = 12;
const TOKEN_EXPIRATION_HOURS = 24;
```

3. Remove `import { hash } from 'bcrypt';` and `import { randomUUID } from 'crypto';`.

4. In the `register` method, replace:
```typescript
const password_hash = await hash(dto.password, SALT_ROUNDS);
const token_confirmation = randomUUID();
const token_expiration = new Date(Date.now() + TOKEN_EXPIRATION_HOURS * 3600 * 1000);
```

With:
```typescript
const password_hash = await hashPassword(dto.password);
const { token: token_confirmation, expiration: token_expiration } = generateVerificationToken();
```

- [ ] **Step 2: Run `organisation.service` tests**

```bash
cd "forges-monorepo/backend"
npx jest src/modules/comptes/organisation --no-coverage
```

Expected: same pass/fail count as before.

- [ ] **Step 3: Run full test suite**

```bash
cd "forges-monorepo/backend"
npm test -- --no-coverage 2>&1 | tail -20
```

Expected: same pass/fail count as before.

- [ ] **Step 4: Commit**

```bash
git add forges-monorepo/backend/src/modules/comptes/organisation/organisation.service.ts
git commit -m "refactor(organisation): use shared AccountProvisioning helpers"
```
