/**
 * Secure local storage service for encrypted data
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

export class StorageService {
  private static readonly VAULT_KEY = 'secure_vault_data';
  private static readonly AUTH_KEY = 'vault_auth_check';
  
  /**
   * Saves encrypted vault data to localStorage
   */
  static async saveVault(items: VaultItem[], masterPassword: string): Promise<void> {
    try {
      const vaultData = JSON.stringify(items);
      const encrypted = await CryptoService.encrypt(vaultData, masterPassword);
      localStorage.setItem(this.VAULT_KEY, JSON.stringify(encrypted));
      
      // Save a simple auth check
      const authCheck = await CryptoService.encrypt('authenticated', masterPassword);
      localStorage.setItem(this.AUTH_KEY, JSON.stringify(authCheck));
    } catch (error) {
      throw new Error('Failed to save vault data');
    }
  }

  /**
   * Loads and decrypts vault data from localStorage
   */
  static async loadVault(masterPassword: string): Promise<VaultItem[]> {
    try {
      const encryptedData = localStorage.getItem(this.VAULT_KEY);
      if (!encryptedData) {
        return [];
      }

      const encrypted: EncryptedData = JSON.parse(encryptedData);
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
      const authData = localStorage.getItem(this.AUTH_KEY);
      if (!authData) {
        return true; // No vault exists yet
      }

      const encrypted: EncryptedData = JSON.parse(authData);
      const decrypted = await CryptoService.decrypt(encrypted, masterPassword);
      return decrypted === 'authenticated';
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if a vault exists
   */
  static hasVault(): boolean {
    return localStorage.getItem(this.VAULT_KEY) !== null;
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
  static clearVault(): void {
    localStorage.removeItem(this.VAULT_KEY);
    localStorage.removeItem(this.AUTH_KEY);
  }
}