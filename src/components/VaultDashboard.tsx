import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Shield, Key, FileText, CreditCard, Plus, Search, LogOut,
  Download, Upload, Settings, Lock, File, Cloud, ChevronDown,
  Merge, Replace, Info, Star, ShieldAlert, ShieldCheck, X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VaultItem, IndexedDBStorage, PasswordData } from '../services/indexedDBStorage';
import { toast } from 'sonner';
import { VaultItemForm } from './VaultItemForm';
import { VaultItemCard } from './VaultItemCard';
import { SecureShareDialog } from './SecureShareDialog';
import { EmergencyAccess } from './EmergencyAccess';
import { checkPasswordBreach, BreachResult } from '@/services/breachCheck';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface VaultDashboardProps {
  masterPassword: string;
  onLogout: () => void;
  onShowLockSettings?: () => void;
  onMasterPasswordChange?: (newPassword: string, hint?: string) => Promise<void> | void;
  initialItems?: VaultItem[];
  onSaveItem?: (item: VaultItem) => Promise<void>;
  onDeleteItem?: (itemId: string) => Promise<void>;
}

export const VaultDashboard = ({ 
  masterPassword, onLogout, onShowLockSettings, initialItems,
  onMasterPasswordChange, onSaveItem: onSaveItemProp, onDeleteItem: onDeleteItemProp
}: VaultDashboardProps) => {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [confirmNewMasterPassword, setConfirmNewMasterPassword] = useState('');
  const [newPasswordHint, setNewPasswordHint] = useState('');
  const [isChangingMasterPassword, setIsChangingMasterPassword] = useState(false);
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Undo delete state
  const [deletedItem, setDeletedItem] = useState<VaultItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<VaultItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Sharing state
  const [shareItem, setShareItem] = useState<VaultItem | null>(null);

  // Emergency access
  const [showEmergency, setShowEmergency] = useState(false);

  // Breach monitoring
  const [breachResults, setBreachResults] = useState<Map<string, 'safe' | 'breached' | 'unknown' | 'checking'>>(new Map());
  const [isScanning, setIsScanning] = useState(false);

  const allTags = [...new Set(items.flatMap(i => i.tags || []))].sort();

  const itemTypes = [
    { id: 'all', label: 'All Items', icon: Shield, count: items.length },
    { id: 'password', label: 'Passwords', icon: Key, count: items.filter(i => i.type === 'password').length },
    { id: 'note', label: 'Notes', icon: FileText, count: items.filter(i => i.type === 'note').length },
    { id: 'document', label: 'Documents', icon: File, count: items.filter(i => i.type === 'document').length },
    { id: 'bank', label: 'Banking', icon: CreditCard, count: items.filter(i => i.type === 'bank').length }
  ];

  useEffect(() => {
    if (initialItems) {
      setItems(initialItems);
      setIsLoading(false);
    } else {
      loadVaultData();
    }
  }, [masterPassword, initialItems]);

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    };
  }, []);

  const loadVaultData = async () => {
    try {
      const vaultItems = await IndexedDBStorage.loadVault(masterPassword);
      setItems(vaultItems);
    } catch (error) {
      console.error('Load vault error:', error);
      toast.error(`Failed to load vault data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveItem = async (item: VaultItem) => {
    if (onSaveItemProp) {
      await onSaveItemProp(item);
      setShowAddForm(false);
      setEditingItem(null);
      return;
    }
    try {
      const updatedItems = editingItem 
        ? items.map(i => i.id === editingItem.id ? item : i)
        : [...items, item];
      
      const pendingHint = localStorage.getItem('pendingHint');
      if (pendingHint && items.length === 0) {
        await IndexedDBStorage.saveVault(updatedItems, masterPassword, pendingHint);
        localStorage.removeItem('pendingHint');
      } else {
        await IndexedDBStorage.saveVault(updatedItems, masterPassword);
      }
      
      setItems(updatedItems);
      setShowAddForm(false);
      setEditingItem(null);
      toast.success(`${editingItem ? 'Updated' : 'Added'} ${item.type} successfully`);
    } catch (error) {
      console.error('Save item error:', error);
      toast.error(`Failed to save item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleToggleFavorite = useCallback(async (itemId: string) => {
    const updatedItems = items.map(i => 
      i.id === itemId ? { ...i, favorite: !i.favorite, updatedAt: new Date().toISOString() } : i
    );
    setItems(updatedItems);
    try {
      await IndexedDBStorage.saveVault(updatedItems, masterPassword);
    } catch (error) {
      console.error('Toggle favorite error:', error);
    }
  }, [items, masterPassword]);

  const confirmDeleteItem = useCallback((itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  }, [items]);

  const handleDeleteItem = useCallback(async () => {
    if (!itemToDelete) return;
    setShowDeleteConfirm(false);

    if (onDeleteItemProp) {
      await onDeleteItemProp(itemToDelete.id);
      setItemToDelete(null);
      return;
    }

    const deletedItemRef = itemToDelete;
    const updatedItems = items.filter(i => i.id !== deletedItemRef.id);
    setItems(updatedItems);
    setDeletedItem(deletedItemRef);
    setItemToDelete(null);

    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

    toast('Item deleted', {
      description: `"${deletedItemRef.title}" removed from vault`,
      action: {
        label: 'Undo',
        onClick: () => {
          if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
          setItems(prev => [...prev, deletedItemRef]);
          setDeletedItem(null);
          toast.success('Item restored');
          IndexedDBStorage.saveVault([...updatedItems, deletedItemRef], masterPassword).catch(console.error);
        }
      },
      duration: 30000,
    });

    undoTimeoutRef.current = setTimeout(async () => {
      try {
        await IndexedDBStorage.saveVault(updatedItems, masterPassword);
        setDeletedItem(null);
      } catch (error) {
        console.error('Delete persist error:', error);
      }
    }, 30000);
  }, [items, masterPassword, onDeleteItemProp, itemToDelete]);

  const handleSecurityScan = async () => {
    const passwordItems = items.filter(i => i.type === 'password');
    if (passwordItems.length === 0) {
      toast.info('No passwords to scan');
      return;
    }

    setIsScanning(true);
    const results = new Map<string, 'safe' | 'breached' | 'unknown' | 'checking'>();
    
    // Mark all as checking
    passwordItems.forEach(i => results.set(i.id, 'checking'));
    setBreachResults(new Map(results));

    let breachedCount = 0;
    for (const item of passwordItems) {
      const data = item.data as PasswordData;
      if (data.password) {
        const result = await checkPasswordBreach(data.password);
        if (result.error) {
          results.set(item.id, 'unknown');
        } else {
          results.set(item.id, result.breached ? 'breached' : 'safe');
          if (result.breached) breachedCount++;
        }
        setBreachResults(new Map(results));
      }
    }

    setIsScanning(false);
    if (breachedCount > 0) {
      toast.error(`${breachedCount} password(s) found in data breaches! Change them immediately.`);
    } else {
      toast.success('All passwords are safe — no breaches found!');
    }
  };

  const handleExportWithInstructions = () => {
    setShowExportDialog(true);
  };

  const doExport = async (encrypt: boolean) => {
    try {
      const exportData = await IndexedDBStorage.exportVault(masterPassword, encrypt);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-backup-${encrypt ? 'encrypted' : 'plaintext'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowExportDialog(false);
      toast.success(`Vault exported as ${encrypt ? 'encrypted' : 'plaintext'} backup`);
    } catch (error) {
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCloudBackup = async () => {
    try {
      const exportData = await IndexedDBStorage.exportVault(masterPassword, true);
      const blob = new Blob([exportData], { type: 'application/json' });
      const fileName = `vault-backup-encrypted-${new Date().toISOString().split('T')[0]}.json`;
      
      if (navigator.share) {
        try {
          const file = new globalThis.File([blob], fileName, { type: 'application/json' });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              title: 'SecureVault Encrypted Backup',
              text: 'Encrypted vault backup - requires your master password to decrypt',
              files: [file]
            });
            toast.success('Backup shared to cloud storage');
            return;
          }
        } catch {}
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Upload this file to Google Drive, Dropbox, or your preferred cloud storage');
    } catch (error) {
      toast.error(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      setImportFileContent(content);
      setImportFileName(file.name);
      setShowImportDialog(true);
    } catch {
      toast.error('Failed to read file');
    }
    event.target.value = '';
  };

  const handleImport = async (mode: 'replace' | 'merge') => {
    if (!importFileContent) return;
    try {
      if (mode === 'merge') {
        const result = await IndexedDBStorage.mergeImport(importFileContent, masterPassword);
        const updatedItems = await IndexedDBStorage.loadVault(masterPassword);
        setItems(updatedItems);
        toast.success(`Merge complete: ${result.added} added, ${result.updated} updated, ${result.total} total items`);
      } else {
        const importedItems = await IndexedDBStorage.importVault(importFileContent, masterPassword);
        setItems(importedItems);
        toast.success(`Replaced vault with ${importedItems.length} items from backup`);
      }
    } catch (error) {
      toast.error(`Import failed: ${error instanceof Error ? error.message : 'Invalid file format'}`);
    }
    setShowImportDialog(false);
    setImportFileContent(null);
    setImportFileName('');
  };

  const handleChangeMasterPassword = async (event: React.FormEvent) => {
    event.preventDefault();

    const nextPassword = newMasterPassword.trim();
    if (nextPassword.length < 8) {
      toast.error('Use at least 8 characters for your new master password.');
      return;
    }

    if (nextPassword !== confirmNewMasterPassword) {
      toast.error('New master passwords do not match.');
      return;
    }

    try {
      setIsChangingMasterPassword(true);
      await IndexedDBStorage.saveVault(items, nextPassword, newPasswordHint.trim() || undefined);
      await onMasterPasswordChange?.(nextPassword, newPasswordHint.trim() || undefined);
      setShowChangePasswordDialog(false);
      setNewMasterPassword('');
      setConfirmNewMasterPassword('');
      setNewPasswordHint('');
      toast.success('Master password changed. New backups must use this password.');
    } catch (error) {
      console.error('Change master password error:', error);
      toast.error(`Failed to change master password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsChangingMasterPassword(false);
    }
  };

  const filteredItems = items
    .filter(item => {
      const matchesType = selectedType === 'all' || item.type === selectedType;
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFav = !showFavoritesOnly || item.favorite;
      const matchesTag = !selectedTag || (item.tags || []).includes(selectedTag);
      return matchesType && matchesSearch && matchesFav && matchesTag;
    })
    .sort((a, b) => {
      // Favorites first
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-security flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your secure vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-security">
      {/* Header */}
      <header className="border-b border-border/50 glass sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Shield className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold">SecureVault</h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {items.length} encrypted {items.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={handleSecurityScan}
                disabled={isScanning}
                className="border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {isScanning ? 'Scanning...' : 'Security Scan'}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-border/50 hover:bg-secondary/10">
                    <Download className="w-4 h-4 mr-2" />Export<ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportWithInstructions}>
                    <Lock className="w-4 h-4 mr-2" />Encrypted Backup (Recommended)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => doExport(false)}>
                    <FileText className="w-4 h-4 mr-2" />Plaintext Backup
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCloudBackup}>
                    <Cloud className="w-4 h-4 mr-2" />Share to Cloud Storage
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button variant="outline" size="sm" className="border-border/50 hover:bg-secondary/10" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />Import
              </Button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelected} className="hidden" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-border/50">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onShowLockSettings && (
                    <DropdownMenuItem onClick={onShowLockSettings}>
                      <Lock className="w-4 h-4 mr-2" />Auto-Lock Settings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setShowChangePasswordDialog(true)}>
                    <Key className="w-4 h-4 mr-2" />Change Master Password
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowEmergency(true)}>
                    <ShieldAlert className="w-4 h-4 mr-2" />Emergency Kit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button variant="outline" size="sm" onClick={onLogout} className="border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">
                <LogOut className="w-4 h-4 mr-2" />Lock
              </Button>
            </div>

            {/* Mobile Menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-border/50"><Settings className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleSecurityScan} disabled={isScanning}>
                    <ShieldCheck className="w-4 h-4 mr-2" />{isScanning ? 'Scanning...' : 'Security Scan'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExportWithInstructions}><Lock className="w-4 h-4 mr-2" />Export Encrypted</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => doExport(false)}><FileText className="w-4 h-4 mr-2" />Export Plaintext</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCloudBackup}><Cloud className="w-4 h-4 mr-2" />Cloud Backup</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Import Backup</DropdownMenuItem>
                  {onShowLockSettings && (
                    <DropdownMenuItem onClick={onShowLockSettings}><Lock className="w-4 h-4 mr-2" />Auto-Lock Settings</DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setShowChangePasswordDialog(true)}><Key className="w-4 h-4 mr-2" />Change Master Password</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowEmergency(true)}>
                    <ShieldAlert className="w-4 h-4 mr-2" />Emergency Kit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-destructive"><LogOut className="w-4 h-4 mr-2" />Lock Vault</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelected} className="hidden" />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
            <Button onClick={() => setShowAddForm(true)} className="w-full bg-gradient-primary hover:shadow-secure transition-all duration-300 hidden lg:flex" size="lg">
              <Plus className="w-4 h-4 mr-2" />Add New Item
            </Button>

            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {/* Favorites filter */}
                <button
                  onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setSelectedTag(null); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                    showFavoritesOnly ? 'bg-secondary/15 text-secondary border border-secondary/20' : 'hover:bg-secondary/5 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-secondary' : ''}`} />
                    <span className="text-sm font-medium">Favorites</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{items.filter(i => i.favorite).length}</Badge>
                </button>

                {itemTypes.map(({ id, label, icon: Icon, count }) => (
                  <button
                    key={id}
                    onClick={() => setSelectedType(id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                      selectedType === id
                        ? 'bg-primary/15 text-primary border border-primary/20'
                        : 'hover:bg-secondary/5 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Tags */}
            {allTags.length > 0 && (
              <Card className="bg-gradient-card border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                          selectedTag === tag
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                    {selectedTag && (
                      <button onClick={() => setSelectedTag(null)} className="px-2 py-1 rounded-full text-xs text-destructive hover:bg-destructive/10">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4 order-1 lg:order-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search your vault..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card/50 border-border/50 h-11 rounded-xl focus:border-primary/50 transition-all duration-200"
              />
            </div>

            {/* Items Grid */}
            {filteredItems.length === 0 ? (
              <Card className="bg-gradient-card border-border/50">
                <CardContent className="text-center py-16">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-primary/50" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {searchTerm ? 'No items found' : showFavoritesOnly ? 'No favorites yet' : 'Your vault is empty'}
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    {searchTerm ? 'Try adjusting your search terms' : showFavoritesOnly ? 'Star items to add them to favorites' : 'Start by adding your first password, note, or document'}
                  </p>
                  {!searchTerm && !showFavoritesOnly && (
                    <Button onClick={() => setShowAddForm(true)} className="bg-gradient-primary hover:shadow-secure transition-all duration-300">
                      <Plus className="w-4 h-4 mr-2" />Add First Item
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                {filteredItems.map((item, index) => (
                  <div key={item.id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                    <VaultItemCard
                      item={item}
                      onEdit={() => setEditingItem(item)}
                      onDelete={() => confirmDeleteItem(item.id)}
                      onToggleFavorite={() => handleToggleFavorite(item.id)}
                      onShare={() => setShareItem(item)}
                      breachStatus={breachResults.get(item.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setShowAddForm(true)}
          className="w-14 h-14 rounded-2xl bg-gradient-primary fab-shadow hover:scale-105 active:scale-95 transition-all duration-200"
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingItem) && (
        <VaultItemForm
          item={editingItem}
          defaultType={selectedType !== 'all' ? selectedType as 'password' | 'note' | 'document' | 'bank' : 'password'}
          onSave={handleSaveItem}
          onCancel={() => { setShowAddForm(false); setEditingItem(null); }}
        />
      )}

      {/* Secure Share Dialog */}
      {shareItem && (
        <SecureShareDialog
          open={!!shareItem}
          onOpenChange={(open) => { if (!open) setShareItem(null); }}
          itemData={shareItem.data}
          itemTitle={shareItem.title}
        />
      )}

      {/* Emergency Access Dialog */}
      <EmergencyAccess
        open={showEmergency}
        onOpenChange={setShowEmergency}
        masterPassword={masterPassword}
      />

      {/* Export Instructions Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Backup Instructions
            </DialogTitle>
            <DialogDescription>
              How to restore this backup on another device
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">To restore on another device:</p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Open SecureVault on your new device</li>
                <li>Click <strong className="text-foreground">Import Backup</strong></li>
                <li>Select the downloaded backup file</li>
                <li>Enter <strong className="text-foreground">the same master password</strong> you use now</li>
              </ol>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ You must remember your master password — it cannot be recovered
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancel</Button>
            <Button onClick={() => doExport(true)} className="bg-gradient-primary">
              <Download className="w-4 h-4 mr-2" />Download Encrypted Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Mode Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => { if (!open) { setShowImportDialog(false); setImportFileContent(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Backup</DialogTitle>
            <DialogDescription>
              How would you like to import "{importFileName}"?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <button
              onClick={() => handleImport('merge')}
              className="w-full p-4 border border-primary/30 bg-primary/5 rounded-xl text-left hover:bg-primary/10 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3 mb-1">
                <Merge className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">Merge (Recommended)</span>
              </div>
              <p className="text-xs text-muted-foreground ml-8">
                Add missing items from backup without removing your current items. Keeps the newer version of duplicates.
              </p>
            </button>
            <button
              onClick={() => handleImport('replace')}
              className="w-full p-4 border border-border rounded-xl text-left hover:bg-destructive/5 hover:border-destructive/30 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-1">
                <Replace className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-foreground">Replace All</span>
              </div>
              <p className="text-xs text-muted-foreground ml-8">
                Remove all current items and replace with backup data.
              </p>
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImportDialog(false); setImportFileContent(null); }}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Master Password Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Change Master Password
            </DialogTitle>
            <DialogDescription>
              Re-encrypt this unlocked vault with a new password you can remember.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeMasterPassword} className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              If you unlocked with Face ID, this lets you recover access by setting a new master password. Existing encrypted backups still need the old password unless you export a new backup after changing it.
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-master-password">New master password</Label>
              <Input
                id="new-master-password"
                type="password"
                value={newMasterPassword}
                onChange={(event) => setNewMasterPassword(event.target.value)}
                autoComplete="new-password"
                className="bg-input border-border/50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-master-password">Confirm new master password</Label>
              <Input
                id="confirm-new-master-password"
                type="password"
                value={confirmNewMasterPassword}
                onChange={(event) => setConfirmNewMasterPassword(event.target.value)}
                autoComplete="new-password"
                className="bg-input border-border/50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password-hint">New hint (optional)</Label>
              <Input
                id="new-password-hint"
                value={newPasswordHint}
                onChange={(event) => setNewPasswordHint(event.target.value)}
                className="bg-input border-border/50"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowChangePasswordDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={isChangingMasterPassword} className="bg-gradient-primary">
                {isChangingMasterPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{itemToDelete?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This item will be removed from your vault. You'll have 30 seconds to undo this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowDeleteConfirm(false); setItemToDelete(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
