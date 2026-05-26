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
