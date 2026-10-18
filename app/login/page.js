'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Gavel, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Ship,
  Briefcase,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  const { refreshCurrentUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');

  const demoAccounts = [
    {
      label: 'Demo Buyer',
      role: 'BUYER',
      email: 'buyer@gocomet.demo',
      icon: Briefcase,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/60 dark:border-indigo-800/60',
    },
    {
      label: 'Maersk Logistics',
      role: 'SUPPLIER',
      email: 'maersk@gocomet.demo',
      icon: Ship,
      color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800/60',
    },
    {
      label: 'CMA CGM',
      role: 'SUPPLIER',
      email: 'cma@gocomet.demo',
      icon: Ship,
      color: 'text-cyan-700 dark:text-cyan-400 bg-cyan-50 border-cyan-200 dark:bg-cyan-950/60 dark:border-cyan-800/60',
    },
    {
      label: 'MSC Shipping',
      role: 'SUPPLIER',
      email: 'msc@gocomet.demo',
      icon: Ship,
      color: 'text-amber-700 dark:text-amber-400 bg-amber-50 border-amber-200 dark:bg-amber-950/60 dark:border-amber-800/60',
    },
    {
      label: 'Hapag-Lloyd',
      role: 'SUPPLIER',
      email: 'hapag@gocomet.demo',
      icon: Ship,
      color: 'text-orange-700 dark:text-orange-400 bg-orange-50 border-orange-200 dark:bg-orange-950/60 dark:border-orange-800/60',
    },
    {
      label: 'Evergreen',
      role: 'SUPPLIER',
      email: 'evergreen@gocomet.demo',
      icon: Ship,
      color: 'text-teal-700 dark:text-teal-400 bg-teal-50 border-teal-200 dark:bg-teal-950/60 dark:border-teal-800/60',
    },
  ];

  const handlePreFill = (demo) => {
    setEmail(demo.email);
    setPassword('password123');
    setErrorMsg('');
    setNoticeMsg(`Prefilled credentials for ${demo.label} (${demo.role}). Click "Sign In" below.`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setNoticeMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Invalid email or password');
      }

      // Update auth context state with logged in user
      if (refreshCurrentUser) {
        await refreshCurrentUser();
      }

      // Determine target redirect
      if (redirectPath && redirectPath.startsWith('/')) {
        router.push(redirectPath);
      } else if (data.user?.role === 'BUYER' || data.user?.role === 'ADMIN') {
        router.push('/dashboard');
      } else {
        router.push('/supplier/dashboard');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-8 px-4">
      {/* Top Bar for Theme Toggle */}
      <div className="w-full max-w-md flex justify-end mb-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 transition-colors">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 items-center justify-center shadow-lg shadow-indigo-500/20 mb-1">
            <Gavel className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            British Auction RFQ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Enterprise Reverse Auction Procurement Platform
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/70 rounded-xl flex items-start space-x-2.5 text-xs text-red-800 dark:text-red-300">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {noticeMsg && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex items-start space-x-2.5 text-xs text-indigo-800 dark:text-indigo-300">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <span>{noticeMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating Session...</span>
              </>
            ) : (
              <>
                <span>Sign In to Platform</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts Section */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Demo Accounts (Autofill)</span>
            </span>
            <span className="text-[10px] text-slate-400">Click to load</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {demoAccounts.map((demo) => {
              const Icon = demo.icon;
              return (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => handlePreFill(demo)}
                  className={`flex items-center space-x-2 p-2 rounded-lg border text-left font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${demo.color}`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <div className="truncate">
                    <span className="block font-bold text-[11px] truncate">{demo.label}</span>
                    <span className="block text-[9px] opacity-75 font-mono truncate">{demo.role}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-center text-slate-500 dark:text-slate-400">
            Password for all demo accounts: <code className="font-mono font-semibold">password123</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
