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
