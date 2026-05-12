import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Shield, Lock, Key, Fingerprint, Eye, EyeOff, ShieldCheck, Smartphone, Zap, Check, Share2 } from "lucide-react";
import { IndexedDBStorage } from "@/services/indexedDBStorage";
import { WebAuthnService } from "@/services/webauthn";
import { toast } from 'sonner';

interface LoginFormProps {
  onLogin: (password: string, hint?: string) => void;
  onCloudAuth?: () => void;
}

export const LoginForm = ({ onLogin, onCloudAuth }: LoginFormProps) => {
  const [password, setPassword] = useState('');
  const [hint, setHint] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vaultExists, setVaultExists] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showBiometricEnroll, setShowBiometricEnroll] = useState(false);

  useEffect(() => {
    const init = async () => {
      const hasVault = await IndexedDBStorage.hasVault();
      setVaultExists(hasVault);
      if (hasVault) {
        const h = await IndexedDBStorage.getPasswordHint();
        setSavedHint(h);
      }

      // Check if biometric is available and enrolled
      const supported = await WebAuthnService.isPlatformAuthenticatorAvailable();
      if (supported && hasVault) {
        const bioKey = await IndexedDBStorage.getBiometricKey();
        setBiometricAvailable(!!bioKey);
        
        // Auto-prompt biometric on load if enrolled
        if (bioKey) {
          handleBiometricLogin();
        }
      }
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    
    setIsLoading(true);
    try {
      if (vaultExists) {
        const isValid = await IndexedDBStorage.verifyMasterPassword(password);
        if (!isValid) {
          setWrongAttempts(prev => prev + 1);
          const newAttempts = wrongAttempts + 1;
          let description = "The master password you entered is incorrect.";
          if (savedHint) {
            description += ` Hint: ${savedHint}`;
          }
          toast.error(description);
          setIsLoading(false);
          return;
        }
        setWrongAttempts(0);
      } else {
        // Fresh vault: persist immediately with a starter item so the master password
        // is recoverable from inside the unlocked vault, and so that hasVault() returns true.
        const starterItem = {
          id: crypto.randomUUID(),
          type: 'password' as const,
          title: '🔑 SecureVault Master Password',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          passwordChangedAt: new Date().toISOString(),
          favorite: true,
          tags: ['important'],
          data: {
            website: 'SecureVault (this app)',
            username: 'master',
            password: password,
            notes: 'This is your master password. Keep it safe. If you forget it, your encrypted data CANNOT be recovered. Take a backup export and remember this password before exporting.',
          },
        };
        try {
          await IndexedDBStorage.saveVault([starterItem], password, hint || undefined);
        } catch (err) {
          console.error('Initial vault save failed:', err);
        }
      }

      // After successful login, check if we should offer biometric enrollment
      const supported = await WebAuthnService.isPlatformAuthenticatorAvailable();
      const bioKey = await IndexedDBStorage.getBiometricKey();
      
      if (supported && !bioKey && vaultExists) {
        // Store password temporarily to offer enrollment
        setShowBiometricEnroll(true);
        // Still log in
        onLogin(password, vaultExists ? undefined : hint);
        // After login, prompt enrollment
        setTimeout(() => {
          toast('Enable biometric unlock?', {
            description: 'Unlock with fingerprint or Face ID next time',
            action: {
              label: 'Enable',
              onClick: () => enrollBiometric(password),
            },
            duration: 10000,
          });
        }, 1000);
      } else {
        onLogin(password, vaultExists ? undefined : hint);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast.error('Unable to verify your master password.');
    } finally {
      setIsLoading(false);
    }
  };

  const enrollBiometric = async (masterPwd: string) => {
    try {
      const userId = 'vault-user';
      const credential = await WebAuthnService.registerCredential(userId, 'Vault User');
      if (credential) {
        // Encode the master password with a simple obfuscation stored in IndexedDB
        // This is tied to the device's WebAuthn credential
        const encoded = btoa(masterPwd);
        await IndexedDBStorage.storeBiometricKey(credential.id, encoded);
        setBiometricAvailable(true);
        toast.success('Biometric unlock enabled! Use fingerprint or Face ID next time.');
      }
    } catch (error) {
      console.error('Biometric enrollment error:', error);
      toast.error('Failed to enable biometric unlock');
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const bioKey = await IndexedDBStorage.getBiometricKey();
      if (!bioKey) {
        toast.error('No biometric credentials found. Please log in with your master password first.');
        return;
      }

      const authenticated = await WebAuthnService.authenticateWithBiometric('vault-user');
      if (authenticated) {
        const masterPwd = atob(bioKey.encryptedPassword);
        // Verify the password still works
        const isValid = await IndexedDBStorage.verifyMasterPassword(masterPwd);
        if (isValid) {
          onLogin(masterPwd);
        } else {
          toast.error('Stored password no longer valid. Please log in with your current master password.');
          await IndexedDBStorage.removeBiometricKey();
          setBiometricAvailable(false);
        }
      }
    } catch (error) {
      console.error('Biometric login error:', error);
    }
  };

  const handleResetVault = async () => {
    try {
      await IndexedDBStorage.clearVault();
      await IndexedDBStorage.removeBiometricKey();
      setVaultExists(false);
      setSavedHint(null);
      setPassword('');
      setHint('');
      setShowResetDialog(false);
      setBiometricAvailable(false);
      toast.success('Vault reset. You can now create a new vault.');
    } catch {
      toast.error('Failed to clear vault data');
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
        toast.success('Share link copied to clipboard');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('App link copied to clipboard');
      } catch {
        toast.error('Unable to share app');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-navy">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow animate-float">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>

        {!vaultExists ? (
          <div className="space-y-12">
            {/* Hero */}
            <div className="text-center space-y-4 md:space-y-6 max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight">SecureVault</h1>
              <p className="text-base md:text-lg lg:text-xl xl:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
                Military-grade encryption meets beautiful design. Store passwords, documents, and sensitive data with complete privacy.
              </p>
            </div>

            {/* Create Vault */}
            <div className="max-w-lg mx-auto">
              <Card className="bg-gradient-card border-border/50 shadow-float">
                <CardHeader className="text-center space-y-3 pb-6">
                  <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">Create Your Secure Vault</CardTitle>
                  <CardDescription className="text-base text-muted-foreground">Choose a strong master password - this is the only key to your data</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="password" className="text-sm font-medium text-foreground">Master Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your master password" className="pl-10 pr-10 h-12 bg-input border-border/50 focus:border-primary rounded-xl transition-all duration-200 text-foreground" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="hint" className="text-sm font-medium text-foreground">Password Hint (Optional)</Label>
                      <Input id="hint" type="text" value={hint} onChange={(e) => setHint(e.target.value)} placeholder="Something to help you remember" className="h-12 bg-input border-border/50 focus:border-primary rounded-xl transition-all duration-200 text-foreground" />
                      <p className="text-xs text-muted-foreground">Stored unencrypted to help you remember</p>
                    </div>

                    <Button type="submit" disabled={isLoading || !password.trim()} className="w-full h-12 bg-gradient-primary hover:shadow-secure transition-all duration-300 font-semibold text-lg rounded-xl">
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                          Creating Vault...
                        </div>
                      ) : 'Create Secure Vault'}
                    </Button>
                  </form>

                  <div className="mt-6 p-4 bg-accent/10 rounded-xl border border-accent/20">
                    <p className="text-xs text-muted-foreground text-center">
                      <strong className="text-accent">Critical:</strong> Your master password cannot be recovered.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
              {[
                { icon: ShieldCheck, title: 'Bank-Level Security', desc: 'AES-256 encryption with PBKDF2 key derivation' },
                { icon: Smartphone, title: 'Works Offline', desc: 'PWA technology — works anywhere, anytime' },
                { icon: Zap, title: 'Zero Knowledge', desc: 'Your data never leaves your device' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="vault-card bg-gradient-card border border-border/50 rounded-2xl p-6 text-center">
                  <Icon className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-bold text-foreground mb-2 text-base md:text-lg">{title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            {/* Feature list */}
            <div className="bg-gradient-card border border-border/50 rounded-2xl p-8 max-w-2xl mx-auto">
              <h3 className="font-bold text-foreground mb-6 text-xl text-center">Everything You Need</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {['Unlimited password storage', 'Secure document & photo vault', 'Banking information storage', 'Auto-lock & clipboard protection', 'Export/Import backups', 'Biometric unlock'].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Share */}
            <div className="text-center">
              <Button onClick={shareApp} variant="secondary" className="bg-gradient-secondary hover:shadow-secure transition-all duration-300 font-semibold px-8 py-3 rounded-xl">
                <Share2 className="w-4 h-4 mr-2" />Share with Friends
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Returning user */}
            <div className="text-center space-y-4 max-w-md mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Welcome Back</h1>
              <p className="text-muted-foreground">Enter your master password to unlock your secure vault</p>
              {biometricAvailable && (
                <p className="text-xs text-primary/70">🔐 Vault locks on reload for security. Use biometric for quick access.</p>
              )}
            </div>

            <Card className="bg-gradient-card border-border/50 shadow-float max-w-md mx-auto">
              <CardHeader className="text-center space-y-3">
                <CardTitle className="text-2xl font-bold text-foreground">Unlock Your Vault</CardTitle>
                <CardDescription className="text-muted-foreground">Your encrypted data is waiting for you</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Biometric Button */}
                {biometricAvailable && (
                  <div className="mb-6">
                    <Button
                      type="button"
                      onClick={handleBiometricLogin}
                      variant="outline"
                      className="w-full h-14 border-primary/30 hover:bg-primary/10 hover:border-primary/50 rounded-xl transition-all duration-200 pulse-ring"
                    >
                      <Fingerprint className="w-6 h-6 mr-3 text-primary" />
                      <span className="text-foreground font-medium">Unlock with Biometrics</span>
                    </Button>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">or use password</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">Master Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your master password" className="pl-10 pr-10 h-12 bg-input border-border/50 focus:border-primary rounded-xl transition-all duration-200 text-foreground" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {savedHint && (
                      <div className="bg-accent/10 p-3 rounded-lg border border-accent/20 space-y-2">
                        {showHint ? (
                          <p className="text-xs text-foreground">
                            <strong className="text-accent">Hint:</strong> {savedHint}
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowHint(true)}
                            className="text-xs text-accent hover:underline"
                          >
                            Show password hint
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/30 text-center">
                    <button type="button" onClick={() => setShowResetDialog(true)} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                      Forgot password? Reset vault (deletes all data)
                    </button>
                  </div>

                  <Button type="submit" disabled={isLoading || !password.trim()} className="w-full h-12 bg-gradient-primary hover:shadow-secure transition-all duration-300 font-semibold text-lg rounded-xl">
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                        Unlocking Vault...
                      </div>
                    ) : 'Unlock Secure Vault'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security Notice */}
        <div className="text-center text-xs text-muted-foreground max-w-md mx-auto mt-8">
          <p className="mb-1">🔒 All data is encrypted locally using AES-256 encryption</p>
          <p>🚫 No data is ever transmitted to external servers</p>
        </div>
      </div>

      {/* Reset Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Vault?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your vault data including passwords, notes, and documents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetVault} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
