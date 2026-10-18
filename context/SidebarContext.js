'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

const SidebarContext = createContext({
  isMobileOpen: false,
  isDesktopCollapsed: false,
  toggleSidebar: () => {},
  toggleMobileSidebar: () => {},
  closeMobileSidebar: () => {},
  openMobileSidebar: () => {},
  toggleDesktopSidebar: () => {},
  setDesktopCollapsed: () => {},
});

export function SidebarProvider({ children }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Restore saved desktop preference from localStorage after mounting
  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = localStorage.getItem('gocomet-sidebar-collapsed');
      if (saved === 'true') {
        setIsDesktopCollapsed(true);
      }
    } catch {
      // LocalStorage access might fail in restricted environments
    }
  }, []);

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Handle Escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const openMobileSidebar = useCallback(() => {
    setIsMobileOpen(true);
  }, []);

  const toggleDesktopSidebar = useCallback(() => {
    setIsDesktopCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gocomet-sidebar-collapsed', String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const setDesktopCollapsed = useCallback((val) => {
    setIsDesktopCollapsed(val);
    try {
      localStorage.setItem('gocomet-sidebar-collapsed', String(val));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Universal toggle: toggles mobile drawer on small screens, or collapses desktop sidebar on large screens
  const toggleSidebar = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileOpen((prev) => !prev);
    } else {
      toggleDesktopSidebar();
    }
  }, [toggleDesktopSidebar]);

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        isDesktopCollapsed: isMounted ? isDesktopCollapsed : false,
        toggleSidebar,
        toggleMobileSidebar,
        closeMobileSidebar,
        openMobileSidebar,
        toggleDesktopSidebar,
        setDesktopCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
export default SidebarContext;
