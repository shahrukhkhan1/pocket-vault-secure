import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Eye, EyeOff, Share2, Star, Check, Zap, ShieldCheck, Smartphone } from 'lucide-react';
import { IndexedDBStorage } from '@/services/indexedDBStorage';
import { useToast } from '@/hooks/use-toast';

interface LoginFormProps {
  onLogin: (password: string, hint?: string) => void;
}

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [password, setPassword] = useState('');
  const [hint, setHint] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [vaultExists, setVaultExists] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  useEffect(() => {
    const checkVault = async () => {
      const hasVault = await IndexedDBStorage.hasVault();
      setVaultExists(hasVault);
      
      if (hasVault) {
        const hint = await IndexedDBStorage.getPasswordHint();
        setSavedHint(hint);
      }
    };
    checkVault();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    try {
      if (vaultExists) {
        const isValid = await IndexedDBStorage.verifyMasterPassword(password);
        if (!isValid) {
          toast({
            title: "Invalid Password",
            description: "The master password you entered is incorrect.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      }
      
      onLogin(password, vaultExists ? undefined : hint);
    } catch (error) {
      toast({
        title: "Authentication Failed",
        description: "Unable to verify your master password.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const shareApp = async () => {
    const shareData = {
      title: 'SecureVault - Encrypted Password Manager',
      text: 'Check out SecureVault - a secure, offline password manager with military-grade encryption!',
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        toast({
          title: "Link Copied",
          description: "Share link copied to clipboard",
          variant: "default"
        });
      }
    } catch (error) {
      // Fallback - copy to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link Copied",
          description: "App link copied to clipboard",
          variant: "default"
        });
      } catch (clipError) {
        toast({
          title: "Share Failed",
          description: "Unable to share app",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-security p-4">
      <div className="w-full max-w-4xl space-y-8">
        {!vaultExists && (
          <>
            {/* Hero Section */}
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center shadow-glow">
                <Shield className="w-10 h-10 text-primary-foreground" />
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                  SecureVault
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Military-grade encryption meets beautiful design. Store passwords, documents, and sensitive data with complete privacy.
                </p>
              </div>
              
              {/* Features Grid */}
              <div className="grid md:grid-cols-3 gap-6 mt-12 mb-8">
                <div className="bg-gradient-card border border-border rounded-lg p-6 text-center">
                  <ShieldCheck className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">Bank-Level Security</h3>
                  <p className="text-sm text-muted-foreground">AES-256 encryption with PBKDF2 key derivation</p>
                </div>
                <div className="bg-gradient-card border border-border rounded-lg p-6 text-center">
                  <Smartphone className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">Works Offline</h3>
                  <p className="text-sm text-muted-foreground">PWA technology - works anywhere, anytime</p>
                </div>
                <div className="bg-gradient-card border border-border rounded-lg p-6 text-center">
                  <Zap className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">Zero Knowledge</h3>
                  <p className="text-sm text-muted-foreground">Data never leaves your device</p>
                </div>
              </div>

              {/* Features List */}
              <div className="bg-gradient-card border border-border rounded-lg p-6 max-w-md mx-auto">
                <h3 className="font-semibold text-foreground mb-4">What you get:</h3>
                <div className="space-y-3 text-left">
                  {[
                    'Unlimited password storage',
                    'Secure document & photo vault',
                    'Banking information storage',
                    'Auto-lock & clipboard protection',
                    'Export/Import backups',
                    'Works on all devices'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Share Button */}
              <Button
                onClick={shareApp}
                variant="outline"
                className="mt-4"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share with Friends
              </Button>
            </div>
          </>
        )}

        {vaultExists && (
          <div className="text-center space-y-4 max-w-md mx-auto">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center shadow-glow">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">SecureVault</h1>
              <p className="text-muted-foreground">Your personal encrypted storage</p>
            </div>
          </div>
        )}

        {/* Login Card */}
        <Card className="bg-gradient-card border-border shadow-card max-w-md mx-auto">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-center">
              {vaultExists ? 'Welcome Back' : 'Create Your Secure Vault'}
            </CardTitle>
            <CardDescription className="text-center">
              {vaultExists 
                ? 'Enter your master password to unlock your vault'
                : 'Choose a strong master password - this is the only key to your data'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Master Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your master password"
                    className="pl-10 pr-10 bg-background/50 border-border focus:border-primary transition-smooth"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {savedHint && (
                  <p className="text-xs text-muted-foreground">
                    <strong>Hint:</strong> {savedHint}
                  </p>
                )}
              </div>

              {!vaultExists && (
                <div className="space-y-2">
                  <Label htmlFor="hint" className="text-sm font-medium">
                    Password Hint (Optional)
                  </Label>
                  <Input
                    id="hint"
                    type="text"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="Something to help you remember (e.g., pet + birth year)"
                    className="bg-background/50 border-border focus:border-primary transition-smooth"
                  />
                  <p className="text-xs text-muted-foreground">
                    This hint will be stored unencrypted to help you remember your password
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !password.trim()}
                className="w-full bg-gradient-primary hover:shadow-secure transition-spring font-medium"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                    {vaultExists ? 'Unlocking...' : 'Creating...'}
                  </div>
                ) : (
                  vaultExists ? 'Unlock Vault' : 'Create Vault'
                )}
              </Button>
            </form>

            {!vaultExists && (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-xs text-muted-foreground">
                    <strong>Critical:</strong> Your master password cannot be recovered. 
                    Make sure to remember it or store it safely.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-gradient-card border border-border rounded p-3">
                    <h4 className="font-medium text-foreground mb-1">✅ Password Tips</h4>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Use 12+ characters</li>
                      <li>• Mix letters, numbers, symbols</li>
                      <li>• Make it memorable to you</li>
                    </ul>
                  </div>
                  <div className="bg-gradient-card border border-border rounded p-3">
                    <h4 className="font-medium text-foreground mb-1">🔒 Security</h4>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• AES-256 encryption</li>
                      <li>• Zero-knowledge design</li>
                      <li>• Offline-first security</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center text-xs text-muted-foreground">
          <p>All data is encrypted locally on your device using AES-256 encryption.</p>
          <p>No data is transmitted to external servers.</p>
        </div>
      </div>
    </div>
  );
};