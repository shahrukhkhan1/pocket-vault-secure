import { useState, useEffect } from 'react';
import { generateTOTP, getTimeRemaining } from '@/services/totp';
import { ClipboardManager } from '@/services/clipboardManager';
import { Copy, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TOTPDisplayProps {
  secret: string;
}

export const TOTPDisplay = ({ secret }: TOTPDisplayProps) => {
  const [code, setCode] = useState('------');
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    let mounted = true;

    const update = async () => {
      if (!mounted) return;
      const newCode = await generateTOTP(secret);
      if (mounted) {
        setCode(newCode);
        setTimeLeft(getTimeRemaining());
      }
    };

    update();
    const interval = setInterval(() => {
      const remaining = getTimeRemaining();
      setTimeLeft(remaining);
      if (remaining === 30) update();
    }, 1000);

    return () => { mounted = false; clearInterval(interval); };
  }, [secret]);

  const progress = (timeLeft / 30) * 100;
  const isLow = timeLeft <= 5;

  return (
    <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
      <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="font-mono text-sm font-bold tracking-widest text-foreground">
          {code.slice(0, 3)} {code.slice(3)}
        </span>
        <div className="relative w-6 h-6 shrink-0">
          <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
            <circle
              cx="12" cy="12" r="10" fill="none"
              stroke={isLow ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
              strokeWidth="2"
              strokeDasharray={`${progress * 0.628} 100`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-bold ${isLow ? 'text-destructive' : 'text-muted-foreground'}`}>
            {timeLeft}
          </span>
        </div>
      </div>
      <Button
        size="sm" variant="ghost"
        className="h-6 w-6 p-0 shrink-0"
        onClick={() => ClipboardManager.secureCopy(code, 'TOTP Code')}
      >
        <Copy className="w-3 h-3" />
      </Button>
    </div>
  );
};
