import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  role: string;
  loginCount?: number;
  loginCountSincePwdChange?: number;
  loginsRemaining?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  backendAvailable: boolean;
  backendError: string | null;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  checkBackendHealth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:9081/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Check backend health
  const checkBackendHealth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setBackendAvailable(true);
        setBackendError(null);
        return true;
      } else {
        setBackendAvailable(false);
        setBackendError('Backend returned an error');
        return false;
      }
    } catch (error) {
      setBackendAvailable(false);
      setBackendError(error instanceof Error ? error.message : 'Failed to connect to backend');
      return false;
    }
  }, []);

  // Verify token and get user info
  const verifyToken = useCallback(async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setBackendAvailable(true);
        setBackendError(null);
      } else {
        // Token invalid, clear it
        localStorage.removeItem('authToken');
        setToken(null);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      // Don't clear token on network errors - might be temporary
      setBackendAvailable(false);
      setBackendError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    console.log('AuthContext: Mounting, storedToken:', storedToken);
    if (storedToken) {
      console.log('AuthContext: Found token, verifying...');
      setToken(storedToken);
      verifyToken(storedToken);
    } else {
      console.log('AuthContext: No token found');
      setIsLoading(false);
      // Check backend health even without a token
      checkBackendHealth();
    }
  }, [verifyToken, checkBackendHealth]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      // Check for password change required
      if (response.status === 403 && data.mustChangePassword) {
        setMustChangePassword(true);
        throw new Error(data.message || 'Password change required');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      setToken(data.token);
      setUser(data.user);
      setBackendAvailable(true);
      setBackendError(null);
      setMustChangePassword(false);
      console.log('AuthContext: Login successful, saving token to localStorage:', data.token ? 'Token exists' : 'Token missing');
      localStorage.setItem('authToken', data.token);
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setBackendAvailable(false);
        setBackendError('Cannot connect to server');
      }
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string, fullName?: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password, fullName })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setToken(data.token);
      setUser(data.user);
      setBackendAvailable(true);
      setBackendError(null);
      console.log('AuthContext: Registration successful, saving token to localStorage:', data.token ? 'Token exists' : 'Token missing');
      localStorage.setItem('authToken', data.token);
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setBackendAvailable(false);
        setBackendError('Cannot connect to server');
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('authToken');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    backendAvailable,
    backendError,
    mustChangePassword,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
    checkBackendHealth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
