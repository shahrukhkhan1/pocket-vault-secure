import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  X, Key, FileText, CreditCard, RefreshCw, Plus, Trash2,
  Eye, EyeOff, Upload, File, Download, Image as ImageIcon, Star, ShieldCheck
} from 'lucide-react';
import { VaultItem, PasswordData, NoteData, BankData, DocumentData, IndexedDBStorage } from '../services/indexedDBStorage';
import { CryptoService } from '@/services/crypto';
import { isValidBase32 } from '@/services/totp';
import { toast } from 'sonner';

interface VaultItemFormProps {
  item?: VaultItem | null;
  defaultType?: 'password' | 'note' | 'document' | 'bank';
  onSave: (item: VaultItem) => void;
  onCancel: () => void;
}

export const VaultItemForm = ({ item, defaultType = 'password', onSave, onCancel }: VaultItemFormProps) => {
  const [type, setType] = useState<'password' | 'note' | 'document' | 'bank'>(item?.type || defaultType);
  const [title, setTitle] = useState(item?.title || '');
  const [formData, setFormData] = useState<any>(item?.data || {});
  const [favorite, setFavorite] = useState(item?.favorite || false);
  const [itemTags, setItemTags] = useState<string[]>(item?.tags || []);
  const [noteTags, setNoteTags] = useState<string[]>((item?.data as NoteData)?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [newItemTag, setNewItemTag] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let processedData = { ...formData };

    if (type === 'note') {
      processedData.tags = noteTags;
    }

    if (type === 'document' && uploadedFile) {
      if (!IndexedDBStorage.validateFileSize(uploadedFile.size)) {
        toast.error('File size must be less than 2MB');
        return;
      }
      try {
        const fileData = await IndexedDBStorage.fileToBase64(uploadedFile);
        processedData = {
          fileName: uploadedFile.name,
          fileType: uploadedFile.type,
          fileSize: uploadedFile.size,
          fileData,
          notes: processedData.notes || ''
        };
      } catch {
        toast.error('Failed to process file');
        return;
      }
    }

    // Detect password change for age tracking
    const isPasswordChanged = type === 'password' && item?.data?.password !== processedData.password;

    const vaultItem: VaultItem = {
      id: item?.id || crypto.randomUUID(),
      type,
      title: title.trim(),
      createdAt: item?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: processedData,
      favorite,
      tags: itemTags,
      passwordChangedAt: isPasswordChanged
        ? new Date().toISOString()
        : (item?.passwordChangedAt || item?.createdAt || new Date().toISOString()),
    };

    onSave(vaultItem);
  };

  const generatePassword = () => {
    const password = CryptoService.generatePassword(16);
    setFormData({ ...formData, password });
  };

  const addNoteTag = () => {
    if (newTag.trim() && !noteTags.includes(newTag.trim())) {
      setNoteTags([...noteTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeNoteTag = (tagToRemove: string) => {
    setNoteTags(noteTags.filter(tag => tag !== tagToRemove));
  };

  const addItemTag = () => {
    if (newItemTag.trim() && !itemTags.includes(newItemTag.trim())) {
      setItemTags([...itemTags, newItemTag.trim()]);
      setNewItemTag('');
    }
  };

  const removeItemTag = (tagToRemove: string) => {
    setItemTags(itemTags.filter(tag => tag !== tagToRemove));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!IndexedDBStorage.validateFileSize(file.size)) {
        toast.error('File size must be less than 2MB');
        return;
      }
      setUploadedFile(file);
      if (!title) setTitle(file.name);
    }
  };

  const downloadFile = () => {
    if (formData.fileData && formData.fileName && formData.fileType) {
      const blob = IndexedDBStorage.base64ToBlob(formData.fileData, formData.fileType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = formData.fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const removeAttachment = () => {
    setFormData({ notes: formData.notes || '' });
    setUploadedFile(null);
  };

  const renderPasswordForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" value={formData.website || ''} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="example.com" className="bg-background/50" />
        </div>
        <div>
          <Label htmlFor="username">Username/Email</Label>
          <Input id="username" value={formData.username || ''} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="your@email.com" className="bg-background/50" />
        </div>
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input id="password" type={showPassword ? "text" : "password"} value={formData.password || ''} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Enter password" className="bg-background/50 pr-10" />
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-0 h-full px-3 hover:bg-transparent">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <Button type="button" variant="outline" onClick={generatePassword} className="px-3">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {/* TOTP Secret */}
      <div>
        <Label htmlFor="totpSecret" className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          2FA Secret (TOTP) — Optional
        </Label>
        <Input
          id="totpSecret"
          value={formData.totpSecret || ''}
          onChange={(e) => setFormData({ ...formData, totpSecret: e.target.value.replace(/\s/g, '').toUpperCase() })}
          placeholder="Paste your TOTP secret key (Base32)"
          className="bg-background/50 font-mono text-xs"
        />
        {formData.totpSecret && !isValidBase32(formData.totpSecret) && (
          <p className="text-xs text-destructive mt-1">Invalid Base32 secret. Check the key and try again.</p>
        )}
      </div>
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea id="notes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." className="bg-background/50 min-h-[80px]" />
      </div>
    </div>
  );

  const renderNoteForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="content">Content</Label>
        <Textarea id="content" value={formData.content || ''} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="Enter your secure note..." className="bg-background/50 min-h-[200px]" required />
      </div>
      <div>
        <Label>Note Tags</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add tag..." className="bg-background/50" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNoteTag())} />
            <Button type="button" variant="outline" onClick={addNoteTag}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {noteTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {noteTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                  <button type="button" onClick={() => removeNoteTag(tag)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDocumentForm = () => {
    const isImage = formData.fileType?.startsWith('image/');

    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="fileUpload">Document/Photo</Label>
          <div className="space-y-3">
            {!formData.fileName && !uploadedFile ? (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">Upload a document or photo (max 2MB)</p>
                <Button type="button" variant="outline" onClick={() => document.getElementById('fileInput')?.click()}>
                  Choose File
                </Button>
                <input id="fileInput" type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" />
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                {isImage && formData.fileData && (
                  <div className="bg-background/30">
                    <img src={`data:${formData.fileType};base64,${formData.fileData}`} alt={formData.fileName} className="w-full max-h-48 object-contain" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {isImage ? <ImageIcon className="w-5 h-5 text-blue-400 shrink-0" /> : <File className="w-5 h-5 text-primary shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{formData.fileName}</p>
                        <p className="text-sm text-muted-foreground">{(formData.fileSize / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button type="button" variant="outline" size="sm" onClick={downloadFile} title="Download">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('fileInput')?.click()} title="Replace">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={removeAttachment} className="hover:text-destructive hover:border-destructive/50" title="Remove">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <input id="fileInput" type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" />
              </div>
            )}
          </div>
        </div>
        <div>
          <Label htmlFor="docNotes">Notes (Optional)</Label>
          <Textarea id="docNotes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes about this document..." className="bg-background/50 min-h-[80px]" />
        </div>
      </div>
    );
  };

  const renderBankForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="accountName">Account Name</Label>
        <Input id="accountName" value={formData.accountName || ''} onChange={(e) => setFormData({ ...formData, accountName: e.target.value })} placeholder="My Checking Account" className="bg-background/50" required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="accountNumber">Account Number</Label>
          <Input id="accountNumber" value={formData.accountNumber || ''} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} placeholder="1234567890" className="bg-background/50" required />
        </div>
        <div>
          <Label htmlFor="routingNumber">Routing Number</Label>
          <Input id="routingNumber" value={formData.routingNumber || ''} onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })} placeholder="123456789" className="bg-background/50" />
        </div>
      </div>
      <div>
        <Label htmlFor="bankNotes">Notes (Optional)</Label>
        <Textarea id="bankNotes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional banking information..." className="bg-background/50 min-h-[80px]" />
      </div>
    </div>
  );

  const getTypeIcon = () => {
    switch (type) {
      case 'password': return Key;
      case 'note': return FileText;
      case 'document': return File;
      case 'bank': return CreditCard;
    }
  };

  const TypeIcon = getTypeIcon();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-slide-up" style={{ animationDuration: '0.25s' }}>
      <Card className="w-full max-w-2xl bg-gradient-card border-border shadow-float max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 text-primary rounded-xl">
                <TypeIcon className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>{item ? 'Edit Item' : 'Add New Item'}</CardTitle>
                <CardDescription>{item ? 'Update your secure information' : 'Add new information to your vault'}</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel} className="rounded-xl">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(value: 'password' | 'note' | 'document' | 'bank') => { setType(value); setFormData({}); setUploadedFile(null); }}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="password"><div className="flex items-center gap-2"><Key className="w-4 h-4" />Password</div></SelectItem>
                    <SelectItem value="note"><div className="flex items-center gap-2"><FileText className="w-4 h-4" />Secure Note</div></SelectItem>
                    <SelectItem value="document"><div className="flex items-center gap-2"><File className="w-4 h-4" />Document/Photo</div></SelectItem>
                    <SelectItem value="bank"><div className="flex items-center gap-2"><CreditCard className="w-4 h-4" />Banking</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter a descriptive title" className="bg-background/50" required />
              </div>
            </div>

            {/* Favorite toggle */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="favorite" checked={favorite} onCheckedChange={(c) => setFavorite(!!c)} />
                <Label htmlFor="favorite" className="flex items-center gap-1 cursor-pointer text-sm">
                  <Star className="w-3.5 h-3.5 text-secondary" /> Favorite
                </Label>
              </div>
            </div>

            {/* Item-level tags */}
            <div>
              <Label>Tags</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input value={newItemTag} onChange={(e) => setNewItemTag(e.target.value)} placeholder="Add tag (e.g. Work, Personal)..." className="bg-background/50" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItemTag())} />
                  <Button type="button" variant="outline" onClick={addItemTag} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {itemTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {itemTags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                        <button type="button" onClick={() => removeItemTag(tag)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {type === 'password' && renderPasswordForm()}
            {type === 'note' && renderNoteForm()}
            {type === 'document' && renderDocumentForm()}
            {type === 'bank' && renderBankForm()}

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-gradient-primary hover:shadow-secure transition-all duration-300">
                {item ? 'Update Item' : 'Save Item'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} className="px-6">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
