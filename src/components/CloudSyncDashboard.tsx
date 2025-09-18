import { useState, useEffect } from 'react';
import { VaultDashboard } from './VaultDashboard';
import { CloudSyncService, type RecoveryCode } from '@/services/cloudSync';
import { IndexedDBStorage, type VaultItem } from '@/services/indexedDBStorage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Cloud, 
  CloudOff, 
  Download, 
  Upload, 
  Shield, 
  Smartphone, 
  RefreshCw,
  KeyRound,
  Copy,
  Check
} from 'lucide-react';

interface CloudSyncDashboardProps {
  masterPassword: string;
  onLogout: () => void;
  onShowLockSettings: () => void;
}

export const CloudSyncDashboard = ({ 
  masterPassword, 
  onLogout, 
  onShowLockSettings 
}: CloudSyncDashboardProps) => {
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'local' | 'cloud' | 'synced'>('local');
  const [recoveryCodes, setRecoveryCodes] = useState<RecoveryCode[]>([]);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState<Set<string>>(new Set());
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadVaultData();
  }, [masterPassword]);

  const loadVaultData = async () => {
    try {
      setIsLoading(true);
      
      // Try to load from cloud first
      const hasCloud = await CloudSyncService.hasCloudVault();
      let items: VaultItem[] = [];
      
      if (hasCloud) {
        try {
          items = await CloudSyncService.loadVaultFromCloud(masterPassword);
          setSyncStatus('cloud');
        } catch (error) {
          console.error('Failed to load from cloud, trying local:', error);
          items = await IndexedDBStorage.loadVault(masterPassword);
          setSyncStatus('local');
        }
      } else {
        // Load from local storage
        items = await IndexedDBStorage.loadVault(masterPassword);
        setSyncStatus('local');
        
        // Try to sync to cloud if we have local data
        if (items.length > 0) {
          await handleSyncToCloud(items);
        }
      }
      
      setVaultItems(items);
    } catch (error) {
      console.error('Failed to load vault data:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load vault data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveItem = async (item: VaultItem) => {
    try {
      const existingIndex = vaultItems.findIndex(existingItem => existingItem.id === item.id);
      let updatedItems: VaultItem[];
      
      if (existingIndex >= 0) {
        updatedItems = [...vaultItems];
        updatedItems[existingIndex] = item;
      } else {
        updatedItems = [...vaultItems, item];
      }
      
      // Save to both local and cloud
      await Promise.all([
        IndexedDBStorage.saveVault(updatedItems, masterPassword),
        CloudSyncService.saveVaultToCloud(updatedItems, masterPassword)
      ]);
      
      setVaultItems(updatedItems);
      setSyncStatus('synced');
      
      toast({
        title: "Item Saved",
        description: "Vault item saved and synced to cloud",
        variant: "default"
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save vault item",
        variant: "destructive"
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const updatedItems = vaultItems.filter(item => item.id !== itemId);
      
      // Save to both local and cloud
      await Promise.all([
        IndexedDBStorage.saveVault(updatedItems, masterPassword),
        CloudSyncService.saveVaultToCloud(updatedItems, masterPassword)
      ]);
      
      setVaultItems(updatedItems);
      setSyncStatus('synced');
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed", 
        description: "Failed to delete vault item",
        variant: "destructive"
      });
    }
  };

  const handleSyncToCloud = async (items?: VaultItem[]) => {
    try {
      setIsSyncing(true);
      const itemsToSync = items || vaultItems;
      
      const syncedItems = await CloudSyncService.syncVaultAcrossDevices(itemsToSync, masterPassword);
      
      // Also save to local storage
      await IndexedDBStorage.saveVault(syncedItems, masterPassword);
      
      setVaultItems(syncedItems);
      setSyncStatus('synced');
      
      toast({
        title: "Sync Complete",
        description: "Vault synced across all devices",
        variant: "default"
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync vault data",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadFromCloud = async () => {
    try {
      setIsLoading(true);
      const cloudItems = await CloudSyncService.loadVaultFromCloud(masterPassword);
      
      // Save to local storage
      await IndexedDBStorage.saveVault(cloudItems, masterPassword);
      
      setVaultItems(cloudItems);
      setSyncStatus('synced');
      
      toast({
        title: "Download Complete",
        description: "Vault data downloaded from cloud",
        variant: "default"
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download from cloud",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRecoveryCodes = async () => {
    try {
      const codes = await CloudSyncService.generateRecoveryCodes();
      setRecoveryCodes(codes);
      setShowRecoveryCodes(true);
      
      toast({
        title: "Recovery Codes Generated",
        description: "Save these codes in a secure location",
        variant: "default"
      });
    } catch (error) {
      console.error('Recovery codes error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate recovery codes",
        variant: "destructive"
      });
    }
  };

  const copyRecoveryCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodes(prev => new Set([...prev, code]));
      
      setTimeout(() => {
        setCopiedCodes(prev => {
          const updated = new Set(prev);
          updated.delete(code);
          return updated;
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy recovery code",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onLogout();
  };

  const getSyncStatusBadge = () => {
    switch (syncStatus) {
      case 'cloud':
        return <Badge variant="default" className="bg-primary"><Cloud className="w-3 h-3 mr-1" />Cloud</Badge>;
      case 'local':
        return <Badge variant="secondary"><CloudOff className="w-3 h-3 mr-1" />Local</Badge>;
      case 'synced':
        return <Badge variant="default" className="bg-success"><Shield className="w-3 h-3 mr-1" />Synced</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-navy flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow mx-auto animate-pulse">
            <Cloud className="w-8 h-8 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading vault data...</p>
        </div>
      </div>
    );
  }

  if (showRecoveryCodes) {
    return (
      <div className="min-h-screen bg-gradient-navy">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="bg-gradient-card border-border shadow-secure">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                <KeyRound className="w-6 h-6 text-primary" />
                Recovery Codes
              </CardTitle>
              <CardDescription>
                Save these codes securely. You can use them to recover your account if you forget your password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recoveryCodes.map((recovery, index) => (
                  <div 
                    key={recovery.id || index}
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border"
                  >
                    <code className="text-sm font-mono text-foreground">{recovery.code}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyRecoveryCode(recovery.code)}
                      className="ml-2 h-8 w-8 p-0"
                    >
                      {copiedCodes.has(recovery.code) ? (
                        <Check className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm text-destructive font-medium mb-2">⚠️ Important Security Notice:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Store these codes in a secure location separate from your vault</li>
                  <li>• Each code can only be used once</li>
                  <li>• Anyone with these codes can access your account</li>
                  <li>• Generate new codes if these are compromised</li>
                </ul>
              </div>
              
              <Button 
                onClick={() => setShowRecoveryCodes(false)}
                className="w-full bg-gradient-primary hover:shadow-secure transition-spring"
              >
                Continue to Vault
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Enhanced VaultDashboard with cloud sync controls
  return (
    <div className="min-h-screen bg-gradient-navy">
      {/* Cloud Status Header */}
      <div className="border-b border-border/20 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {user?.email}
                </span>
              </div>
              {getSyncStatusBadge()}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSyncToCloud()}
                disabled={isSyncing}
                className="text-xs"
              >
                {isSyncing ? (
                  <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                Sync
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownloadFromCloud}
                className="text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleGenerateRecoveryCodes}
                className="text-xs"
              >
                <KeyRound className="w-3 h-3 mr-1" />
                Recovery
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSignOut}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Vault Dashboard */}
      <VaultDashboard
        masterPassword={masterPassword}
        onLogout={onLogout}
        onShowLockSettings={onShowLockSettings}
        // Override the vault management methods to use cloud sync
        initialItems={vaultItems}
        onSaveItem={handleSaveItem}
        onDeleteItem={handleDeleteItem}
      />
    </div>
  );
};