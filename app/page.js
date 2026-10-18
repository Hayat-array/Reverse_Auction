'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Gavel, 
  FileText, 
  CheckCircle2, 
  TrendingDown, 
  PlusCircle, 
  ArrowRight, 
  Ship,
  Clock,
  Activity,
  Zap,
  ShieldAlert
} from 'lucide-react';
import AuctionCountdown from '@/components/AuctionCountdown';

export default function BuyerDashboardPage() {
  const router = useRouter();
  const { currentUser, isSupplier, loading: authLoading } = useAuth();

  const [stats, setStats] = useState({
    totalRfqs: 0,
    activeAuctions: 0,
    upcomingAuctions: 0,
    closedAuctions: 0,
    totalBids: 0,
  });
  const [auctions, setAuctions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Client-side guard: redirect supplier users to supplier dashboard
  useEffect(() => {
    if (!authLoading && currentUser && isSupplier) {
      router.replace('/supplier/dashboard');
    }
  }, [authLoading, currentUser, isSupplier, router]);

  const fetchData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [rfqRes, aucRes, actRes] = await Promise.all([
        fetch('/api/rfqs'),
        fetch('/api/auctions'),
        fetch('/api/auctions/activity?limit=10'),
      ]);

      const rfqData = await rfqRes.json();
      const aucData = await aucRes.json();
      const actData = await actRes.json();

      const rfqs = rfqData.success ? rfqData.data : [];
      const allAuctions = aucData.success ? aucData.data : [];
      const activityLogs = actData.success ? actData.data : [];

      const activeCount = allAuctions.filter(a => a.computedStatus === 'ACTIVE').length;
      const upcomingCount = allAuctions.filter(a => a.computedStatus === 'PENDING').length;
      const closedCount = allAuctions.filter(a => a.computedStatus === 'CLOSED' || a.computedStatus === 'FORCE_CLOSED').length;
      const bidsCount = allAuctions.reduce((acc, curr) => acc + (curr.totalBidsCount || 0), 0);

      setStats({
        totalRfqs: rfqs.length,
        activeAuctions: activeCount,
        upcomingAuctions: upcomingCount,
        closedAuctions: closedCount,
        totalBids: bidsCount,
      });

      setAuctions(allAuctions);
      setActivities(activityLogs);
    } catch (err) {
      console.error('Failed to load buyer dashboard data:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(true);
    }, 0);
    const interval = setInterval(() => fetchData(false), 5000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchData]);

  if (isSupplier) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Redirecting to Supplier Portal...</p>
      </div>
    );
  }

  const activeAuctions = auctions.filter(a => a.computedStatus === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Top Welcome & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Buyer Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time British Reverse Auction & RFQ Procurement Engine
          </p>
        </div>

        {/* Main Actions: [ Create RFQ & Auction ] and [ View Auctions ] */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/rfqs/new"
            className="flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create RFQ & Auction</span>
          </Link>
          <Link
            href="/auctions"
            className="flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors"
          >
            <Gavel className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>View Auctions</span>
          </Link>
        </div>
      </div>

      {/* Demo Highlight Banner */}
      <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-indigo-100/90 via-slate-100 to-indigo-50 dark:from-indigo-950/80 dark:via-slate-900 dark:to-indigo-950/50 border border-indigo-200 dark:border-indigo-700/40 relative overflow-hidden shadow-xs transition-colors">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                ⭐ Live Demo Ready
              </span>
              <span className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
                Instant British Auction Extension Test
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Nhava Sheva to Rotterdam (RFQ-2026-MUM-ROT)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Configured with a 2-minute trigger window and 1-minute extension on <span className="text-amber-700 dark:text-amber-300 font-semibold">L1_CHANGE</span>. Suppliers lower total freight to capture L1 before the forced close ceiling.
            </p>
          </div>

          {activeAuctions.length > 0 && (
            <Link
              href={`/auctions/${activeAuctions[0]._id}`}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-bold transition-colors shadow-xs flex-shrink-0"
            >
              <span>Launch Live Auction Room</span>
              <ArrowRight className="w-4 h-4 text-white dark:text-indigo-600" />
            </Link>
          )}
        </div>
      </div>

      {/* KPI Summary Cards: 5 Cards required by Spec */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total RFQs */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Total RFQs</span>
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {stats.totalRfqs}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Freight demands created</span>
        </div>

        {/* Active British Auctions */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Active Auctions</span>
            <Gavel className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {stats.activeAuctions}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Live bidding open</span>
        </div>

        {/* Upcoming Auctions */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Upcoming</span>
            <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
            {stats.upcomingAuctions}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Scheduled to start</span>
        </div>

        {/* Closed Auctions */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Closed</span>
            <CheckCircle2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-700 dark:text-slate-300 font-mono">
            {stats.closedAuctions}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Finalized / Ceilings hit</span>
        </div>

        {/* Total Bids Placed */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Total Bids</span>
            <TrendingDown className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 font-mono">
            {stats.totalBids}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Supplier submissions</span>
        </div>
      </div>

      {/* Main Grid: Active Auctions (Left 7 cols) & Recent Activity (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Auctions Section */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Gavel className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Live Auctions</h2>
            </div>
            <Link
              href="/auctions"
              className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center space-x-1 font-medium"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400">
              <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-xs">Loading auctions...</p>
            </div>
          ) : activeAuctions.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No active auctions right now</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Create a new RFQ & Auction to begin live competitive bidding.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAuctions.map((auction) => (
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
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 animate-pulse">
                      LIVE
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <Ship className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <span className="truncate">
                      {auction.rfqId?.origin?.port || 'Origin'} → {auction.rfqId?.destination?.port || 'Destination'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Current L1 Price:</span>
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {auction.currentL1Price ? `₹${auction.currentL1Price.toLocaleString()}` : 'No bids yet'}
                      </div>
                    </div>

                    <AuctionCountdown
                      bidCloseTime={auction.bidCloseTime}
                      forcedCloseTime={auction.forcedCloseTime}
                      triggerWindowMinutes={auction.triggerWindowMinutes}
                      status={auction.computedStatus}
                    />
                  </div>

                  <Link
                    href={`/auctions/${auction._id}`}
                    className="block w-full text-center py-2 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-semibold transition-colors"
                  >
                    Monitor Auction Room →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Stream (Right 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Activity</h2>
          </div>

          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3 transition-colors">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
                No recent auction activity logged yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {activities.map((act) => {
                  const isExtended = act.eventType === 'AUCTION_EXTENDED';
                  const isBid = act.eventType === 'BID_PLACED';
                  const isClosed = act.eventType === 'AUCTION_CLOSED' || act.eventType === 'AUCTION_FORCE_CLOSED';

                  return (
                    <div key={act._id} className="py-2.5 first:pt-0 last:pb-0 flex items-start space-x-3 text-xs">
                      <div className="mt-0.5 flex-shrink-0">
                        {isExtended ? (
                          <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Zap className="w-3.5 h-3.5" />
                          </div>
                        ) : isBid ? (
                          <div className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                            <TrendingDown className="w-3.5 h-3.5" />
                          </div>
                        ) : isClosed ? (
                          <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Activity className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {act.eventType.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {act.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
