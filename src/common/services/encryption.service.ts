import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm';

  constructor(private readonly configService: ConfigService) {
    const rawKey =
      this.configService.get<string>('ENCRYPTION_KEY') ||
      this.configService.get<string>('JWT_SECRET') ||
      'voicecloud_master_infrastructure_encryption_key_32bytes!';

    // Ensure 32 bytes for aes-256
    this.key = crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encrypts a plain string. Returns format: `iv:authTag:encryptedData`
   */
  encrypt(text: string): string {
    if (!text || text.startsWith('enc::')) {
      return text; // Already encrypted or empty
    }

    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(this.ALGORITHM, this.key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');

      return `enc::${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
      this.logger.error(`Encryption failed: ${(error as Error).message}`);
      return text;
    }
  }

  /**
   * Decrypts an encrypted string in format `enc::iv:authTag:encryptedData`
   */
  decrypt(cipherText: string): string {
    if (!cipherText || !cipherText.startsWith('enc::')) {
      return cipherText; // Return plain text if not encrypted
    }

    try {
      const parts = cipherText.replace('enc::', '').split(':');
      if (parts.length !== 3) {
        return cipherText;
      }

      const [ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.ALGORITHM, this.key, iv);

      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(`Decryption failed: ${(error as Error).message}`);
      return cipherText;
    }
  }

  /**
   * Encrypts sensitive fields within a config object recursively
   */
  encryptConfig(config: Record<string, any>): Record<string, any> {
    if (!config || typeof config !== 'object') return config;
    const result: Record<string, any> = Array.isArray(config) ? [] : {};

    for (const [key, val] of Object.entries(config)) {
      if (typeof val === 'string' && this.isSensitiveKey(key)) {
        result[key] = this.encrypt(val);
      } else if (typeof val === 'object' && val !== null) {
        result[key] = this.encryptConfig(val);
      } else {
        result[key] = val;
      }
    }

    return result;
  }

  /**
   * Decrypts sensitive fields within a config object recursively
   */
  decryptConfig(config: Record<string, any>): Record<string, any> {
    if (!config || typeof config !== 'object') return config;
    const result: Record<string, any> = Array.isArray(config) ? [] : {};

    for (const [key, val] of Object.entries(config)) {
      if (typeof val === 'string' && val.startsWith('enc::')) {
        result[key] = this.decrypt(val);
      } else if (typeof val === 'object' && val !== null) {
        result[key] = this.decryptConfig(val);
      } else {
        result[key] = val;
      }
    }

    return result;
  }

  /**
   * Sanitizes sensitive string fields by masking them for API responses
   */
  sanitizeConfig(config: Record<string, any>): Record<string, any> {
    if (!config || typeof config !== 'object') return config;
    const result: Record<string, any> = Array.isArray(config) ? [] : {};

    for (const [key, val] of Object.entries(config)) {
      if (typeof val === 'string') {
        const plainVal = val.startsWith('enc::') ? this.decrypt(val) : val;
        if (this.isSensitiveKey(key)) {
          result[key] = this.maskValue(plainVal);
        } else {
          result[key] = plainVal;
        }
      } else if (typeof val === 'object' && val !== null) {
        result[key] = this.sanitizeConfig(val);
      } else {
        result[key] = val;
      }
    }

    return result;
  }

  /**
   * Masks a sensitive string
   */
  maskValue(value: string): string {
    if (!value) return '';
    if (value.length <= 8) {
      return '••••••••';
    }
    const prefix = value.substring(0, 3);
    const suffix = value.substring(value.length - 4);
    return `${prefix}••••${suffix}`;
  }

  /**
   * Checks if a config key name indicates a sensitive field
   */
  private isSensitiveKey(key: string): boolean {
    const lower = key.toLowerCase();
    return (
      lower.includes('secret') ||
      lower.includes('key') ||
      lower.includes('token') ||
      lower.includes('password') ||
      lower.includes('private') ||
      lower.includes('credential') ||
      lower.includes('auth') ||
      lower.includes('cert')
    );
  }
}
