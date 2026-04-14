import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createShareLink, getExpiryLabel } from '@/services/secureShare';
import { Copy, Link, Lock, Clock, Shield } from 'lucide-react';
import { ClipboardManager } from '@/services/clipboardManager';
import { toast } from 'sonner';

interface SecureShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemData: Record<string, any>;
  itemTitle: string;
}

export const SecureShareDialog = ({ open, onOpenChange, itemData, itemTitle }: SecureShareDialogProps) => {
  const [expiresIn, setExpiresIn] = useState<'1h' | '24h' | '7d'>('24h');
  const [pin, setPin] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const link = await createShareLink(itemData, { expiresIn, pin: pin || undefined });
      setGeneratedLink(link);
    } catch {
      toast.error('Failed to generate share link');
    }
    setIsGenerating(false);
  };

  const handleCopy = () => {
    ClipboardManager.secureCopy(generatedLink, 'Share link');
  };

  const handleClose = () => {
    setGeneratedLink('');
    setPin('');
    setExpiresIn('24h');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Share "{itemTitle}"
          </DialogTitle>
          <DialogDescription>
            Generate an encrypted, self-destructing link
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4 py-2">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" /> Expires after
              </Label>
              <Select value={expiresIn} onValueChange={(v: '1h' | '24h' | '7d') => setExpiresIn(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="24h">24 hours</SelectItem>
                  <SelectItem value="7d">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4" /> PIN protection (optional)
              </Label>
              <Input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Add a PIN for extra security"
                className="bg-background/50"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-2">Share this link:</p>
              <div className="flex gap-2">
                <Input value={generatedLink} readOnly className="bg-background/50 text-xs font-mono" />
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Expires in {getExpiryLabel(expiresIn)}</p>
              <p>• Encrypted end-to-end — key is in the URL</p>
              {pin && <p>• PIN protected — share the PIN separately</p>}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Close</Button>
          {!generatedLink && (
            <Button onClick={handleGenerate} disabled={isGenerating} className="bg-gradient-primary">
              <Link className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Link'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
