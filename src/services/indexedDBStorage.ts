/**
 * IndexedDB-based secure storage service for encrypted data
 */

import { CryptoService, EncryptedData } from './crypto';

export interface VaultItem {
  id: string;
  type: 'password' | 'note' | 'document' | 'bank';
  title: string;
  createdAt: string;
  updatedAt: string;
  data: any;
}

export interface PasswordData {
  website: string;
  username: string;
  password: string;
  notes?: string;
}

export interface NoteData {
  content: string;
  tags?: string[];
}

export interface BankData {
  accountName: string;
  accountNumber: string;
  routingNumber?: string;
  notes?: string;
}

export interface DocumentData {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: string; // base64 encoded
  notes?: string;
}

export class IndexedDBStorage {
  private static readonly DB_NAME = 'SecureVaultDB';
  private static readonly DB_VERSION = 1;
  private static readonly VAULT_STORE = 'vault';
  private static readonly AUTH_STORE = 'auth';
  private static readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  private static db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  private static async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create vault store
        if (!db.objectStoreNames.contains(this.VAULT_STORE)) {
          db.createObjectStore(this.VAULT_STORE, { keyPath: 'id' });
        }
        
        // Create auth store
        if (!db.objectStoreNames.contains(this.AUTH_STORE)) {
          db.createObjectStore(this.AUTH_STORE);
        }
      };
    });
  }

  /**
   * Saves encrypted vault data to IndexedDB with optional hint
   */
  static async saveVault(items: VaultItem[], masterPassword: string, hint?: string): Promise<void> {
    try {
      const db = await this.initDB();
      const vaultData = JSON.stringify(items);
      const encrypted = await CryptoService.encrypt(vaultData, masterPassword);
      
      const transaction = db.transaction([this.VAULT_STORE, this.AUTH_STORE], 'readwrite');
      
      // Save vault data
      const vaultStore = transaction.objectStore(this.VAULT_STORE);
      await new Promise((resolve, reject) => {
        const request = vaultStore.put({ id: 'vault_data', data: encrypted });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      // Save auth check
      const authCheck = await CryptoService.encrypt('authenticated', masterPassword);
      const authStore = transaction.objectStore(this.AUTH_STORE);
      await new Promise((resolve, reject) => {
        const request = authStore.put(authCheck, 'auth_check');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Save password hint if provided
      if (hint) {
        await new Promise((resolve, reject) => {
          const request = authStore.put(hint, 'password_hint');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }
      
    } catch (error) {
      throw new Error('Failed to save vault data');
    }
  }

  /**
   * Loads and decrypts vault data from IndexedDB
   */
  static async loadVault(masterPassword: string): Promise<VaultItem[]> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.VAULT_STORE], 'readonly');
      const store = transaction.objectStore(this.VAULT_STORE);
      
      const result = await new Promise<any>((resolve, reject) => {
        const request = store.get('vault_data');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (!result) {
        return [];
      }

      const encrypted: EncryptedData = result.data;
      const decryptedData = await CryptoService.decrypt(encrypted, masterPassword);
      return JSON.parse(decryptedData);
    } catch (error) {
      throw new Error('Failed to decrypt vault data - incorrect password?');
    }
  }

  /**
   * Verifies master password without loading full vault
   */
  static async verifyMasterPassword(masterPassword: string): Promise<boolean> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.AUTH_STORE], 'readonly');
      const store = transaction.objectStore(this.AUTH_STORE);
      
      const result = await new Promise<any>((resolve, reject) => {
        const request = store.get('auth_check');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (!result) {
        return true; // No vault exists yet
      }

      const encrypted: EncryptedData = result;
      const decrypted = await CryptoService.decrypt(encrypted, masterPassword);
      return decrypted === 'authenticated';
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if a vault exists
   */
  static async hasVault(): Promise<boolean> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.VAULT_STORE], 'readonly');
      const store = transaction.objectStore(this.VAULT_STORE);
      
      const result = await new Promise<any>((resolve, reject) => {
        const request = store.get('vault_data');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      return !!result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Exports vault data for backup
   */
  static async exportVault(masterPassword: string): Promise<string> {
    const items = await this.loadVault(masterPassword);
    return JSON.stringify({
      version: '1.0',
      exported: new Date().toISOString(),
      data: items
    }, null, 2);
  }

  /**
   * Imports vault data from backup
   */
  static async importVault(backupData: string, masterPassword: string): Promise<VaultItem[]> {
    try {
      const backup = JSON.parse(backupData);
      if (!backup.data || !Array.isArray(backup.data)) {
        throw new Error('Invalid backup format');
      }
      
      // Validate items structure
      const items: VaultItem[] = backup.data.map((item: any) => ({
        id: item.id || crypto.randomUUID(),
        type: item.type,
        title: item.title,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: item.data
      }));

      await this.saveVault(items, masterPassword);
      return items;
    } catch (error) {
      throw new Error('Failed to import backup data');
    }
  }

  /**
   * Clears all vault data
   */
  static async clearVault(): Promise<void> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.VAULT_STORE, this.AUTH_STORE], 'readwrite');
      
      const vaultStore = transaction.objectStore(this.VAULT_STORE);
      const authStore = transaction.objectStore(this.AUTH_STORE);
      
      await Promise.all([
        new Promise((resolve, reject) => {
          const request = vaultStore.clear();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        }),
        new Promise((resolve, reject) => {
          const request = authStore.clear();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        })
      ]);
    } catch (error) {
      throw new Error('Failed to clear vault data');
    }
  }

  /**
   * Validates file size for documents/photos
   */
  static validateFileSize(fileSize: number): boolean {
    return fileSize <= this.MAX_FILE_SIZE;
  }

  /**
   * Converts file to base64 for storage
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Converts base64 back to blob for download
   */
  static base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Gets password hint if exists
   */
  static async getPasswordHint(): Promise<string | null> {
    try {
      const db = await this.initDB();
      const transaction = db.transaction([this.AUTH_STORE], 'readonly');
      const store = transaction.objectStore(this.AUTH_STORE);
      
      const result = await new Promise<any>((resolve, reject) => {
        const request = store.get('password_hint');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      return result || null;
    } catch (error) {
      return null;
    }
  }
}