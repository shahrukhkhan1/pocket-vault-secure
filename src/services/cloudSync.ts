import { supabase } from '@/integrations/supabase/client';
import { CryptoService, EncryptedData } from './crypto';
import type { VaultItem } from './indexedDBStorage';

export interface CloudVaultData {
  id: string;
  user_id: string;
  vault_data: any; // JSON representation of EncryptedData
  password_hint?: string;
  auth_check: any; // JSON representation of EncryptedData
  device_id: string;
  last_sync: string;
  created_at: string;
  updated_at: string;
}

export interface RecoveryCode {
  code: string;
  id?: string;
}

export class CloudSyncService {
  private static readonly DEVICE_ID_KEY = 'vault_device_id';

  /**
   * Get or create device ID for this browser/device
   */
  private static getDeviceId(): string {
    let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  /**
   * Save encrypted vault data to cloud with conflict resolution
   */
  static async saveVaultToCloud(
    items: VaultItem[], 
    masterPassword: string, 
    hint?: string
  ): Promise<void> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('User not authenticated');
    }

    const deviceId = this.getDeviceId();
    
    // Encrypt vault data and auth check
    const vaultData = JSON.stringify(items);
    const encryptedVault = await CryptoService.encrypt(vaultData, masterPassword);
    const encryptedAuth = await CryptoService.encrypt('authenticated', masterPassword);

    // Check for existing vault data
    const { data: existingVault } = await supabase
      .from('encrypted_vaults')
      .select('*')
      .eq('user_id', user.data.user.id)
      .eq('device_id', deviceId)
      .maybeSingle();

    const vaultRecord = {
      user_id: user.data.user.id,
      vault_data: JSON.parse(JSON.stringify(encryptedVault)), // Convert to JSON
      password_hint: hint || null,
      auth_check: JSON.parse(JSON.stringify(encryptedAuth)), // Convert to JSON
      device_id: deviceId,
      last_sync: new Date().toISOString()
    };

