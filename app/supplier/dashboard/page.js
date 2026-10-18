'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Gavel, 
  TrendingDown, 
  Trophy, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Ship,
  CheckCircle2,
  Zap,
  RotateCw
} from 'lucide-react';
import AuctionCountdown from '@/components/AuctionCountdown';

export default function SupplierDashboardPage() {
  const router = useRouter();
  const { currentUser, isBuyer, loading: authLoading } = useAuth();

  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Client-side guard: redirect buyer to buyer dashboard
  useEffect(() => {
    if (!authLoading && currentUser && isBuyer) {
      router.replace('/dashboard');
    }
  }, [authLoading, currentUser, isBuyer, router]);

  const fetchAuctions = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const res = await fetch('/api/auctions');
      const data = await res.json();
      if (data.success) {
        setAuctions(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load supplier auctions:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAuctions(true);
    }, 0);
    const interval = setInterval(() => fetchAuctions(false), 5000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchAuctions]);

  const now = new Date().getTime();
  const userId = currentUser?.id || currentUser?._id;

  // Filter and compute statistics
  const activeAuctions = auctions.filter(a => a.computedStatus === 'ACTIVE');
  const upcomingAuctions = auctions.filter(a => a.computedStatus === 'PENDING');

  // Auctions where current supplier has placed a bid
  const myBiddedAuctions = auctions.filter(a => {
    if (!userId) return false;
    return a.rankings?.some(r => String(r.supplierId) === String(userId));
  });

  const myActiveBidsCount = myBiddedAuctions.filter(a => a.computedStatus === 'ACTIVE').length;

  // Count auctions where current supplier holds L1
  const currentL1Count = activeAuctions.filter(a => {
    if (!userId) return false;
    return (
      String(a.currentL1SupplierId) === String(userId) ||
      (a.rankings && a.rankings[0] && String(a.rankings[0].supplierId) === String(userId))
    );
  }).length;

  // Auctions ending soon (within 15 minutes)
  const endingSoonCount = activeAuctions.filter(a => {
    const closeMs = new Date(a.bidCloseTime).getTime();
    return closeMs > now && closeMs - now <= 15 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Supplier Portal
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
              {currentUser?.companyName || 'Carrier'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time reverse auction bidding, rank monitoring & L1 competition
          </p>
        </div>

        {/* Spec Actions: [ Browse Auctions ] and [ My Bids ] */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/supplier/auctions"
            className="flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Gavel className="w-4 h-4" />
            <span>Browse Auctions</span>
          </Link>
          <a
            href="#my-bids"
            className="flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors"
          >
            <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>My Bids ({myBiddedAuctions.length})</span>
          </a>
        </div>
      </div>

      {/* KPI Cards: Spec-required 4 cards + Upcoming */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Auctions */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Active Auctions</span>
            <Gavel className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {activeAuctions.length}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Live auctions accepting bids</span>
        </div>

        {/* My Active Bids */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">My Active Bids</span>
            <TrendingDown className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 font-mono">
            {myActiveBidsCount}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Auctions you are competing in</span>
        </div>

        {/* Current L1 Opportunities */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Current L1 Held</span>
            <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {currentL1Count}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Auctions where you rank #1</span>
        </div>

        {/* Auctions Ending Soon */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Ending Soon (&lt;15m)</span>
            <Clock className="w-4 h-4 text-red-500 dark:text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 font-mono">
            {endingSoonCount}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Near trigger window or close</span>
        </div>
      </div>

      {/* Section 1: Active Live Auctions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Gavel className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Bidding Opportunities</h2>
          </div>
          <Link
            href="/supplier/auctions"
            className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center space-x-1 font-medium"
          >
            <span>View All Auctions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400">
            <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-xs">Loading available auctions...</p>
          </div>
        ) : activeAuctions.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No active auctions at the moment</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Check back soon or wait for the buyer to publish new RFQ auctions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAuctions.map((auction) => {
              const myRank = auction.rankings?.find(r => String(r.supplierId) === String(userId));
              const isL1 = myRank?.rank === 1;

              return (
                <div
                  key={auction._id}
                  className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-5 shadow-xs hover:shadow-sm space-y-4 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                        {auction.rfqId?.referenceId || 'RFQ-2026'}
                      </span>
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm mt-0.5 line-clamp-1">
                        {auction.title}
                      </h3>
                    </div>

                    {isL1 ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 flex items-center space-x-1">
                        <Trophy className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>YOU HOLD L1</span>
                      </span>
                    ) : myRank ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        Rank #{myRank.rank}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                        OPEN TO BID
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <Ship className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <span className="truncate">
                      {auction.rfqId?.origin?.port || 'Origin'} → {auction.rfqId?.destination?.port || 'Destination'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Current L1 Quote:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {auction.currentL1Price ? `₹${auction.currentL1Price.toLocaleString()}` : 'No bids yet'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Your Best Quote:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                        {myRank ? `₹${myRank.totalPrice.toLocaleString()}` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                    <AuctionCountdown
                      bidCloseTime={auction.bidCloseTime}
                      forcedCloseTime={auction.forcedCloseTime}
                      triggerWindowMinutes={auction.triggerWindowMinutes}
                      status={auction.computedStatus}
                    />

                    <Link
                      href={`/supplier/auctions/${auction._id}`}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-xs"
                    >
                      <span>{myRank ? 'Submit Lower Bid' : 'Place Bid'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: My Bids & Standings (#my-bids anchor) */}
      <div id="my-bids" className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              My Active Bids & Leaderboard Standings
            </h2>
          </div>
          <button
            onClick={() => fetchAuctions(false)}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center space-x-1"
          >
            <RotateCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        {myBiddedAuctions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">You haven&apos;t placed any bids yet</p>
            <p className="text-xs mt-1">Browse active auctions above and submit your competitive quote.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="sm:hidden px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>My Quotes ({myBiddedAuctions.length})</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 text-[10px]">Swipe table ➔</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Auction / Route</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Your Best Bid</th>
                    <th className="px-4 py-3">Current L1</th>
                    <th className="px-4 py-3">Your Rank</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {myBiddedAuctions.map((auc) => {
                    const myRank = auc.rankings?.find(r => String(r.supplierId) === String(userId));
                    const isL1 = myRank?.rank === 1;

                    return (
                      <tr key={auc._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">{auc.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {auc.rfqId?.origin?.port} → {auc.rfqId?.destination?.port}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              auc.computedStatus === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {auc.computedStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">
                          {myRank ? `₹${myRank.totalPrice.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {auc.currentL1Price ? `₹${auc.currentL1Price.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {isL1 ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold">
                              <Trophy className="w-3.5 h-3.5 text-amber-500" />
                              <span>Rank #1 (L1)</span>
                            </span>
                          ) : myRank ? (
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Rank #{myRank.rank}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/supplier/auctions/${auc._id}`}
                            className="inline-flex items-center space-x-1 px-3 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-medium text-xs transition-colors"
                          >
                            <span>Open Room</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
