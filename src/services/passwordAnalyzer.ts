export interface PasswordStrength {
  score: number; // 0-100
  level: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
  timeTocrack: string;
}

export interface PasswordHealth {
  weak: number;
  reused: number;
  old: number;
  compromised: number;
  total: number;
  score: number;
}

export interface BreachCheckResult {
  isCompromised: boolean;
  breachCount: number;
  lastChecked: Date;
}

export class PasswordAnalyzer {
  private static readonly COMMON_PASSWORDS = new Set([
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'dragon',
    'master', 'hello', 'login', 'pass', 'admin123', 'administrator'
  ]);

  static analyzePassword(password: string): PasswordStrength {
    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 12) {
      score += 25;
    } else if (password.length >= 8) {
      score += 15;
    } else {
      feedback.push('Use at least 8 characters (12+ recommended)');
    }

    // Character variety
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    let varietyScore = 0;
    if (hasLower) varietyScore += 5;
    if (hasUpper) varietyScore += 5;
    if (hasNumber) varietyScore += 5;
    if (hasSymbol) varietyScore += 10;

    score += varietyScore;

    if (!hasLower || !hasUpper) feedback.push('Include both uppercase and lowercase letters');
    if (!hasNumber) feedback.push('Include at least one number');
    if (!hasSymbol) feedback.push('Include special characters (!@#$%^&*)');

    // Patterns and predictability
    if (this.hasRepeatingChars(password)) {
      score -= 10;
      feedback.push('Avoid repeating characters');
    }

    if (this.hasSequentialChars(password)) {
      score -= 10;
      feedback.push('Avoid sequential characters (abc, 123)');
    }

    if (this.COMMON_PASSWORDS.has(password.toLowerCase())) {
      score -= 30;
      feedback.push('This is a commonly used password');
    }

    if (this.hasKeyboardPatterns(password)) {
      score -= 15;
      feedback.push('Avoid keyboard patterns (qwerty, asdf)');
    }

    // Entropy bonus for longer passwords
    if (password.length >= 16) score += 10;
    if (password.length >= 20) score += 10;

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    const level = this.getStrengthLevel(score);
    const timeTocrack = this.estimateTimeTocrack(password, score);

    if (score >= 80 && feedback.length === 0) {
      feedback.push('Excellent password strength!');
    }

    return {
      score,
      level,
      feedback,
      timeTocrack
    };
  }

  static async checkBreaches(password: string): Promise<BreachCheckResult> {
    try {
      // Hash the password using SHA-1 (HaveIBeenPwned uses SHA-1)
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      // Use k-anonymity: send only first 5 characters of hash
      const prefix = hashHex.substring(0, 5);
      const suffix = hashHex.substring(5);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      
      if (!response.ok) {
        throw new Error('Breach check service unavailable');
      }

      const text = await response.text();
      const lines = text.split('\n');
      
      for (const line of lines) {
        const [hashSuffix, count] = line.split(':');
        if (hashSuffix === suffix) {
          return {
            isCompromised: true,
            breachCount: parseInt(count, 10),
            lastChecked: new Date()
          };
        }
      }

      return {
        isCompromised: false,
        breachCount: 0,
        lastChecked: new Date()
      };
    } catch (error) {
      console.error('Breach check failed:', error);
      return {
        isCompromised: false,
        breachCount: 0,
        lastChecked: new Date()
      };
    }
  }

  static analyzeVaultHealth(passwords: { password: string; createdAt: Date; title: string }[]): PasswordHealth {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    
    let weak = 0;
    let old = 0;
    let compromised = 0;
    
    const passwordCounts = new Map<string, number>();
    
    // Count password occurrences for reuse detection
    passwords.forEach(({ password }) => {
      passwordCounts.set(password, (passwordCounts.get(password) || 0) + 1);
    });
    
    const reused = Array.from(passwordCounts.values()).filter(count => count > 1).length;
    
    passwords.forEach(({ password, createdAt }) => {
      const strength = this.analyzePassword(password);
      
      if (strength.score < 60) weak++;
      if (createdAt < oneYearAgo) old++;
      // Note: Real-time breach checking would be done asynchronously
    });

    const total = passwords.length;
    const issues = weak + reused + old + compromised;
    const score = total > 0 ? Math.max(0, Math.round(((total - issues) / total) * 100)) : 100;

    return {
      weak,
      reused,
      old,
      compromised,
      total,
      score
    };
  }

  private static hasRepeatingChars(password: string): boolean {
    return /(.)\1{2,}/.test(password);
  }

  private static hasSequentialChars(password: string): boolean {
    const sequences = ['abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij', 'ijk', 'jkl', 'klm', 'lmn', 'mno', 'nop', 'opq', 'pqr', 'qrs', 'rst', 'stu', 'tuv', 'uvw', 'vwx', 'wxy', 'xyz', '123', '234', '345', '456', '567', '678', '789'];
    const lowerPassword = password.toLowerCase();
    
    return sequences.some(seq => lowerPassword.includes(seq) || lowerPassword.includes(seq.split('').reverse().join('')));
  }

  private static hasKeyboardPatterns(password: string): boolean {
    const patterns = ['qwerty', 'asdf', 'zxcv', '1234', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    const lowerPassword = password.toLowerCase();
    
    return patterns.some(pattern => lowerPassword.includes(pattern));
  }

  private static getStrengthLevel(score: number): PasswordStrength['level'] {
    if (score >= 80) return 'strong';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'weak';
    return 'very-weak';
  }

  private static estimateTimeTocrack(password: string, score: number): string {
    // Simplified time estimation based on entropy and common attack methods
    const length = password.length;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    let charset = 0;
    if (hasLower) charset += 26;
    if (hasUpper) charset += 26;
    if (hasNumber) charset += 10;
    if (hasSymbol) charset += 32;

    const combinations = Math.pow(charset, length);
    
    // Assume 1 billion guesses per second (modern GPU)
    const secondsTocrack = combinations / (2 * 1000000000);

    if (secondsTocrack < 1) return 'Instantly';
    if (secondsTocrack < 60) return 'Seconds';
    if (secondsTocrack < 3600) return 'Minutes';
    if (secondsTocrack < 86400) return 'Hours';
    if (secondsTocrack < 2592000) return 'Days';
    if (secondsTocrack < 31536000) return 'Months';
    if (secondsTocrack < 3153600000) return 'Years';
    return 'Centuries';
  }
}