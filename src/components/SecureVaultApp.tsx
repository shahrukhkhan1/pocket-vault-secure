import { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { VaultDashboard } from './VaultDashboard';
import { AutoLockSettings } from './AutoLockSettings';
import { useAutoLock } from '@/hooks/useAutoLock';

export const SecureVaultApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [showLockSettings, setShowLockSettings] = useState(false);
  const [lockTimeout, setLockTimeout] = useState(() => {
    const saved = localStorage.getItem('vaultLockTimeout');
    return saved ? parseInt(saved) : 300000; // Default 5 minutes
  });

  useEffect(() => {
    // Clear any session data on app start
    setIsAuthenticated(false);
    setMasterPassword('');
  }, []);

  const handleLogin = (password: string, hint?: string) => {
    setMasterPassword(password);
    setIsAuthenticated(true);
    
    // If hint is provided, it means we're creating a new vault
    if (hint) {
      // The hint will be saved when the first item is saved
      localStorage.setItem('pendingHint', hint);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setMasterPassword('');
  };

  const handleTimeoutChange = (timeout: number) => {
    setLockTimeout(timeout);
    localStorage.setItem('vaultLockTimeout', timeout.toString());
  };

  // Initialize auto-lock only if timeout > 0
  useAutoLock({
    onLock: handleLogout,
    inactivityTimeout: lockTimeout,
    isAuthenticated: isAuthenticated && lockTimeout > 0
  });

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <>
      <VaultDashboard 
        masterPassword={masterPassword} 
        onLogout={handleLogout}
        onShowLockSettings={() => setShowLockSettings(true)}
      />
      
      {showLockSettings && (
        <AutoLockSettings
          currentTimeout={lockTimeout}
          onTimeoutChange={handleTimeoutChange}
          onClose={() => setShowLockSettings(false)}
        />
      )}
    </>
  );
};