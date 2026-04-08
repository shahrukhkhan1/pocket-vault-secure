import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Key, FileText, CreditCard, Edit, Trash2, Copy, Eye, EyeOff,
  ExternalLink, File, Download, Image as ImageIcon
} from 'lucide-react';
import { VaultItem, PasswordData, NoteData, BankData, DocumentData } from '@/services/indexedDBStorage';
import { IndexedDBStorage } from '@/services/indexedDBStorage';
import { useState } from 'react';
import { toast } from 'sonner';

interface VaultItemCardProps {
  item: VaultItem;
  onEdit: () => void;
  onDelete: () => void;
}

export const VaultItemCard = ({ item, onEdit, onDelete }: VaultItemCardProps) => {
  const [showSensitive, setShowSensitive] = useState(false);

  const getTypeIcon = () => {
    switch (item.type) {
      case 'password': return Key;
      case 'note': return FileText;
      case 'document': return File;
      case 'bank': return CreditCard;
      default: return FileText;
    }
  };

  const getTypeColor = () => {
    switch (item.type) {
      case 'password': return 'bg-primary/20 text-primary';
      case 'note': return 'bg-accent/20 text-accent';
      case 'document': return 'bg-blue-500/20 text-blue-400';
      case 'bank': return 'bg-success/20 text-success';
      default: return 'bg-muted';
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
      if (label.toLowerCase().includes('password') || label.toLowerCase().includes('account')) {
        setTimeout(async () => {
          try { await navigator.clipboard.writeText(''); } catch {}
        }, 20000);
      }
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const openWebsite = (url: string) => {
    let formattedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = `https://${url}`;
    }
    window.open(formattedUrl, '_blank');
  };

  const renderPasswordData = (data: PasswordData) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Website</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono truncate max-w-[150px]">{data.website}</span>
          <Button size="sm" variant="ghost" onClick={() => openWebsite(data.website)} className="h-6 w-6 p-0">
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Username</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono truncate max-w-[150px]">{data.username}</span>
          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(data.username, 'Username')} className="h-6 w-6 p-0">
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Password</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono">{showSensitive ? data.password : '••••••••'}</span>
          <Button size="sm" variant="ghost" onClick={() => setShowSensitive(!showSensitive)} className="h-6 w-6 p-0">
            {showSensitive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(data.password, 'Password')} className="h-6 w-6 p-0">
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>
      {data.notes && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">{data.notes}</p>
        </div>
      )}
    </div>
  );

  const renderNoteData = (data: NoteData) => (
    <div className="space-y-3">
      <p className="text-sm text-foreground line-clamp-3">{data.content}</p>
      {data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}
    </div>
  );

  const renderDocumentData = (data: DocumentData) => {
    const isImage = data.fileType?.startsWith('image/');
    const downloadFile = () => {
      if (data.fileData && data.fileName && data.fileType) {
        const blob = IndexedDBStorage.base64ToBlob(data.fileData, data.fileType);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    };

    return (
      <div className="space-y-3">
        {/* Image preview */}
        {isImage && data.fileData && (
          <div className="rounded-lg overflow-hidden border border-border bg-background/30">
            <img
              src={`data:${data.fileType};base64,${data.fileData}`}
              alt={data.fileName}
              className="w-full h-32 object-cover"
            />
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {isImage ? <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" /> : <File className="w-4 h-4 text-primary shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{data.fileName}</p>
              <p className="text-xs text-muted-foreground">{(data.fileSize / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={downloadFile} className="shrink-0">
            <Download className="w-3 h-3 mr-1" />
            Save
          </Button>
        </div>
        {data.notes && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">{data.notes}</p>
          </div>
        )}
      </div>
    );
  };

  const renderBankData = (data: BankData) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Account</span>
        <span className="text-sm font-mono">{data.accountName}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Number</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono">{showSensitive ? data.accountNumber : '••••••••'}</span>
          <Button size="sm" variant="ghost" onClick={() => setShowSensitive(!showSensitive)} className="h-6 w-6 p-0">
            {showSensitive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => copyToClipboard(data.accountNumber, 'Account Number')} className="h-6 w-6 p-0">
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>
      {data.routingNumber && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Routing</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono">{data.routingNumber}</span>
            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(data.routingNumber!, 'Routing Number')} className="h-6 w-6 p-0">
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
      {data.notes && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">{data.notes}</p>
        </div>
      )}
    </div>
  );

  const renderItemData = () => {
    switch (item.type) {
      case 'password': return renderPasswordData(item.data as PasswordData);
      case 'note': return renderNoteData(item.data as NoteData);
      case 'document': return renderDocumentData(item.data as DocumentData);
      case 'bank': return renderBankData(item.data as BankData);
      default: return <p className="text-sm text-muted-foreground">No data available</p>;
    }
  };

  const TypeIcon = getTypeIcon();

  return (
    <Card className="vault-card bg-gradient-card border-border group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${getTypeColor()} transition-all duration-200`}>
              <TypeIcon className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <CardDescription className="text-xs">
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
            <Button size="sm" variant="ghost" onClick={onEdit} className="h-7 w-7 p-0 rounded-lg">
              <Edit className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete} className="h-7 w-7 p-0 hover:text-destructive hover:bg-destructive/10 rounded-lg">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {renderItemData()}
        <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground/70">
          Updated {new Date(item.updatedAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};
