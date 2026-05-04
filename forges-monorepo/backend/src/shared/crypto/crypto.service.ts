import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.AES_SECRET_KEY;
  if (!raw) throw new Error('AES_SECRET_KEY manquante dans les variables d\'environnement');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) throw new Error('AES_SECRET_KEY doit être une clé base64 de 32 octets (256 bits)');
  return buf;
}

export function chiffrerUrl(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format : iv(12) + tag(16) + ciphertext — encodé base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function dechiffrerUrl(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}
