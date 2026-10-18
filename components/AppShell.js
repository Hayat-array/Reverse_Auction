'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
import Sidebar from '@/components/Sidebar';
import { PanelLeftOpen } from 'lucide-react';

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { isDesktopCollapsed, toggleDesktopSidebar } = useSidebar();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="flex-1 w-full">{children}</main>;
  }

  return (
    <div className="flex-1 flex w-full max-w-[1920px] mx-auto min-h-[calc(100vh-4rem)] relative transition-all duration-300">
      <Sidebar />
      <main
        className={`flex-1 min-w-0 p-3.5 sm:p-5 lg:p-7 overflow-y-auto transition-all duration-300 ease-in-out ${
          isDesktopCollapsed ? 'w-full max-w-full' : ''
        }`}
      >
        {/* Subtle banner when in Desktop Full-Window mode */}
        {isDesktopCollapsed && (
          <div className="hidden md:flex items-center justify-between mb-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80 text-xs">
            <button
              type="button"
              onClick={toggleDesktopSidebar}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-semibold transition-all shadow-xs group"
              title="Click to restore side panel"
            >
              <PanelLeftOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
              <span>Full Window Mode Active • Show Side Panel</span>
            </button>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Maximum screen space enabled for auctions and tables
            </span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
