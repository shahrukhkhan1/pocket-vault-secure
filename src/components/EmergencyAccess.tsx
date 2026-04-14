import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CryptoService } from '@/services/crypto';
import { IndexedDBStorage } from '@/services/indexedDBStorage';
import { ShieldAlert, Download, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface EmergencyAccessProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterPassword: string;
}

export const EmergencyAccess = ({ open, onOpenChange, masterPassword }: EmergencyAccessProps) => {
  const [emergencyPassword, setEmergencyPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!emergencyPassword || emergencyPassword.length < 8) {
      toast.error('Emergency password must be at least 8 characters');
      return;
    }
    if (emergencyPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsGenerating(true);
    try {
      const items = await IndexedDBStorage.loadVault(masterPassword);
      const exportData = JSON.stringify({
        version: '1.0',
        type: 'emergency_kit',
        exported: new Date().toISOString(),
        encrypted: true,
        data: items,
      });

      const encrypted = await CryptoService.encrypt(exportData, emergencyPassword);
      const kit = JSON.stringify({
        type: 'securevault_emergency_kit',
        version: '1.0',
        created: new Date().toISOString(),
        data: encrypted,
        instructions: 'To restore: Open SecureVault → Import Backup → Select this file → Enter the emergency password set by the vault owner.',
      }, null, 2);

      const blob = new Blob([kit], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `securevault-emergency-kit-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Emergency kit downloaded. Store it safely and share the emergency password with your trusted contact.');
      onOpenChange(false);
      setEmergencyPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Failed to generate emergency kit');
    }
    setIsGenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-secondary" />
            Emergency Access Kit
          </DialogTitle>
          <DialogDescription>
            Create an encrypted backup with a separate password for a trusted person
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">How it works:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Set a separate emergency password below</li>
              <li>Download the encrypted emergency kit</li>
              <li>Give the file to your trusted contact</li>
              <li>Share the emergency password separately (verbally or written)</li>
            </ol>
          </div>

          <div>
            <Label>Emergency Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={emergencyPassword}
                onChange={e => setEmergencyPassword(e.target.value)}
                placeholder="Set a strong emergency password"
                className="bg-background/50 pr-10"
              />
              <Button
                type="button" variant="ghost" size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-0 h-full px-3"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label>Confirm Emergency Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm the password"
              className="bg-background/50"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className="bg-gradient-primary">
            <Download className="w-4 h-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Download Emergency Kit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
