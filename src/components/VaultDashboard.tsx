import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Key, 
  FileText, 
  CreditCard, 
  Plus, 
  Search, 
  LogOut,
  Download,
  Upload,
  Settings,
  Lock,
  File
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { VaultItem, IndexedDBStorage } from '../services/indexedDBStorage';
import { useToast } from '@/hooks/use-toast';
import { VaultItemForm } from './VaultItemForm';
import { VaultItemCard } from './VaultItemCard';

interface VaultDashboardProps {
  masterPassword: string;
  onLogout: () => void;
  onShowLockSettings?: () => void;
}

export const VaultDashboard = ({ masterPassword, onLogout, onShowLockSettings }: VaultDashboardProps) => {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const itemTypes = [
    { id: 'all', label: 'All Items', icon: Shield, count: items.length },
    { id: 'password', label: 'Passwords', icon: Key, count: items.filter(i => i.type === 'password').length },
    { id: 'note', label: 'Notes', icon: FileText, count: items.filter(i => i.type === 'note').length },
    { id: 'document', label: 'Documents', icon: File, count: items.filter(i => i.type === 'document').length },
    { id: 'bank', label: 'Banking', icon: CreditCard, count: items.filter(i => i.type === 'bank').length }
  ];

  useEffect(() => {
    loadVaultData();
  }, []);

  const loadVaultData = async () => {
    try {
      const vaultItems = await IndexedDBStorage.loadVault(masterPassword);
      setItems(vaultItems);
    } catch (error) {
      console.error('Load vault error:', error);
      toast({
        title: "Error",
        description: `Failed to load vault data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveItem = async (item: VaultItem) => {
    try {
      const updatedItems = editingItem 
        ? items.map(i => i.id === editingItem.id ? item : i)
        : [...items, item];
      
      // Check if we have a pending hint for new vault creation
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
      
      toast({
        title: "Success",
        description: `${editingItem ? 'Updated' : 'Added'} ${item.type} successfully`,
        variant: "default"
      });
    } catch (error) {
      console.error('Save item error:', error);
      toast({
        title: "Error",
        description: `Failed to save item: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const updatedItems = items.filter(i => i.id !== itemId);
      await IndexedDBStorage.saveVault(updatedItems, masterPassword);
      setItems(updatedItems);
      
      toast({
        title: "Success",
        description: "Item deleted successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Delete item error:', error);
      toast({
        title: "Error",
        description: `Failed to delete item: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleExport = async () => {
    try {
      const exportData = await IndexedDBStorage.exportVault(masterPassword);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Vault backup downloaded successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: `Failed to export vault data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const importedItems = await IndexedDBStorage.importVault(content, masterPassword);
      setItems(importedItems);
      
      toast({
        title: "Import Complete",
        description: `Successfully imported ${importedItems.length} items`,
        variant: "default"
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: `Failed to import vault data: ${error instanceof Error ? error.message : 'Invalid file format'}`,
        variant: "destructive"
      });
    }
    
    // Reset file input
    event.target.value = '';
  };

  const filteredItems = items.filter(item => {
    const matchesType = selectedType === 'all' || item.type === selectedType;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">SecureVault</h1>
                <p className="text-sm text-muted-foreground">
                  {items.length} encrypted {items.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="border-border hover:bg-secondary"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border hover:bg-secondary"
                  onClick={() => document.getElementById('import-file')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <input
                  id="import-file"
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </div>
              
              {onShowLockSettings && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShowLockSettings}
                  className="border-border hover:bg-secondary"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="border-border hover:bg-destructive hover:text-destructive-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Lock
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Add Button */}
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full bg-gradient-primary hover:shadow-secure transition-spring"
              size="lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Item
            </Button>

            {/* Categories */}
            <Card className="bg-gradient-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {itemTypes.map(({ id, label, icon: Icon, count }) => (
                  <button
                    key={id}
                    onClick={() => setSelectedType(id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-smooth ${
                      selectedType === id
                        ? 'bg-primary/20 text-primary border border-primary/20'
                        : 'hover:bg-secondary/50 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search your vault..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card/50 border-border"
              />
            </div>

            {/* Items Grid */}
            {filteredItems.length === 0 ? (
              <Card className="bg-gradient-card border-border">
                <CardContent className="text-center py-12">
                  <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchTerm ? 'No items found' : 'Your vault is empty'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm 
                      ? 'Try adjusting your search terms' 
                      : 'Start by adding your first password, note, or document'
                    }
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => setShowAddForm(true)}
                      className="bg-gradient-primary hover:shadow-secure transition-spring"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Item
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map(item => (
                  <VaultItemCard
                    key={item.id}
                    item={item}
                    onEdit={() => setEditingItem(item)}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingItem) && (
        <VaultItemForm
          item={editingItem}
          defaultType={selectedType !== 'all' ? selectedType as 'password' | 'note' | 'document' | 'bank' : 'password'}
          onSave={handleSaveItem}
          onCancel={() => {
            setShowAddForm(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};