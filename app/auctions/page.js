'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Gavel, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Ship, 
  ChevronRight
} from 'lucide-react';
import AuctionCountdown from '@/components/AuctionCountdown';

export default function AuctionsPage() {
  const router = useRouter();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchAuctions = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (statusFilter) queryParams.set('status', statusFilter);
      queryParams.set('sortBy', sortBy);
      queryParams.set('sortOrder', sortOrder);

      const res = await fetch(`/api/auctions?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAuctions(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch auctions:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAuctions();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAuctions]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
            ACTIVE
          </span>
        );
      case 'UPCOMING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30">
            UPCOMING
          </span>
        );
      case 'FORCE_CLOSED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30">
            FORCE CLOSED
          </span>
        );
      case 'CLOSED':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-700/60 dark:text-slate-300 dark:border-slate-600">
            CLOSED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            British Reverse Auctions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse and monitor competitive RFQ bidding events
          </p>
        </div>
        <Link
          href="/rfqs/new"
          className="self-start sm:self-auto px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          + Create New RFQ
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs transition-colors">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by reference ID, title, origin or destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
        </div>

        {/* Filter by Status */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="CLOSED">Closed</option>
            <option value="FORCE_CLOSED">Force Closed</option>
          </select>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2">
          <ArrowUpDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split(':');
              setSortBy(sb);
              setSortOrder(so);
            }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <option value="createdAt:desc">Newest First</option>
            <option value="bidCloseTime:asc">Closing Soonest</option>
            <option value="currentL1Price:asc">Lowest L1 Price</option>
            <option value="totalBidsCount:desc">Most Bids</option>
          </select>
        </div>
      </div>

      {/* Auctions Table / List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500 dark:text-slate-400">
          <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-xs">Loading auctions...</p>
        </div>
      ) : auctions.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <Gavel className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No auctions matched your filters</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try resetting your search query or status filter.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
          <div className="sm:hidden px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Auctions ({auctions.length})</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400 text-[10px]">Swipe horizontally ➔</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">RFQ Ref / Title</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4 text-right">Current Lowest (L1)</th>
                  <th className="py-3 px-4 text-center">Bids</th>
                  <th className="py-3 px-4">Close Time / Timer</th>
                  <th className="py-3 px-4 text-right">Forced Close</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {auctions.map((auction) => (
                  <tr
                    key={auction._id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => {
                      router.push(`/auctions/${auction._id}`);
                    }}
                  >
                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(auction.computedStatus)}
                    </td>

                    {/* RFQ Ref & Title */}
                    <td className="py-3.5 px-4 max-w-[220px]">
                      <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold block">
                        {auction.rfqId?.referenceId || 'RFQ-2026'}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white truncate block group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                        {auction.title}
                      </span>
                    </td>

                    {/* Route */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Ship className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{auction.rfqId?.origin?.port} → {auction.rfqId?.destination?.port}</span>
                      </div>
                    </td>

                    {/* Current Lowest (L1) */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 block">
                        {auction.currentL1Price ? `₹${auction.currentL1Price.toLocaleString()}` : '—'}
                      </span>
                      {auction.currentL1SupplierName && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[120px] ml-auto">
                          {auction.currentL1SupplierName}
                        </span>
                      )}
                    </td>

                    {/* Total Bids */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {auction.totalBidsCount || 0}
                      </span>
                    </td>

                    {/* Bid Close / Timer */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <AuctionCountdown
                          bidCloseTime={auction.bidCloseTime}
                          forcedCloseTime={auction.forcedCloseTime}
                          triggerWindowMinutes={auction.triggerWindowMinutes}
                          status={auction.computedStatus}
                        />
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">
                          Closes: {new Date(auction.bidCloseTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    {/* Forced Close Hard Ceiling */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {new Date(auction.forcedCloseTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    {/* Action link */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 font-semibold text-xs">
                        <span>Details</span>
                        <ChevronRight className="w-4 h-4 ml-0.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
