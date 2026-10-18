'use client';

import React from 'react';
import { Trophy, TrendingDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * British Auction Supplier Ranking Leaderboard
 *
 * @param {Object} props
 * @param {Array} props.rankings Computed rankings array
 * @param {boolean} [props.isLoading]
 */
export default function LeaderboardTable({ rankings = [], isLoading = false }) {
  const { currentUser } = useAuth();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400">
        <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-xs">Computing live standings...</p>
      </div>
    );
  }

  if (!rankings || rankings.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
        <TrendingDown className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Bids Placed Yet</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          The auction is open for bidding. Suppliers can submit competitive freight quotes below.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
      <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Live Supplier Leaderboard</h3>
        </div>
        <div className="flex items-center space-x-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
          <span>Ranked by lowest valid quote (Reverse Auction)</span>
          <span className="sm:hidden font-mono text-[10px] text-indigo-500 dark:text-indigo-400">• Scroll ➔</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Supplier</th>
              <th className="py-3 px-4">Carrier / Vessel</th>
              <th className="py-3 px-4 text-right">Freight Charges</th>
              <th className="py-3 px-4 text-right">Origin / Dest</th>
              <th className="py-3 px-4 text-right">Total Quote</th>
              <th className="py-3 px-4 text-center">Transit</th>
              <th className="py-3 px-4 text-right">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {rankings.map((item) => {
              const isL1 = item.rank === 1;
              const isCurrentUser = currentUser && String(currentUser._id) === String(item.supplierId);

              return (
                <tr
                  key={item.supplierId}
                  className={`transition-colors ${
                    isL1
                      ? 'bg-emerald-50 hover:bg-emerald-100/60 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/35 border-l-4 border-l-emerald-500'
                      : isCurrentUser
                      ? 'bg-indigo-50 hover:bg-indigo-100/60 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30 border-l-4 border-l-indigo-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Rank Badge */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-1.5">
                      {isL1 ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-bold">
                          <Trophy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>L1</span>
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded font-semibold ${
                          item.rank === 2
                            ? 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400'
                        }`}>
                          {item.rankLabel}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Supplier Name */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold ${isL1 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>
                        {item.supplierName}
                      </span>
                      {isCurrentUser && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">
                          YOU
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Carrier */}
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {item.carrierName || 'Direct Carrier'}
                  </td>

                  {/* Freight Charges */}
                  <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                    ₹{item.freightCharges?.toLocaleString()}
                  </td>

                  {/* Origin + Destination Charges */}
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500 dark:text-slate-400">
                    ₹{(item.originCharges + item.destinationCharges)?.toLocaleString()}
                  </td>

                  {/* Total Price */}
                  <td className="py-3.5 px-4 text-right">
                    <span className={`font-mono font-bold text-sm ${
                      isL1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      ₹{item.totalPrice?.toLocaleString()}
                    </span>
                  </td>

                  {/* Transit Days */}
                  <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-300">
                    {item.transitTime} days
                  </td>

                  {/* Bid Submitted Time */}
                  <td className="py-3.5 px-4 text-right text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
