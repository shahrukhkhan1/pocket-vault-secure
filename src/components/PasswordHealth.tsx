import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Shield, AlertTriangle, Clock, Copy, RefreshCw, Eye, EyeOff } from "lucide-react";
import { PasswordAnalyzer, PasswordHealth as PasswordHealthType, PasswordStrength } from "@/services/passwordAnalyzer";
import { VaultItem } from "@/services/indexedDBStorage";

interface PasswordHealthProps {
  items: VaultItem[];
  className?: string;
}

export const PasswordHealth = ({ items, className }: PasswordHealthProps) => {
  const [health, setHealth] = useState<PasswordHealthType | null>(null);
  const [weakPasswords, setWeakPasswords] = useState<{ item: VaultItem; strength: PasswordStrength }[]>([]);
  const [reusedPasswords, setReusedPasswords] = useState<{ password: string; items: VaultItem[] }[]>([]);
  const [showWeakPasswords, setShowWeakPasswords] = useState(false);
  const [showReusedPasswords, setShowReusedPasswords] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());

  useEffect(() => {
    analyzeVault();
  }, [items]);

  const analyzeVault = () => {
    const passwordItems = items.filter(item => item.type === 'password' && item.data.password);
    
    if (passwordItems.length === 0) {
      setHealth({
        weak: 0,
        reused: 0,
        old: 0,
        compromised: 0,
        total: 0,
        score: 100
      });
      return;
    }

    const passwords = passwordItems.map(item => ({
      password: item.data.password,
      createdAt: new Date(item.createdAt),
      title: item.title
    }));

    const vaultHealth = PasswordAnalyzer.analyzeVaultHealth(passwords);
    setHealth(vaultHealth);

    // Analyze weak passwords
    const weak: { item: VaultItem; strength: PasswordStrength }[] = [];
    passwordItems.forEach(item => {
      const strength = PasswordAnalyzer.analyzePassword(item.data.password);
      if (strength.score < 60) {
        weak.push({ item, strength });
      }
    });
    setWeakPasswords(weak);

    // Find reused passwords
    const passwordMap = new Map<string, VaultItem[]>();
    passwordItems.forEach(item => {
      const password = item.data.password;
      if (!passwordMap.has(password)) {
        passwordMap.set(password, []);
      }
      passwordMap.get(password)!.push(item);
    });

    const reused = Array.from(passwordMap.entries())
      .filter(([_, items]) => items.length > 1)
      .map(([password, items]) => ({ password, items }));
    
    setReusedPasswords(reused);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const getStrengthColor = (level: PasswordStrength['level']) => {
    switch (level) {
      case 'strong': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'weak': return 'text-orange-600';
      case 'very-weak': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const togglePasswordVisibility = (itemId: string) => {
    setRevealedPasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  if (!health) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Password Health
        </CardTitle>
        <CardDescription>
          Analysis of your vault's password security
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${getHealthColor(health.score)}`}>
            {health.score}%
          </div>
          <p className="text-sm text-muted-foreground">Security Score</p>
          <Progress value={health.score} className="mt-2" />
          <Badge variant={getHealthBadgeVariant(health.score)} className="mt-2">
            {health.score >= 80 ? 'Excellent' : health.score >= 60 ? 'Good' : 'Needs Improvement'}
          </Badge>
        </div>

        <Separator />

        {/* Health Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{health.weak}</div>
            <div className="text-sm text-muted-foreground">Weak Passwords</div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{health.reused}</div>
            <div className="text-sm text-muted-foreground">Reused Passwords</div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{health.old}</div>
            <div className="text-sm text-muted-foreground">Old Passwords</div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{health.compromised}</div>
            <div className="text-sm text-muted-foreground">Compromised</div>
          </div>
        </div>

        {/* Weak Passwords Section */}
        {weakPasswords.length > 0 && (
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => setShowWeakPasswords(!showWeakPasswords)}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Weak Passwords ({weakPasswords.length})
              </span>
              <span>{showWeakPasswords ? '−' : '+'}</span>
            </Button>
            
            {showWeakPasswords && (
              <div className="space-y-2">
                {weakPasswords.map(({ item, strength }) => (
                  <div key={item.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{item.title}</span>
                      <Badge variant="outline" className={getStrengthColor(strength.level)}>
                        {strength.level.replace('-', ' ')} ({strength.score}%)
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 font-mono text-sm bg-muted p-2 rounded">
                        {revealedPasswords.has(item.id) 
                          ? item.data.password 
                          : '•'.repeat(item.data.password.length)
                        }
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePasswordVisibility(item.id)}
                      >
                        {revealedPasswords.has(item.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Time to crack: {strength.timeTocrack}
                    </div>
                    {strength.feedback.length > 0 && (
                      <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                        {strength.feedback.map((feedback, idx) => (
                          <li key={idx}>• {feedback}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reused Passwords Section */}
        {reusedPasswords.length > 0 && (
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => setShowReusedPasswords(!showReusedPasswords)}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-orange-500" />
                Reused Passwords ({reusedPasswords.length})
              </span>
              <span>{showReusedPasswords ? '−' : '+'}</span>
            </Button>
            
            {showReusedPasswords && (
              <div className="space-y-3">
                {reusedPasswords.map(({ password, items }, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Password used {items.length} times</span>
                      <Badge variant="outline" className="text-orange-600">
                        {items.length}x reused
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 font-mono text-sm bg-muted p-2 rounded">
                        {revealedPasswords.has(`reused-${idx}`) 
                          ? password 
                          : '•'.repeat(password.length)
                        }
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePasswordVisibility(`reused-${idx}`)}
                      >
                        {revealedPasswords.has(`reused-${idx}`) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Used in: {items.map(item => item.title).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {health.total === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-2" />
            <p>No passwords to analyze yet</p>
            <p className="text-sm">Add some password entries to see health metrics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};