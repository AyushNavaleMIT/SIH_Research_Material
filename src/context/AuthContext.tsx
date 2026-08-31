import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, UserRole } from '../types';
import { ScreeningApiService } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
  setUserTypeGuest: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('sentinel_auth_token') || sessionStorage.getItem('sentinel_auth_token')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;

    const initAuth = async () => {
      if (token) {
        try {
          const fetchedUser = await ScreeningApiService.getCurrentUser();
          if (isCancelled) return;
          if (fetchedUser) {
            setUser(fetchedUser);
          } else {
            // Token expired or invalid
            setUser((prev) => (prev?.id?.startsWith('GUEST-') ? prev : null));
            setToken(null);
            localStorage.removeItem('sentinel_auth_token');
            sessionStorage.removeItem('sentinel_auth_token');
          }
        } catch {
          if (!isCancelled) {
            setUser((prev) => (prev?.id?.startsWith('GUEST-') ? prev : null));
            setToken(null);
          }
        }
      }
      if (!isCancelled) {
        setIsLoading(false);
      }
    };

    initAuth();
    return () => {
      isCancelled = true;
    };
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await ScreeningApiService.login(email, password);
      const authToken = res.data?.token;
      const authUser = res.data?.user;

      if (authToken) {
        localStorage.setItem('sentinel_auth_token', authToken);
        setToken(authToken);
      }
      if (authUser) {
        setUser(authUser);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: any) => {
    setIsLoading(true);
    try {
      const res = await ScreeningApiService.register(payload);
      const authToken = res.data?.token;
      const authUser = res.data?.user;

      if (authToken) {
        localStorage.setItem('sentinel_auth_token', authToken);
        setToken(authToken);
      }
      if (authUser) {
        setUser(authUser);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await ScreeningApiService.logout();
      setUser(null);
      setToken(null);
      localStorage.removeItem('sentinel_auth_token');
      sessionStorage.removeItem('sentinel_auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const setUserTypeGuest = (role: UserRole) => {
    localStorage.removeItem('sentinel_auth_token');
    sessionStorage.removeItem('sentinel_auth_token');
    setToken(null);
    setUser({
      id: role === 'INDIVIDUAL' ? 'GUEST-INDIVIDUAL' : 'GUEST-ORGANISATION',
      email: role === 'INDIVIDUAL' ? 'guest.user@sentinel.local' : 'guest.org@sentinel.local',
      username: role === 'INDIVIDUAL' ? 'Guest Applicant' : 'Guest Enterprise',
      role: role,
      fullName: role === 'INDIVIDUAL' ? 'Guest Applicant' : undefined,
      orgName: role === 'ORGANISATION' ? 'Guest Organization KYC Desk' : undefined,
      orgType: role === 'ORGANISATION' ? 'BANK' : undefined,
      orgId: role === 'ORGANISATION' ? 'ORG-DEMO-001' : undefined,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        setUserTypeGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
