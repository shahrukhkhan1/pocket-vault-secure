import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Clock, Shield } from 'lucide-react';

interface AutoLockSettingsProps {
  currentTimeout: number;
  onTimeoutChange: (timeout: number) => void;
  onClose: () => void;
}

const timeoutOptions = [
  { value: 60000, label: '1 minute' },
  { value: 120000, label: '2 minutes' },
  { value: 300000, label: '5 minutes' },
  { value: 600000, label: '10 minutes' },
  { value: 1800000, label: '30 minutes' },
  { value: 3600000, label: '1 hour' },
  { value: 0, label: 'Never' }
];

export const AutoLockSettings = ({ currentTimeout, onTimeoutChange, onClose }: AutoLockSettingsProps) => {
  const [selectedTimeout, setSelectedTimeout] = useState(currentTimeout.toString());

  const handleSave = () => {
    onTimeoutChange(parseInt(selectedTimeout));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gradient-card border-border shadow-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Auto-Lock Settings</CardTitle>
              <CardDescription>
                Configure when the vault should automatically lock
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timeout">Lock after inactivity</Label>
            <Select value={selectedTimeout} onValueChange={setSelectedTimeout}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeoutOptions.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Security Note</p>
                <p className="text-muted-foreground">
                  The vault will also lock when you switch tabs or minimize the browser for security.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              className="flex-1 bg-gradient-primary hover:shadow-secure transition-spring"
            >
              Save Settings
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-border"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};