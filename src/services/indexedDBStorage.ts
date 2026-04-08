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
        if (!db.objectStoreNames.contains(this.VAULT_STORE)) {
          db.createObjectStore(this.VAULT_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(this.AUTH_STORE)) {
          db.createObjectStore(this.AUTH_STORE);
        }
      };
    });
  }

  static async saveVault(items: VaultItem[], masterPassword: string, hint?: string): Promise<void> {
    try {
      const db = await this.initDB();
      const vaultData = JSON.stringify(items);
      const encryptedVault = await CryptoService.encrypt(vaultData, masterPassword);
      const encryptedAuth = await CryptoService.encrypt('authenticated', masterPassword);

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.VAULT_STORE, this.AUTH_STORE], 'readwrite');
        let operations = 0;
        let completedOperations = 0;
        const checkComplete = () => { completedOperations++; if (completedOperations === operations) resolve(); };
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(new Error('Transaction aborted'));

        const vaultStore = transaction.objectStore(this.VAULT_STORE);
        const authStore = transaction.objectStore(this.AUTH_STORE);

        operations++;
        const vaultRequest = vaultStore.put({ id: 'vault_data', data: encryptedVault });
        vaultRequest.onsuccess = checkComplete;
        vaultRequest.onerror = () => reject(vaultRequest.error);

        operations++;
        const authRequest = authStore.put(encryptedAuth, 'auth_check');
        authRequest.onsuccess = checkComplete;
        authRequest.onerror = () => reject(authRequest.error);

        if (hint) {
          operations++;
          const hintRequest = authStore.put(hint, 'password_hint');
          hintRequest.onsuccess = checkComplete;
          hintRequest.onerror = () => reject(hintRequest.error);
        }
      });
    } catch (error) {
      console.error('IndexedDB saveVault error:', error);
      throw new Error('Failed to save vault data');
    }
  }

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

      if (!result) return [];
      const encrypted: EncryptedData = result.data;
      const decryptedData = await CryptoService.decrypt(encrypted, masterPassword);
      return JSON.parse(decryptedData);
    } catch (error) {
      throw new Error('Failed to decrypt vault data - incorrect password?');
    }
  }

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
        const vaultExists = await this.hasVault();
        return !vaultExists;
      }

      const encrypted: EncryptedData = result;
      const decrypted = await CryptoService.decrypt(encrypted, masterPassword);
      return decrypted === 'authenticated';
    } catch (error) {
      console.error('verifyMasterPassword error:', error);
      return false;
    }
  }

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

  static async exportVault(masterPassword: string, encrypt: boolean = true): Promise<string> {
    const items = await this.loadVault(masterPassword);
    const exportData = {
      version: '1.0',
      exported: new Date().toISOString(),
      encrypted: encrypt,
      data: items
    };

    if (encrypt) {
      const jsonString = JSON.stringify(exportData.data);
      const encryptedData = await CryptoService.encrypt(jsonString, masterPassword);
      return JSON.stringify({ ...exportData, data: encryptedData }, null, 2);
    }

    return JSON.stringify(exportData, null, 2);
  }

  static async importVault(backupData: string, masterPassword: string): Promise<VaultItem[]> {
    try {
      const parsed = JSON.parse(backupData);
      if (!parsed.data) throw new Error('Invalid backup format');

      let items: VaultItem[];
      if (parsed.encrypted) {
        const decryptedString = await CryptoService.decrypt(parsed.data, masterPassword);
        items = JSON.parse(decryptedString);
      } else {
        items = parsed.data;
      }

      if (!Array.isArray(items)) throw new Error('Invalid backup format');

      const validatedItems: VaultItem[] = items.map((item: any) => ({
        id: item.id || crypto.randomUUID(),
        type: item.type,
        title: item.title,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: item.data
      }));

      await this.saveVault(validatedItems, masterPassword);
      return validatedItems;
    } catch (error) {
      console.error('Import error:', error);
      throw new Error('Failed to import vault data. Please check the file format and master password.');
    }
  }

  /**
   * Smart merge import: adds missing items from backup without removing existing ones.
   * If an item with the same ID exists, keeps the newer version.
   */
  static async mergeImport(backupData: string, masterPassword: string): Promise<{ added: number; updated: number; total: number }> {
    try {
      const parsed = JSON.parse(backupData);
      if (!parsed.data) throw new Error('Invalid backup format');

      let backupItems: VaultItem[];
      if (parsed.encrypted) {
        const decryptedString = await CryptoService.decrypt(parsed.data, masterPassword);
        backupItems = JSON.parse(decryptedString);
      } else {
        backupItems = parsed.data;
      }

      if (!Array.isArray(backupItems)) throw new Error('Invalid backup format');

      const existingItems = await this.loadVault(masterPassword);
      const existingMap = new Map(existingItems.map(item => [item.id, item]));

      let added = 0;
      let updated = 0;

      for (const backupItem of backupItems) {
        const existing = existingMap.get(backupItem.id);
        if (!existing) {
          // Item doesn't exist — add it
          existingMap.set(backupItem.id, {
            id: backupItem.id || crypto.randomUUID(),
            type: backupItem.type,
            title: backupItem.title,
            createdAt: backupItem.createdAt || new Date().toISOString(),
            updatedAt: backupItem.updatedAt || new Date().toISOString(),
            data: backupItem.data
          });
          added++;
        } else {
          // Item exists — keep the newer version
          const existingDate = new Date(existing.updatedAt).getTime();
          const backupDate = new Date(backupItem.updatedAt).getTime();
          if (backupDate > existingDate) {
            existingMap.set(backupItem.id, backupItem);
            updated++;
          }
        }
      }

      const mergedItems = Array.from(existingMap.values());
      await this.saveVault(mergedItems, masterPassword);

      return { added, updated, total: mergedItems.length };
    } catch (error) {
      console.error('Merge import error:', error);
      throw new Error('Failed to merge backup data. Please check the file format and master password.');
    }
  }

  static async clearVault(): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.VAULT_STORE, this.AUTH_STORE], 'readwrite');
        let completedOperations = 0;
        const checkComplete = () => { completedOperations++; if (completedOperations === 2) resolve(); };
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(new Error('Transaction aborted'));

        const vaultStore = transaction.objectStore(this.VAULT_STORE);
        const authStore = transaction.objectStore(this.AUTH_STORE);

        const vaultRequest = vaultStore.clear();
        vaultRequest.onsuccess = checkComplete;
        vaultRequest.onerror = () => reject(vaultRequest.error);

        const authRequest = authStore.clear();
        authRequest.onsuccess = checkComplete;
        authRequest.onerror = () => reject(authRequest.error);
      });
    } catch (error) {
      throw new Error('Failed to clear vault data');
    }
  }

  static validateFileSize(fileSize: number): boolean {
    return fileSize <= this.MAX_FILE_SIZE;
  }

  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  static base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

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

  /**
   * Store encrypted master password for biometric unlock
   */
  static async storeBiometricKey(credentialId: string, encryptedPassword: string): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.AUTH_STORE], 'readwrite');
        const store = transaction.objectStore(this.AUTH_STORE);
        const request = store.put({ credentialId, encryptedPassword }, 'biometric_key');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to store biometric key:', error);
    }
  }

  /**
   * Retrieve encrypted master password for biometric unlock
   */
  static async getBiometricKey(): Promise<{ credentialId: string; encryptedPassword: string } | null> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.AUTH_STORE], 'readonly');
        const store = transaction.objectStore(this.AUTH_STORE);
        const request = store.get('biometric_key');
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Remove biometric key
   */
  static async removeBiometricKey(): Promise<void> {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.AUTH_STORE], 'readwrite');
        const store = transaction.objectStore(this.AUTH_STORE);
        const request = store.delete('biometric_key');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to remove biometric key:', error);
    }
  }
}
