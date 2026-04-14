import { toast } from 'sonner';

let clearTimeoutId: ReturnType<typeof setTimeout> | null = null;

export const ClipboardManager = {
  async secureCopy(text: string, label: string, autoClearMs = 30000): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      
      // Clear any previous timer
      if (clearTimeoutId) {
        clearTimeout(clearTimeoutId);
        clearTimeoutId = null;
      }

      const isSensitive = ['password', 'account', 'routing', 'secret', 'totp', 'code'].some(
        k => label.toLowerCase().includes(k)
      );

      if (isSensitive) {
        toast.success(`${label} copied`, {
          description: `Clipboard will auto-clear in ${autoClearMs / 1000}s`,
          duration: 4000,
        });

        clearTimeoutId = setTimeout(async () => {
          try {
            await navigator.clipboard.writeText('');
          } catch {}
          clearTimeoutId = null;
        }, autoClearMs);
      } else {
        toast.success(`${label} copied to clipboard`);
      }
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  },

  clearNow() {
    if (clearTimeoutId) {
      clearTimeout(clearTimeoutId);
      clearTimeoutId = null;
    }
    navigator.clipboard.writeText('').catch(() => {});
  }
};
