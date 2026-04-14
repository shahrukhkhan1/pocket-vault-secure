/**
 * Secure one-time sharing using URL fragments
 * The encryption key never leaves the client (stored in URL hash, not sent to server)
 */

import { CryptoService } from './crypto';

export interface ShareOptions {
  expiresIn: '1h' | '24h' | '7d';
  pin?: string;
}

interface SharePayload {
  data: string;
  expiresAt: number;
  hasPin: boolean;
}

function getExpiryMs(expiresIn: string): number {
  switch (expiresIn) {
    case '1h': return 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

export async function createShareLink(
  itemData: Record<string, any>,
  options: ShareOptions
): Promise<string> {
  const payload: SharePayload = {
    data: JSON.stringify(itemData),
    expiresAt: Date.now() + getExpiryMs(options.expiresIn),
    hasPin: !!options.pin,
  };

  // Generate a random key for encryption
  const shareKey = CryptoService.generatePassword(32);
  const encryptPassword = options.pin ? `${shareKey}:${options.pin}` : shareKey;
  
  const encrypted = await CryptoService.encrypt(JSON.stringify(payload), encryptPassword);
  const encodedData = btoa(JSON.stringify(encrypted));
  
  // Key goes in the URL fragment (never sent to server)
  const baseUrl = window.location.origin;
  return `${baseUrl}/share#${shareKey}|${encodedData}`;
}

export async function decryptShareLink(
  fragment: string,
  pin?: string
): Promise<{ data: Record<string, any>; expired: boolean } | null> {
  try {
    const [shareKey, encodedData] = fragment.split('|');
    if (!shareKey || !encodedData) return null;

    const encrypted = JSON.parse(atob(encodedData));
    const decryptPassword = pin ? `${shareKey}:${pin}` : shareKey;
    
    const decrypted = await CryptoService.decrypt(encrypted, decryptPassword);
    const payload: SharePayload = JSON.parse(decrypted);

    if (Date.now() > payload.expiresAt) {
      return { data: JSON.parse(payload.data), expired: true };
    }

    return { data: JSON.parse(payload.data), expired: false };
  } catch {
    return null;
  }
}

export function getExpiryLabel(expiresIn: string): string {
  switch (expiresIn) {
    case '1h': return '1 hour';
    case '24h': return '24 hours';
    case '7d': return '7 days';
    default: return expiresIn;
  }
}
