/**
 * TOTP (RFC 6238) implementation using Web Crypto API
 * No external dependencies required
 */

function base32Decode(encoded: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = encoded.replace(/[\s=-]/g, '').toUpperCase();
  
  let bits = '';
  for (const char of cleaned) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
  return new Uint8Array(signature);
}

function intToBytes(num: number): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = num & 0xff;
    num = Math.floor(num / 256);
  }
  return bytes;
}

export async function generateTOTP(secret: string, period = 30, digits = 6): Promise<string> {
  try {
    const key = base32Decode(secret);
    const time = Math.floor(Date.now() / 1000 / period);
    const timeBytes = intToBytes(time);
    
    const hmac = await hmacSha1(key, timeBytes);
    const offset = hmac[hmac.length - 1] & 0x0f;
    
    const code = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % Math.pow(10, digits);
    
    return code.toString().padStart(digits, '0');
  } catch (error) {
    console.error('TOTP generation failed:', error);
    return '------';
  }
}

export function getTimeRemaining(period = 30): number {
  return period - (Math.floor(Date.now() / 1000) % period);
}

export function isValidBase32(secret: string): boolean {
  const cleaned = secret.replace(/[\s=-]/g, '').toUpperCase();
  return /^[A-Z2-7]+$/.test(cleaned) && cleaned.length >= 16;
}
