import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';

const ALGORITMO = 'aes-256-gcm';
const IV_BYTES = 12;

@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name);
  private key!: Buffer;

  onModuleInit(): void {
    const raw = process.env.CONFIG_ENCRYPTION_KEY;
    if (!raw) {
      throw new Error(
        'CONFIG_ENCRYPTION_KEY no está definida. Genere una con `openssl rand -hex 32`.',
      );
    }
    if (raw.length !== 64 || !/^[0-9a-fA-F]+$/.test(raw)) {
      throw new Error(
        'CONFIG_ENCRYPTION_KEY debe ser una cadena hexadecimal de 64 caracteres (32 bytes).',
      );
    }
    this.key = Buffer.from(raw, 'hex');
    this.logger.log('CryptoService inicializado con llave maestra AES-256-GCM.');
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITMO, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  decrypt(encoded: string): string {
    const parts = encoded.split(':');
    if (parts.length !== 3) {
      throw new Error('Valor cifrado corrupto: formato inválido');
    }
    const [ivB64, tagB64, ctB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const ct = Buffer.from(ctB64, 'base64');
    const decipher = createDecipheriv(ALGORITMO, this.key, iv);
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
    return plain.toString('utf8');
  }
}
