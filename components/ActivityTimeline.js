'use client';

import React from 'react';
import { 
  Clock, 
  Send, 
  TrendingDown, 
  Zap, 
  AlertOctagon, 
  CheckCircle2, 
  Flag,
  ArrowRight
} from 'lucide-react';

/**
 * Activity Log Timeline for Auction Events
 *
 * @param {Object} props
 * @param {Array} props.activities List of activity log documents
 * @param {boolean} [props.isLoading]
 */
export default function ActivityTimeline({ activities = [], isLoading = false }) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-slate-500 dark:text-slate-400">
        <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-xs">Loading activity stream...</p>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-xs text-slate-500 dark:text-slate-400">
        No auction activity recorded yet.
      </div>
    );
  }

  const getEventBadge = (eventType) => {
    switch (eventType) {
      case 'AUCTION_EXTENDED':
        return {
          icon: Zap,
          color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/30',
          title: 'Auction Extended',
        };
      case 'BID_PLACED':
        return {
          icon: Send,
          color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/30',
          title: 'Bid Placed',
        };
      case 'RANK_CHANGED':
        return {
          icon: TrendingDown,
          color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30',
          title: 'Rank Shift',
        };
      case 'AUCTION_FORCE_CLOSED':
        return {
          icon: AlertOctagon,
          color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/15 border-red-300 dark:border-red-500/30',
          title: 'Force Closed',
        };
      case 'AUCTION_CLOSED':
        return {
          icon: CheckCircle2,
          color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-500/15 border-slate-300 dark:border-slate-500/30',
          title: 'Auction Closed',
        };
      default:
        return {
          icon: Flag,
          color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-500/15 border-cyan-300 dark:border-cyan-500/30',
          title: 'Auction Notice',
        };
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Audit Trail & Extension History</h3>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{activities.length} total events</span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {activities.map((act, index) => {
          const badge = getEventBadge(act.eventType);
          const Icon = badge.icon;
          const isExtension = act.eventType === 'AUCTION_EXTENDED';

          return (
            <div key={act._id || index} className="relative group">
              {/* Dot Icon on the line */}
              <div
                className={`absolute -left-[27px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center border ${badge.color} bg-white dark:bg-slate-900 shadow-xs`}
              >
                <Icon className="w-3 h-3" />
              </div>

              {/* Event Content */}
              <div
                className={`p-3 rounded-lg border text-xs transition-colors ${
                  isExtension
                    ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-600/40 dark:text-amber-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-semibold uppercase tracking-wider text-[10px] ${
                    isExtension ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {badge.title}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                <p className="text-slate-800 dark:text-slate-200 leading-snug">{act.description}</p>

                {/* Show extension times if available */}
                {isExtension && act.oldCloseTime && act.newCloseTime && (
                  <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/40 flex items-center space-x-2 text-[11px] font-mono text-amber-800 dark:text-amber-300">
                    <span className="text-slate-500 dark:text-slate-400">Close Time Extended:</span>
                    <span>{new Date(act.oldCloseTime).toLocaleTimeString()}</span>
                    <ArrowRight className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                      {new Date(act.newCloseTime).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
