'use client';

import React from 'react';
import { Sliders, Shield, Zap, Info, Clock, AlertTriangle } from 'lucide-react';

/**
 * British Auction Engine Rules & Parameters Card
 *
 * @param {Object} props
 * @param {Object} props.auction
 */
export default function BritishAuctionRulesCard({ auction }) {
  if (!auction) return null;

  const getTriggerDetails = (type) => {
    switch (type) {
      case 'BID_RECEIVED':
        return {
          title: 'Bid Received in Last X Minutes',
          description: 'Any valid new quote received within the trigger window immediately triggers an extension.',
        };
      case 'RANK_CHANGE':
        return {
          title: 'Any Supplier Rank Change in Last X Minutes',
          description: 'An extension triggers if any supplier moves up or down in the standings (e.g. L3 to L2).',
        };
      case 'L1_CHANGE':
        return {
          title: 'Lowest Bidder (L1) Change in Last X Minutes',
          description: 'An extension only triggers if the overall lowest price leader (L1) is overtaken.',
        };
      default:
        return { title: type, description: '' };
    }
  };

  const trigger = getTriggerDetails(auction.extensionTrigger);

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 transition-colors">
      <div className="flex items-center space-x-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <h3 className="font-semibold text-slate-900 dark:text-white text-sm">British Auction Engine Parameters</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Trigger Window */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Trigger Window</span>
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
            {auction.triggerWindowMinutes} min
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Activity window before close
          </p>
        </div>

        {/* Extension Duration */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Extension Duration</span>
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
            +{auction.extensionDurationMinutes} min
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Time added per qualifying event
          </p>
        </div>

        {/* Extensions Triggered */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Extensions Occurred</span>
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
            {auction.extensionsCount || 0} times
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Dynamic extensions so far
          </p>
        </div>
      </div>

      {/* Trigger Rule Description */}
      <div className="p-3 bg-indigo-50/70 border border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/40 rounded-lg text-xs space-y-1">
        <div className="flex items-center space-x-1.5 text-indigo-700 dark:text-indigo-300 font-semibold">
          <Info className="w-3.5 h-3.5" />
          <span>Configured Trigger: {trigger.title}</span>
        </div>
        <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
          {trigger.description}
        </p>
      </div>

      {/* Forced Close Invariant Notice */}
      <div className="p-3 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/40 rounded-lg flex items-start space-x-2 text-xs text-red-800 dark:text-red-300">
        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <span className="font-semibold text-red-900 dark:text-red-200">Strict Invariant:</span> No extension will ever surpass the Forced Close Time ({new Date(auction.forcedCloseTime).toLocaleTimeString()}). Formula: <code className="text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-950/60 px-1 py-0.5 rounded font-mono">newCloseTime = MIN(currentCloseTime + extensionDuration, forcedCloseTime)</code>.
        </div>
      </div>
    </div>
  );
}
