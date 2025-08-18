import { useEffect, useRef } from 'react';

interface UseAutoLockOptions {
  onLock: () => void;
  inactivityTimeout: number; // in milliseconds
  isAuthenticated: boolean;
}

export const useAutoLock = ({ onLock, inactivityTimeout, isAuthenticated }: UseAutoLockOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = () => {
    if (!isAuthenticated) return;
    
    lastActivityRef.current = Date.now();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onLock();
    }, inactivityTimeout);
  };

  const handleActivity = () => {
    resetTimer();
  };

  const handleVisibilityChange = () => {
    if (document.hidden && isAuthenticated) {
      // Check if we should lock immediately based on settings
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity > 30000) { // 30 seconds
        onLock();
      }
    } else if (!document.hidden && isAuthenticated) {
      resetTimer();
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Start the timer
    resetTimer();

    // Activity event listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, inactivityTimeout]);

  return { resetTimer };
};