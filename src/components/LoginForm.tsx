import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { StorageService } from '@/services/storage';
import { useToast } from '@/hooks/use-toast';

interface LoginFormProps {
  onLogin: (password: string) => void;
}

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const hasExistingVault = StorageService.hasVault();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    try {
      if (hasExistingVault) {
        const isValid = await StorageService.verifyMasterPassword(password);
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
      
      onLogin(password);
    } catch (error) {
      toast({
        title: "Authentication Failed",
        description: "Unable to verify your master password.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-security p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center shadow-glow">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">SecureVault</h1>
            <p className="text-muted-foreground">Your personal encrypted storage</p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-center">
              {hasExistingVault ? 'Welcome Back' : 'Create Vault'}
            </CardTitle>
            <CardDescription className="text-center">
              {hasExistingVault 
                ? 'Enter your master password to unlock your vault'
                : 'Set a strong master password to create your secure vault'
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
              </div>

              <Button
                type="submit"
                disabled={isLoading || !password.trim()}
                className="w-full bg-gradient-primary hover:shadow-secure transition-spring font-medium"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                    {hasExistingVault ? 'Unlocking...' : 'Creating...'}
                  </div>
                ) : (
                  hasExistingVault ? 'Unlock Vault' : 'Create Vault'
                )}
              </Button>
            </form>

            {!hasExistingVault && (
              <div className="mt-4 p-3 bg-accent/10 rounded-lg border border-accent/20">
                <p className="text-xs text-muted-foreground">
                  <strong>Important:</strong> Your master password cannot be recovered. 
                  Make sure to remember it or store it safely.
                </p>
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