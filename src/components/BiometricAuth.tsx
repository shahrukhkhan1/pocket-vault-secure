import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Fingerprint, Smartphone, Trash2, Plus } from "lucide-react";
import { WebAuthnService, WebAuthnCredential } from "@/services/webauthn";
import { toast } from "@/hooks/use-toast";

interface BiometricAuthProps {
  userId: string;
  userName: string;
  onBiometricLogin?: () => void;
  className?: string;
}

export const BiometricAuth = ({ userId, userName, onBiometricLogin, className }: BiometricAuthProps) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    checkSupport();
    loadCredentials();
  }, [userId]);

  const checkSupport = async () => {
    const supported = await WebAuthnService.isSupported();
    const platformAvailable = await WebAuthnService.isPlatformAuthenticatorAvailable();
    
    setIsSupported(supported);
    setIsPlatformAvailable(platformAvailable);
  };

  const loadCredentials = () => {
    const stored = WebAuthnService.getStoredCredentials(userId);
    setCredentials(stored);
  };

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      const credential = await WebAuthnService.registerCredential(userId, userName);
      if (credential) {
        setCredentials(prev => [...prev, credential]);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    try {
      const success = await WebAuthnService.authenticateWithBiometric(userId);
      if (success && onBiometricLogin) {
        onBiometricLogin();
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRemoveCredential = async (credentialId: string) => {
    WebAuthnService.removeCredential(userId, credentialId);
    setCredentials(prev => prev.filter(cred => cred.id !== credentialId));
    
    toast({
      title: "Credential Removed",
      description: "Biometric credential has been removed",
      variant: "default"
    });
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Biometric Authentication
          </CardTitle>
          <CardDescription>
            Biometric authentication is not supported on this device or browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Biometric Authentication
        </CardTitle>
        <CardDescription>
          {isPlatformAvailable 
            ? "Use your device's biometric authentication for secure, passwordless access."
            : "External authenticators available for secure access."
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {credentials.length === 0 ? (
          <div className="text-center py-6">
            <Fingerprint className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              No biometric credentials registered
            </p>
            <Button 
              onClick={handleRegister} 
              disabled={isRegistering}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isRegistering ? "Registering..." : "Register Biometric Authentication"}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Registered Devices</h4>
                <Badge variant="secondary">{credentials.length}</Badge>
              </div>
              
              {credentials.map((credential) => (
                <div key={credential.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{credential.deviceName}</p>
                      <p className="text-xs text-muted-foreground">
                        Registered on {credential.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCredential(credential.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-3">
              <Button 
                onClick={handleAuthenticate} 
                disabled={isAuthenticating}
                className="w-full"
                variant="default"
              >
                <Fingerprint className="h-4 w-4 mr-2" />
                {isAuthenticating ? "Authenticating..." : "Authenticate with Biometric"}
              </Button>
              
              <Button 
                onClick={handleRegister} 
                disabled={isRegistering}
                variant="outline"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isRegistering ? "Registering..." : "Add Another Device"}
              </Button>
            </div>
          </>
        )}

        {isPlatformAvailable && (
          <div className="text-xs text-muted-foreground text-center pt-2">
            This device supports {
              navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') ? 'Face ID / Touch ID' :
              navigator.userAgent.includes('Mac') ? 'Touch ID' :
              navigator.userAgent.includes('Windows') ? 'Windows Hello' :
              'biometric authentication'
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
};