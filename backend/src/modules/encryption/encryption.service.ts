import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Provides AES-256-GCM encryption for sensitive PII (specifically location
 * coordinates) before they're written to the database.
 *
 * Key management: the 32-byte key is loaded from the LOCATION_ENCRYPTION_KEY
 * environment variable (64 hex chars). In production this value should be
 * retrieved from AWS KMS / HashiCorp Vault — never hard-coded.
 *
 * Ciphertext format (base64-encoded): `iv:ciphertext:authTag`
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm';

  constructor() {
    const hexKey = process.env.LOCATION_ENCRYPTION_KEY;
    if (!hexKey || hexKey.length !== 64) {
      throw new Error('LOCATION_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
    }
    this.key = Buffer.from(hexKey, 'hex');
  }

  /**
   * Encrypt a plaintext string (e.g. "48.8566").
   * Returns `iv:ciphertext:authTag` where each part is base64-encoded.
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.key, iv) as crypto.CipherGCM;
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('base64'), ciphertext.toString('base64'), authTag.toString('base64')].join(':');
  }

  /**
   * Decrypt a `iv:ciphertext:authTag` string produced by encrypt().
   * Throws if authentication tag verification fails.
   */
  decrypt(combined: string): string {
    const parts = combined.split(':');
    if (parts.length !== 3) throw new Error('Invalid ciphertext format');
    const [ivB64, ciphertextB64, authTagB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  /** Convenience wrappers for lat/lng coordinate pair */
  encryptCoordinate(value: number): string {
    return this.encrypt(value.toString());
  }

  decryptCoordinate(combined: string): number {
    return parseFloat(this.decrypt(combined));
  }
}
