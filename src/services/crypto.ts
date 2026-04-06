/**
 * Secure encryption service using Web Crypto API
 * Implements AES-GCM encryption with PBKDF2 key derivation
 */

export interface EncryptedData {
  encryptedData: string;
  salt: string;
  iv: string;
}

export class CryptoService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly SALT_LENGTH = 16;
  private static readonly ITERATIONS = 100000;

  /**
   * Derives a cryptographic key from a password using PBKDF2
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      passwordKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts data using AES-GCM
   */
  static async encrypt(data: string, password: string): Promise<EncryptedData> {
    if (!(globalThis.crypto && (globalThis.crypto as Crypto).subtle)) {
      throw new Error('Secure Web Crypto not available. Serve over HTTPS or use a modern browser.');
    }
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    
    // Derive key from password
    const key = await this.deriveKey(password, salt);
    
    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv
      },
      key,
      dataBuffer
    );

    return {
      encryptedData: this.arrayBufferToBase64(encryptedBuffer),
      salt: this.arrayBufferToBase64(salt.buffer as ArrayBuffer),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer)
    };
  }

  /**
   * Decrypts data using AES-GCM
   */
  static async decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
    if (!(globalThis.crypto && (globalThis.crypto as Crypto).subtle)) {
      throw new Error('Secure Web Crypto not available. Serve over HTTPS or use a modern browser.');
    }
    const salt = this.base64ToArrayBuffer(encryptedData.salt);
    const iv = this.base64ToArrayBuffer(encryptedData.iv);
    const encrypted = this.base64ToArrayBuffer(encryptedData.encryptedData);
    
    // Derive key from password
    const key = await this.deriveKey(password, new Uint8Array(salt));
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: new Uint8Array(iv)
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  /**
   * Generates a secure random password
   */
  static generatePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    return Array.from(array, byte => charset[byte % charset.length]).join('');
  }

  /**
   * Utility functions for base64 conversion
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}