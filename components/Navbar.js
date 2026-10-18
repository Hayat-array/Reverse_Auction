'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import ThemeToggle from '@/components/ThemeToggle';
import { 
  Gavel, 
  RotateCcw, 
  PlusCircle, 
  LogOut,
  Ship,
  LogIn,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Menu
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { currentUser, isBuyer, isSupplier, logout, refreshCurrentUser } = useAuth();
  const { 
    isMobileOpen, 
    toggleMobileSidebar, 
    isDesktopCollapsed, 
    toggleDesktopSidebar 
  } = useSidebar();

  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  // If on /login page, keep the navbar focused and minimal
  const isLoginPage = pathname === '/login';

  const handleSeed = async () => {
    try {
      setSeeding(true);
      setSeedSuccess(false);
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSeedSuccess(true);
        if (refreshCurrentUser) await refreshCurrentUser();
        setTimeout(() => setSeedSuccess(false), 3000);
        window.location.reload();
      }
    } catch (err) {
      console.error('Seed error:', err);
    } finally {
      setSeeding(false);
    }
  };

  const userInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs text-slate-900 dark:text-white transition-colors duration-200">
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Left Section: Side Panel Toggle Button + Brand Logo */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          {/* Side Panel Toggle Button (Available on both Mobile & Desktop) */}
          {!isLoginPage && (
            <>
              {/* Mobile Drawer Trigger (< md) */}
              <button
                type="button"
                onClick={toggleMobileSidebar}
                aria-label={isMobileOpen ? 'Close Side Panel' : 'Open Side Panel'}
                title="Toggle Side Panel"
                className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors flex items-center justify-center flex-shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Desktop Side Panel Collapse / Full Window Toggle (>= md) */}
              <button
                type="button"
                onClick={toggleDesktopSidebar}
                aria-label={isDesktopCollapsed ? 'Show Side Panel' : 'Hide Side Panel (Full Window View)'}
                title={isDesktopCollapsed ? 'Show Side Panel' : 'Hide Side Panel (Full Window View)'}
                className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex-shrink-0 ${
                  isDesktopCollapsed
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/80 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                {isDesktopCollapsed ? (
                  <>
                    <PanelLeftOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="hidden lg:inline text-[11px]">Show Panel</span>
                  </>
                ) : (
                  <>
                    <PanelLeftClose className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className="hidden lg:inline text-[11px]">Full Window</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Brand & Tagline */}
          <Link
            href={isSupplier ? '/supplier/dashboard' : '/dashboard'}
            className="flex items-center space-x-2 sm:space-x-2.5 group min-w-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <Gavel className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white truncate">
                  GoComet
                </span>
                <span className="hidden sm:inline-block bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] px-2 py-0.5 rounded-full font-medium border border-indigo-200 dark:border-indigo-700/50 flex-shrink-0">
                  British Auction
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">
                Reverse Auction Procurement Engine
              </p>
            </div>
          </Link>
        </div>

        {/* Action Controls, User Status & Theme Toggle */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 flex-shrink-0">
          {/* Quick Seed Button (Available for testing / demo reset) */}
          <button
            onClick={handleSeed}
            disabled={seeding}
            title="Reset and populate database with live demo auctions, suppliers, and users"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin text-indigo-500 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
            <span className="hidden sm:inline">{seeding ? 'Seeding...' : seedSuccess ? 'Seeded!' : 'Reset Demo'}</span>
          </button>

          {/* Role-Specific Quick Action */}
          {currentUser && isBuyer && (
            <Link
              href="/rfqs/new"
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New RFQ</span>
            </Link>
          )}

          {currentUser && isSupplier && (
            <Link
              href="/supplier/auctions"
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
            >
              <Ship className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Live Auctions</span>
            </Link>
          )}

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* User Profile Badge & Logout Action */}
          {currentUser ? (
            <div className="flex items-center space-x-1.5 sm:space-x-2 pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-slate-700">
              {/* Avatar Initial */}
              <div 
                title={`${currentUser.name} (${currentUser.role})`}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-bold flex items-center justify-center text-xs shadow-xs flex-shrink-0"
              >
                {userInitial}
              </div>

              {/* User details (Visible on desktop) */}
              <div className="hidden xl:flex flex-col text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[110px]">
                    {currentUser.name}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                      isBuyer
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
                  {currentUser.companyName || currentUser.email}
                </span>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                title="Sign out of account"
                aria-label="Logout"
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : !isLoginPage ? (
            <Link
              href="/login"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
