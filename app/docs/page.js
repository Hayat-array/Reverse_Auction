'use client';

import React from 'react';
import { 
  BookOpen, 
  TrendingDown, 
  ShieldCheck, 
  Zap, 
  Cpu 
} from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <BookOpen className="w-4 h-4" />
          <span>System Documentation & Architecture</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          British Auction Engine: Technical Specification & HLD
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          Comprehensive architecture documentation, mathematical formulations, concurrency guarantees, and interview discussion points for the British Reverse Auction in Logistics RFQ system.
        </p>
      </div>

      {/* 1. Core Mechanics & Mathematical Invariant */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs transition-colors">
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
          <TrendingDown className="w-5 h-5" />
          <h2>1. British Auction Reverse Procurement Mechanics</h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          In logistics procurement, carriers compete for high-volume shipment contracts by submitting quotes. The lowest valid quote holds the <strong className="text-emerald-600 dark:text-emerald-400">L1 rank</strong>.
        </p>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">The Hard Ceiling Formula:</span>
          <div className="font-mono text-xs sm:text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-slate-950 p-3 rounded border border-amber-200 dark:border-slate-800">
            newCloseTime = MIN(currentCloseTime + extensionDuration, forcedCloseTime)
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Even with multiple consecutive extensions triggered by last-minute bids, <span className="text-red-600 dark:text-red-300 font-semibold">the auction will never extend beyond the forcedCloseTime</span>.
          </p>
        </div>
      </div>

      {/* 2. Extension Triggers */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs transition-colors">
        <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
          <Zap className="w-5 h-5" />
          <h2>2. The Three Configurable Extension Triggers</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white block">A. BID_RECEIVED</span>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
              Extends whenever any valid quote is placed during the trigger window, regardless of whether rank changed.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white block">B. RANK_CHANGE</span>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
              Extends if any supplier’s rank changes (e.g. Supplier climbs from L3 to L2, or a new supplier enters).
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white block">C. L1_CHANGE</span>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
              Only extends when the overall leader (L1) changes hands (or first bid is placed) within the trigger window.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Realtime & Concurrency Architecture */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs transition-colors">
        <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400 font-bold text-sm">
          <Cpu className="w-5 h-5" />
          <h2>3. Realtime Streaming & Concurrency Handling</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Server-Sent Events (SSE)</span>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Realtime auction updates stream to browsers over <code className="text-indigo-600 dark:text-indigo-300 font-mono">/api/auctions/[id]/stream</code> using HTTP/2 multiplexing. Includes automatic 4-second safety polling fallback.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Race Condition Prevention</span>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Optimistic concurrency locking using an atomic document <code className="text-indigo-600 dark:text-indigo-300 font-mono">version</code> counter. Tie-breaking by earliest timestamp prevents inconsistent standings.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Interview Talking Points */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs transition-colors">
        <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
          <ShieldCheck className="w-5 h-5" />
          <h2>4. Interview Discussion Reference & Scalability (10,000+ Auctions)</h2>
        </div>

        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-800">
            <strong className="text-slate-900 dark:text-white block mb-1">Why MongoDB over Relational DB?</strong>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Logistics RFQs require flexible shipment schemas (varying container types, multiple charge components, dynamic quote validity). MongoDB’s document model provides sub-millisecond atomic updates and high write throughput for rapid bidding.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-800">
            <strong className="text-slate-900 dark:text-white block mb-1">How to scale to 10,000+ Concurrent Auctions?</strong>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              1. Replace in-memory event bus with Redis Pub/Sub.<br />
              2. Shard MongoDB collections on <code className="text-indigo-600 dark:text-indigo-300 font-mono">auctionId</code> so each auction’s bids live on the same shard.<br />
              3. Cache active auction L1 prices and close times in Redis to serve reads without hitting the primary database.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-800">
            <strong className="text-slate-900 dark:text-white block mb-1">How is the Forced Close Invariant Enforced?</strong>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              At both the API validation layer and the pure engine level: <code className="text-amber-700 dark:text-amber-300 font-mono">newCloseTime = Math.min(potentialClose, forcedClose)</code>. If <code className="text-amber-700 dark:text-amber-300 font-mono">now &gt;= forcedCloseTime</code>, incoming bids are rejected with code <code className="text-red-600 dark:text-red-300 font-mono">AUCTION_FORCE_CLOSED</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
