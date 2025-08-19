import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Key, 
  FileText, 
  CreditCard, 
  Edit, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff,
  ExternalLink
} from 'lucide-react';
import { VaultItem, PasswordData, NoteData, BankData } from '@/services/storage';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface VaultItemCardProps {
  item: VaultItem;
  onEdit: () => void;
  onDelete: () => void;
}

export const VaultItemCard = ({ item, onEdit, onDelete }: VaultItemCardProps) => {
  const [showSensitive, setShowSensitive] = useState(false);
  const { toast } = useToast();

  const getTypeIcon = () => {
    switch (item.type) {
      case 'password': return Key;
      case 'note': return FileText;
      case 'bank': return CreditCard;
      default: return FileText;
    }
  };

  const getTypeColor = () => {
    switch (item.type) {
      case 'password': return 'bg-primary/20 text-primary';
      case 'note': return 'bg-accent/20 text-accent';
      case 'bank': return 'bg-success/20 text-success';
      default: return 'bg-muted';
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
        variant: "default"
      });

      // Auto-clear clipboard after 20 seconds for sensitive data (passwords, account numbers)
      if (label.toLowerCase().includes('password') || label.toLowerCase().includes('account')) {
        setTimeout(async () => {
          try {
            await navigator.clipboard.writeText('');
          } catch (error) {
            // Ignore clipboard clear errors
          }
        }, 20000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
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
          <span className="text-sm font-mono">{data.website}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openWebsite(data.website)}
            className="h-6 w-6 p-0"
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Username</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono">{data.username}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyToClipboard(data.username, 'Username')}
            className="h-6 w-6 p-0"
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Password</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono">
            {showSensitive ? data.password : '••••••••'}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSensitive(!showSensitive)}
            className="h-6 w-6 p-0"
          >
            {showSensitive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyToClipboard(data.password, 'Password')}
            className="h-6 w-6 p-0"
          >
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
      <p className="text-sm text-foreground line-clamp-3">
        {data.content}
      </p>
      {data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  const renderBankData = (data: BankData) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Account</span>
        <span className="text-sm font-mono">{data.accountName}</span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Number</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono">
            {showSensitive ? data.accountNumber : '••••••••'}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSensitive(!showSensitive)}
            className="h-6 w-6 p-0"
          >
            {showSensitive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => copyToClipboard(data.accountNumber, 'Account Number')}
            className="h-6 w-6 p-0"
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {data.routingNumber && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Routing</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono">{data.routingNumber}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(data.routingNumber!, 'Routing Number')}
              className="h-6 w-6 p-0"
            >
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
      case 'password':
        return renderPasswordData(item.data as PasswordData);
      case 'note':
        return renderNoteData(item.data as NoteData);
      case 'bank':
        return renderBankData(item.data as BankData);
      default:
        return <p className="text-sm text-muted-foreground">No data available</p>;
    }
  };

  const TypeIcon = getTypeIcon();

  return (
    <Card className="bg-gradient-card border-border hover:shadow-card transition-smooth group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getTypeColor()}`}>
              <TypeIcon className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <CardDescription className="text-xs">
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </CardDescription>
            </div>
          </div>
          
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="h-7 w-7 p-0"
            >
              <Edit className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="h-7 w-7 p-0 hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {renderItemData()}
        
        <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
          Updated {new Date(item.updatedAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};