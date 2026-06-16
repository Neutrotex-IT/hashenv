import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const NONCE_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function generateKey(): Buffer {
  return crypto.randomBytes(32);
}

export function generateNonce(): Buffer {
  return crypto.randomBytes(NONCE_LENGTH);
}

export interface EncryptResult {
  ciphertext: Buffer;
  nonce: Buffer;
  authTag: Buffer;
}

export function encrypt(plaintext: Buffer, key: Buffer): EncryptResult {
  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes (256 bits)');
  }
  
  const nonce = generateNonce();
  const cipher = crypto.createCipheriv(ALGORITHM, key, nonce, { authTagLength: AUTH_TAG_LENGTH });
  
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return { ciphertext, nonce, authTag };
}

export function decrypt(ciphertext: Buffer, key: Buffer, nonce: Buffer, authTag: Buffer): Buffer {
  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes (256 bits)');
  }
  if (nonce.length !== NONCE_LENGTH) {
    throw new Error(`Nonce must be ${NONCE_LENGTH} bytes`);
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Auth tag must be ${AUTH_TAG_LENGTH} bytes`);
  }
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, nonce, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function wrapKey(keyToWrap: Buffer, wrappingKey: Buffer): EncryptResult {
  return encrypt(keyToWrap, wrappingKey);
}

export function unwrapKey(wrappedKey: Buffer, wrappingKey: Buffer, nonce: Buffer, authTag: Buffer): Buffer {
  return decrypt(wrappedKey, wrappingKey, nonce, authTag);
}

export function deriveKeyFromSecret(secret: string): Buffer {
  if (!secret || secret.length < 32) {
    throw new Error('ROOT_ENCRYPTION_KEY must be at least 32 characters');
  }
  return crypto.createHash('sha256').update(secret).digest();
}
