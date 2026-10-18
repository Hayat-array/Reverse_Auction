'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  Gavel, 
  Search, 
  Filter, 
  Ship, 
  ArrowRight,
  Trophy,
  RotateCw
} from 'lucide-react';
import AuctionCountdown from '@/components/AuctionCountdown';

export default function SupplierAuctionsPage() {
  const { currentUser } = useAuth();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  const userId = currentUser?.id || currentUser?._id;

  const fetchAuctions = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (statusFilter) queryParams.set('status', statusFilter);

      const res = await fetch(`/api/auctions?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAuctions(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load supplier auctions:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAuctions();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAuctions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Available Auctions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse active and upcoming British reverse auctions to submit competitive freight quotes
          </p>
        </div>

        <button
          onClick={fetchAuctions}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors w-fit"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 transition-colors">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by lane, port, RFQ code or commodity..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Status Pill Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: '', label: 'All' },
            { id: 'ACTIVE', label: 'Live Active' },
            { id: 'PENDING', label: 'Upcoming' },
            { id: 'CLOSED', label: 'Closed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Auctions Grid */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500 dark:text-slate-400">
          <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-xs">Loading auctions...</p>
        </div>
      ) : auctions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500 dark:text-slate-400">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No auctions match your criteria</p>
          <p className="text-xs mt-1">Try clearing search filters or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {auctions.map((auction) => {
            const myRank = auction.rankings?.find(r => String(r.supplierId) === String(userId));
            const isL1 = myRank?.rank === 1;

            return (
              <div
                key={auction._id}
                className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-5 shadow-xs space-y-4 transition-all"
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
                      <Trophy className="w-3 h-3 text-amber-600" />
                      <span>YOU HOLD L1</span>
                    </span>
                  ) : myRank ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      Rank #{myRank.rank}
                    </span>
                  ) : auction.computedStatus === 'ACTIVE' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 animate-pulse">
                      LIVE
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      {auction.computedStatus}
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
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Current L1 Price:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {auction.currentL1Price ? `₹${auction.currentL1Price.toLocaleString()}` : 'No bids yet'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Your Best Bid:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {myRank ? `₹${myRank.totalPrice.toLocaleString()}` : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80">
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
                    <span>{auction.computedStatus === 'ACTIVE' ? 'Enter Room & Bid' : 'View Details'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
