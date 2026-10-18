'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { 
  LayoutDashboard, 
  Gavel, 
  FileText, 
  PlusCircle, 
  BookOpen, 
  TrendingDown, 
  LogOut,
  X,
  PanelLeftClose,
  Maximize2,
  Sparkles
} from 'lucide-react';

const BUYER_NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/rfqs', label: 'RFQs', icon: FileText },
  { href: '/auctions', label: 'Auctions', icon: Gavel, badge: 'Live' },
  { href: '/rfqs/new', label: 'Create RFQ', icon: PlusCircle },
  { href: '/docs', label: 'Architecture & HLD', icon: BookOpen },
];

const SUPPLIER_NAV_ITEMS = [
  { href: '/supplier/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/supplier/auctions', label: 'Available Auctions', icon: Gavel, badge: 'Live' },
  { href: '/supplier/dashboard#my-bids', label: 'My Bids', icon: TrendingDown },
  { href: '/docs', label: 'Architecture & HLD', icon: BookOpen },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, isSupplier, logout } = useAuth();
  const { 
    isMobileOpen, 
    closeMobileSidebar, 
    isDesktopCollapsed, 
    toggleDesktopSidebar 
  } = useSidebar();

  // If on login page, hide sidebar completely
  if (pathname === '/login') {
    return null;
  }

  const navItems = isSupplier ? SUPPLIER_NAV_ITEMS : BUYER_NAV_ITEMS;
  const userInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U';

  const renderNavList = (onItemClick) => (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isHashLink = item.href.includes('#');
        const baseHref = item.href.split('#')[0];
        const isActive = !isHashLink && (
          pathname === item.href || 
          (item.href !== '/dashboard' && item.href !== '/supplier/dashboard' && pathname.startsWith(baseHref))
        );

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? 'bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </div>
            {item.badge && (
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs px-2 py-0.5 rounded-full font-semibold border border-emerald-500/20 flex-shrink-0">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const renderBritishAuctionCard = () => (
    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-slate-700 dark:text-slate-300">
      <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-semibold">
        <TrendingDown className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">British Reverse Auction</span>
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
        {isSupplier
          ? 'Place quotes strictly below your best bid. Compete for L1 before the immutable forced close ceiling.'
          : 'Auto-extends when competitive quotes arrive inside the trigger window up to the forced close ceiling.'}
      </p>
      <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
        <span className="text-slate-500 dark:text-slate-400">Ceiling:</span>
        <span className="text-amber-600 dark:text-amber-400 font-mono font-medium">Forced Close</span>
      </div>
    </div>
  );

  const renderUserProfile = () => (
    <div className="space-y-3">
      {currentUser && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs">
              {userInitial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {currentUser.role} {currentUser.carrierCode ? `• ${currentUser.carrierCode}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            aria-label="Logout"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
        <p className="font-semibold text-slate-600 dark:text-slate-400">GoComet Assignment MVP</p>
        <p>Production Reverse Auction</p>
      </div>
    </div>
  );

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP SIDEBAR (Collapsible for Full-Window View)                      */}
      {/* ========================================================================= */}
      <aside
        aria-label="Sidebar Navigation"
        className={`hidden md:flex flex-col justify-between py-6 transition-all duration-300 ease-in-out flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 ${
          isDesktopCollapsed 
            ? 'w-0 opacity-0 -translate-x-full overflow-hidden border-none pointer-events-none py-0' 
            : 'w-64 opacity-100 translate-x-0'
        }`}
      >
        <div className="px-4 space-y-6">
          <div>
            {/* Header with Title, Role Badge, and Desktop Collapse Button */}
            <div className="px-2 flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2 min-w-0">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                  {isSupplier ? 'Supplier' : 'Buyer'}
                </p>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex-shrink-0 ${
                    isSupplier
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                  }`}
                >
                  {isSupplier ? 'Carrier' : 'Buyer'}
                </span>
              </div>

              {/* Hide Side Panel Button (Full Window Mode) */}
              <button
                type="button"
                onClick={toggleDesktopSidebar}
                title="Hide Side Panel (Full Window View)"
                aria-label="Hide Side Panel"
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {renderNavList()}
          </div>

          {renderBritishAuctionCard()}
        </div>

        <div className="px-4">
          {renderUserProfile()}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE RESPONSIVE SIDEBAR (Slide-out Off-Canvas Drawer)                 */}
      {/* ========================================================================= */}
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 md:hidden transition-opacity duration-300 ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobileSidebar}
        aria-hidden={!isMobileOpen}
      />

      {/* Drawer Container */}
      <aside
        aria-label="Mobile Navigation Menu"
        className={`fixed inset-y-0 left-0 w-72 sm:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 md:hidden flex flex-col justify-between py-5 px-4 shadow-2xl transition-transform duration-300 ease-out overflow-y-auto ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-5">
          {/* Mobile Drawer Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-xs">
                <Gavel className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">GoComet</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">British Reverse Auction</p>
              </div>
            </div>

            {/* Close Mobile Drawer Button */}
            <button
              type="button"
              onClick={closeMobileSidebar}
              aria-label="Close Side Panel"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Role Status Tag */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isSupplier ? 'Supplier Portal' : 'Buyer Procurement'}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                isSupplier
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
              }`}
            >
              {isSupplier ? 'Carrier' : 'Buyer'}
            </span>
          </div>

          {/* Navigation Links */}
          {renderNavList(closeMobileSidebar)}

          {/* Rules Card */}
          {renderBritishAuctionCard()}
        </div>

        {/* User Info & Signout */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          {renderUserProfile()}
        </div>
      </aside>
    </>
  );
}
