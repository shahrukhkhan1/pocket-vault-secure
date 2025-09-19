import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Copy, Eye, EyeOff, Wand2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PasswordAnalyzer } from "@/services/passwordAnalyzer";

interface AdvancedPasswordGeneratorProps {
  onPasswordGenerated?: (password: string) => void;
  className?: string;
}

interface GeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeSimilar: boolean;
  excludeAmbiguous: boolean;
  customCharacters: string;
  excludeCharacters: string;
}

const PRESETS = {
  basic: { length: 12, includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSymbols: false },
  strong: { length: 16, includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSymbols: true },
  secure: { length: 24, includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSymbols: true },
  numeric: { length: 6, includeUppercase: false, includeLowercase: false, includeNumbers: true, includeSymbols: false },
  memorable: { length: 14, includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSymbols: false },
};

export const AdvancedPasswordGenerator = ({ onPasswordGenerated, className }: AdvancedPasswordGeneratorProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [options, setOptions] = useState<GeneratorOptions>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: true,
    excludeAmbiguous: false,
    customCharacters: '',
    excludeCharacters: '',
  });

  const generatePassword = () => {
    let charset = '';
    
    if (options.includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (options.includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (options.includeNumbers) charset += '0123456789';
    if (options.includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    // Add custom characters
    if (options.customCharacters) {
      charset += options.customCharacters;
    }
    
    // Remove similar characters if requested
    if (options.excludeSimilar) {
      charset = charset.replace(/[il1Lo0O]/g, '');
    }
    
    // Remove ambiguous characters if requested
    if (options.excludeAmbiguous) {
      charset = charset.replace(/[{}[\]()\/\\'"~,;<>.]/g, '');
    }
    
    // Remove excluded characters
    if (options.excludeCharacters) {
      const excludeSet = new Set(options.excludeCharacters);
      charset = charset.split('').filter(char => !excludeSet.has(char)).join('');
    }
    
    if (charset.length === 0) {
      toast({
        title: "Invalid Configuration",
        description: "No characters available for password generation",
        variant: "destructive"
      });
      return;
    }
    
    let result = '';
    const array = new Uint8Array(options.length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < options.length; i++) {
      result += charset[array[i] % charset.length];
    }
    
    setPassword(result);
    
    if (onPasswordGenerated) {
      onPasswordGenerated(result);
    }
  };

  const copyToClipboard = async () => {
    if (!password) return;
    
    try {
      await navigator.clipboard.writeText(password);
      toast({
        title: "Copied",
        description: "Password copied to clipboard",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy password to clipboard",
        variant: "destructive"
      });
    }
  };

  const applyPreset = (presetName: keyof typeof PRESETS) => {
    const preset = PRESETS[presetName];
    setOptions(prev => ({
      ...prev,
      ...preset,
      excludeSimilar: prev.excludeSimilar,
      excludeAmbiguous: prev.excludeAmbiguous,
      customCharacters: prev.customCharacters,
      excludeCharacters: prev.excludeCharacters,
    }));
  };

  const strength = password ? PasswordAnalyzer.analyzePassword(password) : null;

  const getStrengthColor = (level: string) => {
    switch (level) {
      case 'strong': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'weak': return 'text-orange-600';
      case 'very-weak': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Advanced Password Generator
        </CardTitle>
        <CardDescription>
          Generate secure passwords with custom options
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Generated Password Display */}
        {password && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-sm bg-muted p-3 rounded border">
                {showPassword ? password : '•'.repeat(password.length)}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            
            {strength && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Strength</span>
                  <Badge variant="outline" className={getStrengthColor(strength.level)}>
                    {strength.level.replace('-', ' ')} ({strength.score}%)
                  </Badge>
                </div>
                <Progress value={strength.score} />
                <div className="text-xs text-muted-foreground">
                  Time to crack: {strength.timeTocrack}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Presets */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Quick Presets</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([name, preset]) => (
              <Button
                key={name}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(name as keyof typeof PRESETS)}
                className="capitalize"
              >
                {name} ({preset.length})
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Length Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Length</Label>
            <span className="text-sm text-muted-foreground">{options.length} characters</span>
          </div>
          <Slider
            value={[options.length]}
            onValueChange={([value]) => setOptions(prev => ({ ...prev, length: value }))}
            min={6}
            max={128}
            step={1}
            className="w-full"
          />
        </div>

        {/* Character Types */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Character Types</Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="uppercase"
                checked={options.includeUppercase}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeUppercase: checked }))}
              />
              <Label htmlFor="uppercase" className="text-sm">Uppercase (A-Z)</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="lowercase"
                checked={options.includeLowercase}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeLowercase: checked }))}
              />
              <Label htmlFor="lowercase" className="text-sm">Lowercase (a-z)</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="numbers"
                checked={options.includeNumbers}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeNumbers: checked }))}
              />
              <Label htmlFor="numbers" className="text-sm">Numbers (0-9)</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="symbols"
                checked={options.includeSymbols}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeSymbols: checked }))}
              />
              <Label htmlFor="symbols" className="text-sm">Symbols (!@#$)</Label>
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Advanced Options</Label>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="excludeSimilar"
                checked={options.excludeSimilar}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, excludeSimilar: checked }))}
              />
              <Label htmlFor="excludeSimilar" className="text-sm">Exclude similar characters (i, l, 1, L, o, 0, O)</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="excludeAmbiguous"
                checked={options.excludeAmbiguous}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, excludeAmbiguous: checked }))}
              />
              <Label htmlFor="excludeAmbiguous" className="text-sm">Exclude ambiguous characters ({`{ } [ ] ( ) / \\ ' " ~ , ; . < >`})</Label>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customChars" className="text-sm">Custom Characters</Label>
            <Input
              id="customChars"
              placeholder="Additional characters to include"
              value={options.customCharacters}
              onChange={(e) => setOptions(prev => ({ ...prev, customCharacters: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="excludeChars" className="text-sm">Exclude Characters</Label>
            <Input
              id="excludeChars"
              placeholder="Characters to exclude"
              value={options.excludeCharacters}
              onChange={(e) => setOptions(prev => ({ ...prev, excludeCharacters: e.target.value }))}
            />
          </div>
        </div>

        {/* Generate Button */}
        <Button onClick={generatePassword} className="w-full" size="lg">
          <RefreshCw className="h-4 w-4 mr-2" />
          Generate Password
        </Button>
      </CardContent>
    </Card>
  );
};