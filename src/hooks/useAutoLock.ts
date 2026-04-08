import { useEffect, useRef, useCallback } from 'react';

interface UseAutoLockOptions {
  onLock: () => void;
  inactivityTimeout: number; // in milliseconds
  isAuthenticated: boolean;
  lockOnHidden?: boolean; // lock immediately when tab is hidden
}

export const useAutoLock = ({ onLock, inactivityTimeout, isAuthenticated, lockOnHidden = true }: UseAutoLockOptions) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isAuthenticatedRef = useRef(isAuthenticated);
  const onLockRef = useRef(onLock);
  const inactivityTimeoutRef = useRef(inactivityTimeout);

  // Keep refs in sync
  useEffect(() => { isAuthenticatedRef.current = isAuthenticated; }, [isAuthenticated]);
  useEffect(() => { onLockRef.current = onLock; }, [onLock]);
  useEffect(() => { inactivityTimeoutRef.current = inactivityTimeout; }, [inactivityTimeout]);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (!isAuthenticatedRef.current) return;
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      if (isAuthenticatedRef.current) {
        onLockRef.current();
      }
    }, inactivityTimeoutRef.current);
  }, [clearTimer]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimer();
      return;
    }

    resetTimer();

    const handleActivity = () => resetTimer();

    const handleVisibilityChange = () => {
      if (document.hidden && isAuthenticatedRef.current && lockOnHidden) {
        // Lock immediately when tab is hidden
        onLockRef.current();
      } else if (!document.hidden && isAuthenticatedRef.current) {
        resetTimer();
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimer();
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, inactivityTimeout, lockOnHidden, resetTimer, clearTimer]);

  return { resetTimer };
};
