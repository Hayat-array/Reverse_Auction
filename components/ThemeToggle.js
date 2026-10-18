'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme, mounted } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`relative inline-flex items-center justify-center p-2 rounded-lg text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 active:scale-95 border ${
        isDark
          ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border-slate-700 shadow-inner'
          : 'bg-slate-100 hover:bg-slate-200 text-indigo-600 hover:text-indigo-700 border-slate-200 shadow-sm'
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {/* Sun Icon (Visible in Dark Mode) */}
        <Sun
          className={`w-4 h-4 transition-all duration-300 transform ${
            mounted && isDark
              ? 'rotate-0 scale-100 opacity-100 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
              : '-rotate-90 scale-0 opacity-0 absolute'
          }`}
        />
        {/* Moon Icon (Visible in Light Mode) */}
        <Moon
          className={`w-4 h-4 transition-all duration-300 transform ${
            !mounted || !isDark
              ? 'rotate-0 scale-100 opacity-100 text-indigo-600'
              : 'rotate-90 scale-0 opacity-0 absolute'
          }`}
        />
      </div>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
