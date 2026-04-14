import { toast } from 'sonner';

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
      toast.error('Biometric authentication is not supported on this device');
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
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
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
      const publicKey = this.arrayBufferToBase64url(response.attestationObject);

      const webAuthnCredential: WebAuthnCredential = {
        id: credential.id,
        publicKey,
        counter: 0,
        deviceName: this.getDeviceName(),
        createdAt: new Date(),
      };

      this.storeCredential(userId, webAuthnCredential);
      toast.success('Biometric authentication registered successfully');
      return webAuthnCredential;
    } catch (error) {
      console.error('WebAuthn registration error:', error);
      if (error instanceof Error && error.name === 'NotAllowedError') {
        return null;
      }
      toast.error(error instanceof Error ? error.message : 'Failed to register biometric authentication');
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
            id: this.base64urlToArrayBuffer(cred.id),
            type: "public-key" as const,
          })),
          userVerification: "required",
          timeout: 60000,
        },
      };

      const assertion = await navigator.credentials.get(credentialRequestOptions) as PublicKeyCredential;
      
      if (!assertion) return false;

      const credentialExists = credentials.some(cred => cred.id === assertion.id);
      
      if (credentialExists) {
        toast.success('Biometric authentication successful');
        return true;
      }

      return false;
    } catch (error) {
      console.error('WebAuthn authentication error:', error);
      
      if (error instanceof Error && error.name === 'NotAllowedError') {
        return false;
      }
      
      toast.error('Biometric authentication failed');
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

  private static getDeviceName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Linux')) return 'Linux Device';
    return 'Unknown Device';
  }

  /**
   * Convert ArrayBuffer to base64url string
   */
  private static arrayBufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Convert base64url string to ArrayBuffer (handles both base64url and base64)
   */
  private static base64urlToArrayBuffer(base64url: string): ArrayBuffer {
    // Convert base64url to base64
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
