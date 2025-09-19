import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Shield, Lock, Key, Cloud, Fingerprint } from "lucide-react";
import { IndexedDBStorage } from "@/services/indexedDBStorage";
import { WebAuthnService } from "@/services/webauthn";
import { BiometricAuth } from "./BiometricAuth";
import { toast } from "@/hooks/use-toast";

interface LoginFormProps {
  onLogin: (password: string, hint?: string) => void;
  onCloudAuth?: () => void;
}

export const LoginForm = ({ onLogin, onCloudAuth }: LoginFormProps) => {
  const [password, setPassword] = useState('');
  const [hint, setHint] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [vaultExists, setVaultExists] = useState(false);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [showBiometric, setShowBiometric] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    const checkVault = async () => {
      const hasVault = await IndexedDBStorage.hasVault();
      setVaultExists(hasVault);
      
      if (hasVault) {
        const hint = await IndexedDBStorage.getPasswordHint();
        setSavedHint(hint);
      }
    };
    
    const checkBiometric = async () => {
      const supported = await WebAuthnService.isPlatformAuthenticatorAvailable();
      setBiometricSupported(supported);
    };
    
    checkVault();
    checkBiometric();
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
          if (newAttempts >= 2) {
            const hint = await IndexedDBStorage.getPasswordHint();
            if (hint) {
              description = `Hint: ${hint}`;
            }
          }
          
          toast({
            title: "Invalid Password",
            description,
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
        setWrongAttempts(0); // Reset on successful login
      }
      
      onLogin(password, vaultExists ? undefined : hint);
    } catch (error) {
      console.error('Authentication error:', error);
      toast({
        title: "Authentication Failed",
        description: "Unable to verify your master password.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    // For demo purposes, we'll assume the user has previously stored their master password
    // In a real implementation, you'd use the biometric authentication to unlock a stored encrypted master password
    const demoPassword = localStorage.getItem('demo_master_password');
    if (demoPassword) {
      onLogin(demoPassword);
    } else {
      toast({
        title: "Setup Required",
        description: "Please log in with your master password first to enable biometric authentication",
        variant: "destructive"
      });
    }
  };
    if (confirm('Are you sure you want to delete all vault data? This cannot be undone!')) {
      try {
        await IndexedDBStorage.clearVault();
        setVaultExists(false);
        setSavedHint(null);
        setPassword('');
        setHint('');
        toast({
          title: "Vault Reset",
          description: "All vault data has been cleared. You can now create a new vault.",
          variant: "default",
          duration: 4000
        });
      } catch (error) {
        toast({
          title: "Reset Failed",
          description: "Failed to clear vault data",
          variant: "destructive"
        });
      }
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
          variant: "default",
          duration: 3000
        });
      }
    } catch (error) {
      // Fallback - copy to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link Copied",
          description: "App link copied to clipboard",
          variant: "default",
          duration: 3000
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
    <div className="min-h-screen bg-gradient-navy">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>

        {!vaultExists ? (
          <div className="space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-4 md:space-y-6 max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight">
                SecureVault
              </h1>
              <p className="text-base md:text-lg lg:text-xl xl:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
                Military-grade encryption meets beautiful design. Store passwords, documents, and sensitive data with complete privacy.
              </p>
            </div>

            {/* Create Vault Card - Prominently Placed */}
            <div className="max-w-lg mx-auto">
              <Card className="bg-gradient-card border-border shadow-secure">
                <CardHeader className="text-center space-y-3 pb-6">
                  <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">
                    Create Your Secure Vault
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    Choose a strong master password - this is the only key to your data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="password" className="text-sm font-medium text-foreground">
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
                          className="pl-10 pr-10 h-12 bg-input border-border focus:border-primary transition-smooth text-foreground"
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
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="hint" className="text-sm font-medium text-foreground">
                        Password Hint (Optional)
                      </Label>
                      <Input
                        id="hint"
                        type="text"
                        value={hint}
                        onChange={(e) => setHint(e.target.value)}
                        placeholder="Something to help you remember (e.g., pet + birth year)"
                        className="h-12 bg-input border-border focus:border-primary transition-smooth text-foreground"
                      />
                      <p className="text-xs text-muted-foreground">
                        This hint will be stored unencrypted to help you remember your password
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading || !password.trim()}
                      className="w-full h-12 bg-gradient-primary hover:shadow-secure transition-spring font-semibold text-lg"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                          Creating Vault...
                        </div>
                      ) : (
                        'Create Secure Vault'
                      )}
                    </Button>
                  </form>

                  {/* Security Info */}
                  <div className="mt-6 p-4 bg-accent/10 rounded-lg border border-accent/20">
                    <p className="text-xs text-muted-foreground text-center">
                      <strong className="text-accent">Critical:</strong> Your master password cannot be recovered. 
                      Make sure to remember it or store it safely.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
              <div className="bg-gradient-card border border-border rounded-xl p-4 md:p-6 text-center hover:shadow-secure transition-smooth">
                <ShieldCheck className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto mb-3 md:mb-4" />
                <h3 className="font-bold text-foreground mb-2 md:mb-3 text-base md:text-lg">Bank-Level Security</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">AES-256 encryption with PBKDF2 key derivation ensures your data stays protected</p>
              </div>
              <div className="bg-gradient-card border border-border rounded-xl p-4 md:p-6 text-center hover:shadow-secure transition-smooth">
                <Smartphone className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto mb-3 md:mb-4" />
                <h3 className="font-bold text-foreground mb-2 md:mb-3 text-base md:text-lg">Works Offline</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">PWA technology means it works anywhere, anytime - no internet required</p>
              </div>
              <div className="bg-gradient-card border border-border rounded-xl p-4 md:p-6 text-center hover:shadow-secure transition-smooth col-span-1 sm:col-span-2 lg:col-span-1">
                <Zap className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto mb-3 md:mb-4" />
                <h3 className="font-bold text-foreground mb-2 md:mb-3 text-base md:text-lg">Zero Knowledge</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">Your data never leaves your device - complete privacy guaranteed</p>
              </div>
            </div>

            {/* Feature Benefits */}
            <div className="bg-gradient-card border border-border rounded-xl p-8 max-w-2xl mx-auto">
              <h3 className="font-bold text-foreground mb-6 text-xl text-center">Everything You Need</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  'Unlimited password storage',
                  'Secure document & photo vault',
                  'Banking information storage',
                  'Auto-lock & clipboard protection',
                  'Export/Import backups',
                  'Works on all devices'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Tips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
              <div className="bg-gradient-card border border-border rounded-xl p-4 md:p-6">
                <h4 className="font-bold text-accent mb-3 text-base md:text-lg">✅ Password Tips</h4>
                <ul className="text-muted-foreground space-y-1.5 md:space-y-2 text-xs md:text-sm">
                  <li>• Use 12+ characters minimum</li>
                  <li>• Mix letters, numbers, symbols</li>
                  <li>• Make it memorable but unique</li>
                  <li>• Consider using a passphrase</li>
                </ul>
              </div>
              <div className="bg-gradient-card border border-border rounded-xl p-4 md:p-6">
                <h4 className="font-bold text-accent mb-3 text-base md:text-lg">🔒 Your Security</h4>
                <ul className="text-muted-foreground space-y-1.5 md:space-y-2 text-xs md:text-sm">
                  <li>• AES-256 military-grade encryption</li>
                  <li>• Zero-knowledge architecture</li>
                  <li>• Offline-first security model</li>
                  <li>• No data ever leaves your device</li>
                </ul>
              </div>
            </div>

            {/* Share Button */}
            <div className="text-center">
              <Button
                onClick={shareApp}
                variant="secondary"
                className="bg-gradient-secondary hover:shadow-secure transition-spring font-semibold px-8 py-3"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share with Friends
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Returning User Welcome */}
            <div className="text-center space-y-4 max-w-md mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Welcome Back</h1>
              <p className="text-muted-foreground">Enter your master password to unlock your secure vault</p>
            </div>

            {/* Login Card */}
            <Card className="bg-gradient-card border-border shadow-secure max-w-md mx-auto">
              <CardHeader className="text-center space-y-3">
                <CardTitle className="text-2xl font-bold text-foreground">
                  Unlock Your Vault
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your encrypted data is waiting for you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
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
                        className="pl-10 pr-10 h-12 bg-input border-border focus:border-primary transition-smooth text-foreground"
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
                      <p className="text-xs text-muted-foreground bg-accent/10 p-2 rounded border border-accent/20">
                        <strong className="text-accent">Hint:</strong> {savedHint}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-secondary/20 text-center">
                    <button
                      type="button"
                      onClick={handleResetVault}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Forgot password? Reset vault (deletes all data)
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !password.trim()}
                    className="w-full h-12 bg-gradient-primary hover:shadow-secure transition-spring font-semibold text-lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                        Unlocking Vault...
                      </div>
                    ) : (
                      'Unlock Secure Vault'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security Notice */}
        <div className="text-center text-xs text-muted-foreground max-w-md mx-auto">
          <p className="mb-1">🔒 All data is encrypted locally using AES-256 encryption</p>
          <p>🚫 No data is ever transmitted to external servers</p>
        </div>
      </div>
    </div>
  );
};