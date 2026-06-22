'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, getAccessToken, setAccessToken } from '@/lib/api';

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** True after session bootstrap completes (authenticated or confirmed unauthenticated). */
  sessionReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, username: string, email: string, password: string, inviteToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Try to restore session on mount using refresh token (HttpOnly cookie)
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // If we already have a token in memory, verify it
        if (getAccessToken()) {
          const userData = await authAPI.me();
          setUser(userData);
        } else {
          // Try to refresh the token using the HttpOnly cookie
          const data = await authAPI.refresh();
          setAccessToken(data.accessToken);
          setUser(data.user);
        }
      } catch {
        // No valid session, user needs to log in
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authAPI.login({ email, password });
    // accessToken is set in authAPI.login via setAccessToken
    setUser(data.user);
  }, []);

  const register = useCallback(async (name: string, username: string, email: string, password: string, inviteToken?: string) => {
    const data = await authAPI.register({ name, username, email, password, inviteToken });
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionReady: !loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