    if (existingVault) {
      // Update existing vault
      const { error } = await supabase
        .from('encrypted_vaults')
        .update(vaultRecord)
        .eq('id', existingVault.id);

      if (error) throw error;
    } else {
      // Create new vault
      const { error } = await supabase
        .from('encrypted_vaults')
        .insert(vaultRecord);

      if (error) throw error;
    }
  }

  /**
   * Load encrypted vault data from cloud
   */
  static async loadVaultFromCloud(masterPassword: string): Promise<VaultItem[]> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('User not authenticated');
    }

    const deviceId = this.getDeviceId();

    // Get vault data for this user and device
    const { data: vaultData, error } = await supabase
      .from('encrypted_vaults')
      .select('*')
      .eq('user_id', user.data.user.id)
      .eq('device_id', deviceId)
      .maybeSingle();

    if (error) throw error;
    if (!vaultData) return [];

    try {
      // Convert JSON back to EncryptedData format
      const authCheck = vaultData.auth_check as unknown as EncryptedData;
      const vaultDataEncrypted = vaultData.vault_data as unknown as EncryptedData;
      
      // Verify password first
      const decryptedAuth = await CryptoService.decrypt(authCheck, masterPassword);
      if (decryptedAuth !== 'authenticated') {
        throw new Error('Invalid password');
      }

      // Decrypt vault data
      const decryptedVault = await CryptoService.decrypt(vaultDataEncrypted, masterPassword);
      return JSON.parse(decryptedVault);
    } catch (error) {
      throw new Error('Failed to decrypt vault data - incorrect password?');
    }
  }

  /**
   * Get all vault devices for the current user
   */
  static async getUserDevices(): Promise<CloudVaultData[]> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('encrypted_vaults')
      .select('*')
      .eq('user_id', user.data.user.id)
      .order('last_sync', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Sync vault data across all user devices
   */
  static async syncVaultAcrossDevices(
    items: VaultItem[], 
    masterPassword: string
  ): Promise<VaultItem[]> {
    // Save current device data to cloud
    await this.saveVaultToCloud(items, masterPassword);

    // Get latest data from all devices
    const devices = await this.getUserDevices();
    
    if (devices.length === 0) return items;

    // Find the most recently updated vault
    const latestDevice = devices.reduce((latest, current) => 
      new Date(current.last_sync) > new Date(latest.last_sync) ? current : latest
    );

    // If current device is the latest, return current items
    const currentDeviceId = this.getDeviceId();
    if (latestDevice.device_id === currentDeviceId) {
      return items;
    }

    // Decrypt and merge data from the latest device
    try {
      const vaultDataEncrypted = latestDevice.vault_data as unknown as EncryptedData;
      const decryptedVault = await CryptoService.decrypt(vaultDataEncrypted, masterPassword);
      const latestItems: VaultItem[] = JSON.parse(decryptedVault);

      // Simple merge strategy: use latest data and combine unique items
      const mergedItems = this.mergeVaultItems(items, latestItems);
      
      // Save merged data back to cloud
      await this.saveVaultToCloud(mergedItems, masterPassword);
      
      return mergedItems;
    } catch (error) {
      console.error('Sync error:', error);
      // If sync fails, return current items
      return items;
    }
  }

  /**
   * Merge vault items from different devices
   */
  private static mergeVaultItems(localItems: VaultItem[], cloudItems: VaultItem[]): VaultItem[] {
    const itemMap = new Map<string, VaultItem>();

    // Add local items
    localItems.forEach(item => itemMap.set(item.id, item));

    // Merge cloud items (newer items win)
    cloudItems.forEach(cloudItem => {
      const localItem = itemMap.get(cloudItem.id);
      if (!localItem || new Date(cloudItem.updatedAt) > new Date(localItem.updatedAt)) {
        itemMap.set(cloudItem.id, cloudItem);
      }
    });

    return Array.from(itemMap.values());
  }

  /**
   * Check if user has cloud vault
   */
  static async hasCloudVault(): Promise<boolean> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) return false;

    const { data, error } = await supabase
      .from('encrypted_vaults')
      .select('id')
      .eq('user_id', user.data.user.id)
      .limit(1);

    if (error) return false;
    return (data && data.length > 0);
  }

  /**
   * Verify master password against cloud data
   */
  static async verifyCloudPassword(masterPassword: string): Promise<boolean> {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return false;

      const deviceId = this.getDeviceId();

      const { data: vaultData } = await supabase
        .from('encrypted_vaults')
        .select('auth_check')
        .eq('user_id', user.data.user.id)
        .eq('device_id', deviceId)
        .maybeSingle();

      if (!vaultData) return false;

      const authCheck = vaultData.auth_check as unknown as EncryptedData;
      const decryptedAuth = await CryptoService.decrypt(authCheck, masterPassword);
      return decryptedAuth === 'authenticated';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get password hint from cloud
   */
  static async getCloudPasswordHint(): Promise<string | null> {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return null;

      const deviceId = this.getDeviceId();

      const { data: vaultData } = await supabase
        .from('encrypted_vaults')
        .select('password_hint')
        .eq('user_id', user.data.user.id)
        .eq('device_id', deviceId)
        .maybeSingle();

      return vaultData?.password_hint || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate recovery codes for password recovery
   */
  static async generateRecoveryCodes(count: number = 10): Promise<RecoveryCode[]> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      throw new Error('User not authenticated');
    }

    const codes: RecoveryCode[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = this.generateRecoveryCode();
      const codeHash = await this.hashRecoveryCode(code);
      
      const { data, error } = await supabase
        .from('recovery_codes')
        .insert({
          user_id: user.data.user.id,
          code_hash: codeHash,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
        })
        .select('id')
        .single();

      if (error) throw error;

      codes.push({ code, id: data.id });
    }

    return codes;
  }

  /**
   * Verify recovery code and mark as used
   */
  static async verifyRecoveryCode(code: string): Promise<boolean> {
    const user = await supabase.auth.getUser();
    if (!user.data.user) return false;

    try {
      const codeHash = await this.hashRecoveryCode(code);

      const { data: recoveryCode, error } = await supabase
        .from('recovery_codes')
        .select('*')
        .eq('user_id', user.data.user.id)
        .eq('code_hash', codeHash)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !recoveryCode) return false;

      // Mark code as used
      await supabase
        .from('recovery_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', recoveryCode.id);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a random recovery code
   */
  private static generateRecoveryCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Hash recovery code for secure storage
   */
  private static async hashRecoveryCode(code: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}