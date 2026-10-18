'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Ship, 
  Trophy, 
  TrendingDown, 
  ShieldAlert, 
  Zap, 
  AlertTriangle,
  RotateCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import AuctionCountdown from '@/components/AuctionCountdown';
import LeaderboardTable from '@/components/LeaderboardTable';
import BidForm from '@/components/BidForm';
import ActivityTimeline from '@/components/ActivityTimeline';
import BritishAuctionRulesCard from '@/components/BritishAuctionRulesCard';

export default function AuctionDetailPage({ params }) {
  const resolvedParams = use(params);
  const auctionId = resolvedParams.id;

  const { currentUser, isSupplier } = useAuth();

  const [auction, setAuction] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Fetch auction data, rankings, and activity logs
  const fetchAllData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);

      const [aucRes, actRes] = await Promise.all([
        fetch(`/api/auctions/${auctionId}`),
        fetch(`/api/auctions/${auctionId}/activity`),
      ]);

      const aucData = await aucRes.json();
      const actData = await actRes.json();

      if (aucData.success) {
        setAuction(aucData.data);
      }
      if (actData.success) {
        setActivities(actData.data);
      }
    } catch (err) {
      console.error('Failed to load auction data:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAllData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAllData]);

  // Real-time updates via Server-Sent Events (SSE) + Safety Polling
  useEffect(() => {
    if (!auctionId) return;

    let eventSource = null;
    try {
      eventSource = new EventSource(`/api/auctions/${auctionId}/stream`);

      eventSource.addEventListener('update', (event) => {
        try {
          const updateData = JSON.parse(event.data);

          // Update auction state
          if (updateData.auction) {
            setAuction(prev => ({
              ...prev,
              ...updateData.auction,
              rankings: updateData.rankings || prev?.rankings,
              currentL1Price: updateData.auction.currentL1Price,
              currentL1SupplierName: updateData.auction.currentL1SupplierName,
              bidCloseTime: updateData.auction.bidCloseTime,
            }));
          }

          // Trigger toast alert for extensions or outbids
          if (updateData.type === 'AUCTION_EXTENDED') {
            setToastMessage({
              type: 'extension',
              title: '⚡ Auction Extended!',
              text: updateData.extension?.reason || 'Close time has been extended due to bidding in the trigger window.',
            });
            setTimeout(() => setToastMessage(null), 6000);
          } else if (updateData.type === 'NEW_BID') {
            setToastMessage({
              type: 'bid',
              title: '🚢 New Competitive Quote Placed',
              text: `${updateData.bid?.supplierName} submitted ₹${updateData.bid?.totalPrice?.toLocaleString()} via ${updateData.bid?.carrierName}`,
            });
            setTimeout(() => setToastMessage(null), 4000);
          }

          // Refetch activity log quietly
          fetch(`/api/auctions/${auctionId}/activity`)
            .then(res => res.json())
            .then(d => { if (d.success) setActivities(d.data); });

        } catch (e) {
          console.error('Error parsing SSE event:', e);
        }
      });

      eventSource.onerror = () => {
        // Fallback gracefully to polling if SSE drops
        eventSource.close();
      };
    } catch (e) {
      console.error('SSE initialization error:', e);
    }

    // Safety polling every 4 seconds to guarantee synchronized countdown and rankings
    const pollInterval = setInterval(() => {
      fetchAllData(true);
    }, 4000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(pollInterval);
    };
  }, [auctionId, fetchAllData]);

  if (loading && !auction) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center text-slate-500 dark:text-slate-400">
        <div className="animate-spin w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm font-medium">Entering British Auction Room...</p>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="text-base font-semibold text-slate-900 dark:text-white">Auction Not Found</p>
        <Link href="/auctions" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block">
          ← Return to Auctions
        </Link>
      </div>
    );
  }

  const rfq = auction.rfqId;
  const isAcceptingBids = auction.computedStatus === 'ACTIVE';

  return (
    <div className="space-y-6">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className={`p-4 rounded-xl border shadow-lg flex items-start space-x-3 transition-all animate-bounce ${
          toastMessage.type === 'extension'
            ? 'bg-amber-100 dark:bg-amber-950/90 border-amber-400 dark:border-amber-500 text-amber-900 dark:text-amber-200'
            : 'bg-indigo-100 dark:bg-indigo-950/90 border-indigo-400 dark:border-indigo-500 text-indigo-900 dark:text-indigo-200'
        }`}>
          <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-sm text-slate-900 dark:text-white">{toastMessage.title}</p>
            <p className="mt-0.5 text-slate-700 dark:text-slate-200">{toastMessage.text}</p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Back button & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href={isSupplier ? '/supplier/auctions' : '/auctions'}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Auctions</span>
        </Link>

        {/* Live Refresh Trigger */}
        <button
          onClick={() => fetchAllData(false)}
          className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          title="Manual refresh"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/60 px-2 py-0.5 rounded border dark:border-indigo-800/50">
                {rfq?.referenceId || 'RFQ-2026'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Buyer: <span className="text-slate-800 dark:text-slate-200 font-semibold">{rfq?.buyerName}</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {auction.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300 mt-2">
              <div className="flex items-center space-x-1.5">
                <Ship className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-medium">
                  {rfq?.origin?.port} ({rfq?.origin?.country}) → {rfq?.destination?.port} ({rfq?.destination?.country})
                </span>
              </div>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>{rfq?.containerType} x {rfq?.quantity}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>Cargo: {rfq?.commodity}</span>
            </div>
          </div>

          {/* Countdown & Status */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <AuctionCountdown
              bidCloseTime={auction.bidCloseTime}
              forcedCloseTime={auction.forcedCloseTime}
              triggerWindowMinutes={auction.triggerWindowMinutes}
              status={auction.computedStatus}
            />
          </div>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lowest L1 Bid */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Current Lowest (L1)</span>
            <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {auction.currentL1Price ? `₹${auction.currentL1Price.toLocaleString()}` : 'No Bids'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {auction.currentL1SupplierName ? `Held by ${auction.currentL1SupplierName}` : 'Awaiting quotes'}
          </p>
        </div>

        {/* Total Bids */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Total Quotes</span>
            <TrendingDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {auction.totalBidsCount || 0}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {auction.rankings?.length || 0} competing suppliers
          </p>
        </div>

        {/* Extensions Status */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Extensions</span>
            <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
            {auction.extensionsCount || 0}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            +{auction.extensionDurationMinutes}m on {auction.extensionTrigger}
          </p>
        </div>

        {/* Forced Close Ceiling */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
            <span>Forced Close Ceiling</span>
            <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400 font-mono truncate">
            {new Date(auction.forcedCloseTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <p className="text-[11px] text-red-600/80 dark:text-red-400/80 mt-1">
            Absolute immutable end
          </p>
        </div>
      </div>

      {/* Main Grid: Leaderboard + Bid Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Leaderboard Table (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <LeaderboardTable rankings={auction.rankings} />

          {/* Engine Parameters Card */}
          <BritishAuctionRulesCard auction={auction} />
        </div>

        {/* Right Column: Bid Submission + Activity Stream (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <BidForm
            auctionId={auction._id}
            isAcceptingBids={isAcceptingBids}
            status={auction.computedStatus}
            currentL1Price={auction.currentL1Price}
            rankings={auction.rankings}
            onBidSuccess={() => fetchAllData(true)}
          />

          <ActivityTimeline activities={activities} />
        </div>
      </div>
    </div>
  );
}
