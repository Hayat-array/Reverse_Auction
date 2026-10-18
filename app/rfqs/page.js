'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Search, 
  Ship, 
  PlusCircle, 
  Gavel, 
  ChevronRight 
} from 'lucide-react';

export default function RFQListPage() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchRFQs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/rfqs?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setRfqs(data.data);
      }
    } catch (err) {
      console.error('Failed to load RFQs:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRFQs();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchRFQs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Requests For Quotation (RFQs)</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage procurement requests and linked British auction events
          </p>
        </div>
        <Link
          href="/rfqs/new"
          className="self-start sm:self-auto px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New RFQ</span>
        </Link>
      </div>

      {/* Search Input */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by RFQ Reference ID, Title, Origin or Destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* RFQ List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500 dark:text-slate-400">
          <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-xs">Loading RFQs...</p>
        </div>
      ) : rfqs.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No RFQs found</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Click &quot;Create New RFQ&quot; to publish your first freight procurement request.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rfqs.map((rfq) => (
            <div
              key={rfq._id}
              className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-5 shadow-xs hover:shadow-sm space-y-4 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold block">
                    {rfq.referenceId}
                  </span>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm mt-0.5 line-clamp-1">
                    {rfq.title}
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Buyer: {rfq.buyerName}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                  {rfq.status}
                </span>
              </div>

              {/* Route */}
              <div className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <Ship className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <span className="truncate">
                  {rfq.origin?.port} ({rfq.origin?.country}) → {rfq.destination?.port} ({rfq.destination?.country})
                </span>
              </div>

              {/* Cargo Details */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px]">CONTAINER & COMMODITY</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium truncate block">
                    {rfq.containerType} x {rfq.quantity}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px]">SERVICE DATE</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {new Date(rfq.serviceDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Link to Auction if exists */}
              {rfq.auctionId && (
                <Link
                  href={`/auctions/${rfq.auctionId._id || rfq.auctionId}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 dark:border-indigo-800/40 text-xs font-semibold transition-colors"
                >
                  <div className="flex items-center space-x-1.5">
                    <Gavel className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Open British Auction Room</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
