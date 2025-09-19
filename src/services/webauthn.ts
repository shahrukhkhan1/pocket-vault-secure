import { toast } from "@/hooks/use-toast";

export interface WebAuthnCredential {
  id: string;
  publicKey: string;
  counter: number;
  deviceName: string;
  createdAt: Date;
}

export class WebAuthnService {
  private static readonly RP_NAME = "Secure Vault";
  private static readonly RP_ID = window.location.hostname;

  static async isSupported(): Promise<boolean> {
    return !!(
      window.PublicKeyCredential &&
      window.navigator.credentials &&
      window.navigator.credentials.create &&
      window.navigator.credentials.get &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    );
  }

  static async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!await this.isSupported()) return false;
    
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  static async registerCredential(userId: string, userName: string): Promise<WebAuthnCredential | null> {
    if (!await this.isSupported()) {
      toast({
        title: "Not Supported",
        description: "Biometric authentication is not supported on this device",
        variant: "destructive"
      });
      return null;
    }

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credentialCreationOptions: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: {
            name: this.RP_NAME,
            id: this.RP_ID,
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: userName,
            displayName: userName,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60000,
          attestation: "direct",
        },
      };

      const credential = await navigator.credentials.create(credentialCreationOptions) as PublicKeyCredential;
      
      if (!credential) {
        throw new Error("Failed to create credential");
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKey = await this.exportPublicKey(response);

      const webAuthnCredential: WebAuthnCredential = {
        id: credential.id,
        publicKey,
        counter: 0,
        deviceName: await this.getDeviceName(),
        createdAt: new Date(),
      };

      // Store credential locally
      this.storeCredential(userId, webAuthnCredential);

      toast({
        title: "Success",
        description: "Biometric authentication registered successfully",
        variant: "default"
      });

      return webAuthnCredential;
    } catch (error) {
      console.error('WebAuthn registration error:', error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Failed to register biometric authentication",
        variant: "destructive"
      });
      return null;
    }
  }

  static async authenticateWithBiometric(userId: string): Promise<boolean> {
    if (!await this.isSupported()) return false;

    try {
      const credentials = this.getStoredCredentials(userId);
      if (credentials.length === 0) return false;

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credentialRequestOptions: CredentialRequestOptions = {
        publicKey: {
          challenge,
          allowCredentials: credentials.map(cred => ({
            id: this.base64ToArrayBuffer(cred.id),
            type: "public-key",
          })),
          userVerification: "required",
          timeout: 60000,
        },
      };

      const assertion = await navigator.credentials.get(credentialRequestOptions) as PublicKeyCredential;
      
      if (!assertion) return false;

      // In a real implementation, you would verify the assertion on the server
      // For this demo, we'll just check if we have the credential stored
      const credentialExists = credentials.some(cred => cred.id === assertion.id);
      
      if (credentialExists) {
        toast({
          title: "Authentication Success",
          description: "Biometric authentication successful",
          variant: "default"
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('WebAuthn authentication error:', error);
      
      // Handle user cancellation gracefully
      if (error instanceof Error && error.name === 'NotAllowedError') {
        return false; // User cancelled, don't show error toast
      }
      
      toast({
        title: "Authentication Failed",
        description: "Biometric authentication failed",
        variant: "destructive"
      });
      return false;
    }
  }

  static getStoredCredentials(userId: string): WebAuthnCredential[] {
    try {
      const stored = localStorage.getItem(`webauthn_credentials_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static storeCredential(userId: string, credential: WebAuthnCredential): void {
    try {
      const existing = this.getStoredCredentials(userId);
      const updated = [...existing, credential];
      localStorage.setItem(`webauthn_credentials_${userId}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to store WebAuthn credential:', error);
    }
  }

  static removeCredential(userId: string, credentialId: string): void {
    try {
      const existing = this.getStoredCredentials(userId);
      const updated = existing.filter(cred => cred.id !== credentialId);
      localStorage.setItem(`webauthn_credentials_${userId}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to remove WebAuthn credential:', error);
    }
  }

  private static async exportPublicKey(response: AuthenticatorAttestationResponse): Promise<string> {
    // Extract public key from attestation response
    // In a real implementation, you would parse the CBOR attestation object
    // For this demo, we'll use a simplified approach
    return btoa(String.fromCharCode(...new Uint8Array(response.publicKey!)));
  }

  private static async getDeviceName(): Promise<string> {
    // Try to get a meaningful device name
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Linux')) return 'Linux Device';
    
    return 'Unknown Device';
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}