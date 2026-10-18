'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext({
  currentUser: null,
  isAuthenticated: false,
  isSupplier: false,
  isBuyer: false,
  isAdmin: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refreshCurrentUser: async () => {},
});

export function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Avoid synchronous setState during initial render
    const timer = setTimeout(() => {
      fetchCurrentUser();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCurrentUser]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login failed');
      }
      setCurrentUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setCurrentUser(null);
      router.push('/login');
    }
  }, [router]);

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser && currentUser.id),
      isSupplier: currentUser?.role === 'SUPPLIER',
      isBuyer: currentUser?.role === 'BUYER',
      isAdmin: currentUser?.role === 'ADMIN',
      loading,
      login,
      logout,
      refreshCurrentUser: fetchCurrentUser,
    }),
    [currentUser, loading, fetchCurrentUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
