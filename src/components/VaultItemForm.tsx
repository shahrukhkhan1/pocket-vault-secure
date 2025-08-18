import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Key, 
  FileText, 
  CreditCard, 
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  File,
  Download
} from 'lucide-react';
import { VaultItem, PasswordData, NoteData, BankData, DocumentData, IndexedDBStorage } from '@/services/indexedDBStorage';
import { CryptoService } from '@/services/crypto';

interface VaultItemFormProps {
  item?: VaultItem | null;
  onSave: (item: VaultItem) => void;
  onCancel: () => void;
}

export const VaultItemForm = ({ item, onSave, onCancel }: VaultItemFormProps) => {
  const [type, setType] = useState<'password' | 'note' | 'document' | 'bank'>(
    item?.type || 'password'
  );
  const [title, setTitle] = useState(item?.title || '');
  const [formData, setFormData] = useState<any>(item?.data || {});
  const [tags, setTags] = useState<string[]>(
    (item?.data as NoteData)?.tags || []
  );
  const [newTag, setNewTag] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let processedData = { ...formData };
    
    // Add tags for notes
    if (type === 'note') {
      processedData.tags = tags;
    }
    
    // Handle file upload for documents
    if (type === 'document' && uploadedFile) {
      if (!IndexedDBStorage.validateFileSize(uploadedFile.size)) {
        alert('File size must be less than 2MB');
        return;
      }
      
      try {
        const fileData = await IndexedDBStorage.fileToBase64(uploadedFile);
        processedData = {
          fileName: uploadedFile.name,
          fileType: uploadedFile.type,
          fileSize: uploadedFile.size,
          fileData: fileData,
          notes: processedData.notes || ''
        };
      } catch (error) {
        alert('Failed to process file');
        return;
      }
    }

    const vaultItem: VaultItem = {
      id: item?.id || crypto.randomUUID(),
      type,
      title: title.trim(),
      createdAt: item?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: processedData
    };

    onSave(vaultItem);
  };

  const generatePassword = () => {
    const password = CryptoService.generatePassword(16);
    setFormData({ ...formData, password });
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!IndexedDBStorage.validateFileSize(file.size)) {
        alert('File size must be less than 2MB');
        return;
      }
      setUploadedFile(file);
      if (!title) {
        setTitle(file.name);
      }
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

  const renderPasswordForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={formData.website || ''}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="example.com"
            className="bg-background/50"
          />
        </div>
        <div>
          <Label htmlFor="username">Username/Email</Label>
          <Input
            id="username"
            value={formData.username || ''}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="your@email.com"
            className="bg-background/50"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="password">Password</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter password"
              className="bg-background/50 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={generatePassword}
            className="px-3"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes..."
          className="bg-background/50 min-h-[80px]"
        />
      </div>
    </div>
  );

  const renderNoteForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={formData.content || ''}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Enter your secure note..."
          className="bg-background/50 min-h-[200px]"
          required
        />
      </div>
      
      <div>
        <Label>Tags</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag..."
              className="bg-background/50"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button type="button" variant="outline" onClick={addTag}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDocumentForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="fileUpload">Document/Photo</Label>
        <div className="space-y-2">
          {!formData.fileName ? (
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Upload a document or photo (max 2MB)
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                Choose File
              </Button>
              <input
                id="fileInput"
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
            </div>
          ) : (
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{formData.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {(formData.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadFile}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('fileInput')?.click()}
                  >
                    Replace
                  </Button>
                </div>
              </div>
              <input
                id="fileInput"
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
            </div>
          )}
        </div>
      </div>
      
      <div>
        <Label htmlFor="docNotes">Notes (Optional)</Label>
        <Textarea
          id="docNotes"
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes about this document..."
          className="bg-background/50 min-h-[80px]"
        />
      </div>
    </div>
  );

  const renderBankForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="accountName">Account Name</Label>
        <Input
          id="accountName"
          value={formData.accountName || ''}
          onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
          placeholder="My Checking Account"
          className="bg-background/50"
          required
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="accountNumber">Account Number</Label>
          <Input
            id="accountNumber"
            value={formData.accountNumber || ''}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
            placeholder="1234567890"
            className="bg-background/50"
            required
          />
        </div>
        <div>
          <Label htmlFor="routingNumber">Routing Number</Label>
          <Input
            id="routingNumber"
            value={formData.routingNumber || ''}
            onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
            placeholder="123456789"
            className="bg-background/50"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="bankNotes">Notes (Optional)</Label>
        <Textarea
          id="bankNotes"
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional banking information..."
          className="bg-background/50 min-h-[80px]"
        />
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gradient-card border-border shadow-card max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 text-primary rounded-lg">
                <TypeIcon className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>
                  {item ? 'Edit Item' : 'Add New Item'}
                </CardTitle>
                <CardDescription>
                  {item ? 'Update your secure information' : 'Add new information to your vault'}
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={type}
                  onValueChange={(value: 'password' | 'note' | 'document' | 'bank') => {
                    setType(value);
                    setFormData({});
                    setUploadedFile(null);
                  }}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="password">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        Password
                      </div>
                    </SelectItem>
                    <SelectItem value="note">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Secure Note
                      </div>
                    </SelectItem>
                    <SelectItem value="document">
                      <div className="flex items-center gap-2">
                        <File className="w-4 h-4" />
                        Document/Photo
                      </div>
                    </SelectItem>
                    <SelectItem value="bank">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Banking
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a descriptive title"
                  className="bg-background/50"
                  required
                />
              </div>
            </div>

            {type === 'password' && renderPasswordForm()}
            {type === 'note' && renderNoteForm()}
            {type === 'document' && renderDocumentForm()}
            {type === 'bank' && renderBankForm()}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-gradient-primary hover:shadow-secure transition-spring"
              >
                {item ? 'Update Item' : 'Save Item'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-border"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};