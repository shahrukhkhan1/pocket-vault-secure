/**
 * HaveIBeenPwned k-anonymity breach check
 * Only the first 5 chars of the SHA-1 hash are sent to the API
 */

async function sha1(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export interface BreachResult {
  breached: boolean;
  count: number;
  error?: string;
}

export async function checkPasswordBreach(password: string): Promise<BreachResult> {
  try {
    const hash = await sha1(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' }
    });

    if (!response.ok) {
      return { breached: false, count: 0, error: 'API unavailable' };
    }

    const text = await response.text();
    const lines = text.split('\n');
    
    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        const count = parseInt(countStr.trim(), 10);
        return { breached: count > 0, count };
      }
    }

    return { breached: false, count: 0 };
  } catch {
    return { breached: false, count: 0, error: 'Network error — check skipped' };
  }
}

export async function checkEmailBreach(email: string): Promise<{ breached: boolean; breaches: string[]; error?: string }> {
  // Note: The HIBP email API requires an API key, so this is a placeholder
  // For now, we just check the password breach endpoint which is free
  return { breached: false, breaches: [], error: 'Email breach check requires API key' };
}
