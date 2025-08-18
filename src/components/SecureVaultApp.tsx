import { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { VaultDashboard } from './VaultDashboard';

export const SecureVaultApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');

  useEffect(() => {
    // Clear any session data on app start
    setIsAuthenticated(false);
    setMasterPassword('');
  }, []);

  const handleLogin = (password: string) => {
    setMasterPassword(password);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setMasterPassword('');
  };

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <VaultDashboard 
      masterPassword={masterPassword} 
      onLogout={handleLogout} 
    />
  );
};