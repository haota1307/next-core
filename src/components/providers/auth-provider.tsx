"use client";

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser, useRefreshToken } from '@/hooks/api';

interface AuthContextType {
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useCurrentUser();
  const refreshMutation = useRefreshToken();

  const isAuthenticated = !!user && !error;

  // Auto refresh token on mount and when token expires
  useEffect(() => {
    const refreshToken = localStorage.getItem('refreshToken');
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken && refreshToken) {
      refreshMutation.mutate(refreshToken, {
        onError: () => {
          // Clear invalid tokens
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          queryClient.clear();
        },
      });
    }
  }, []);

  // Set up automatic token refresh
  useEffect(() => {
    if (!user) return;

    const setupTokenRefresh = () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return;

      // Refresh token 5 minutes before expiry (access tokens expire in 15 minutes)
      const refreshInterval = setInterval(() => {
        refreshMutation.mutate(refreshToken, {
          onError: () => {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            queryClient.clear();
            clearInterval(refreshInterval);
          },
        });
      }, 10 * 60 * 1000); // 10 minutes

      return () => clearInterval(refreshInterval);
    };

    return setupTokenRefresh();
  }, [user, refreshMutation, queryClient]);

  const value = {
    user,
    isLoading,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
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
