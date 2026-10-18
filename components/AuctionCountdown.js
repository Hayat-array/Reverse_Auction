'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

/**
 * Real-time Auction Countdown Timer with British Auction Trigger Window detection.
 *
 * @param {Object} props
 * @param {Date|string} props.bidCloseTime
 * @param {Date|string} props.forcedCloseTime
 * @param {number} props.triggerWindowMinutes
 * @param {string} props.status
 * @param {Function} [props.onExpire]
 */
export default function AuctionCountdown({
  bidCloseTime,
  forcedCloseTime,
  triggerWindowMinutes = 10,
  status = 'ACTIVE',
  onExpire,
}) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isInTriggerWindow: false,
    isExpired: false,
    isForceClosed: false,
  });

  useEffect(() => {
    const calculateTime = () => {
      const now = Date.now();
      const closeMs = new Date(bidCloseTime).getTime();
      const forcedMs = new Date(forcedCloseTime).getTime();
      const triggerStartMs = closeMs - Number(triggerWindowMinutes) * 60 * 1000;

      const diffMs = closeMs - now;
      const isForceClosed = now >= forcedMs || status === 'FORCE_CLOSED';
      const isExpired = diffMs <= 0 || isForceClosed || status === 'CLOSED';
      const isInTriggerWindow = !isExpired && now >= triggerStartMs && now < closeMs;

      if (isExpired) {
        setTimeLeft((prev) => {
          if (!prev.isExpired && typeof onExpire === 'function') {
            setTimeout(onExpire, 0);
          }
          return {
            hours: 0,
            minutes: 0,
            seconds: 0,
            totalSeconds: 0,
            isInTriggerWindow: false,
            isExpired: true,
            isForceClosed,
          };
        });
        return;
      }

      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({
        hours,
        minutes,
        seconds,
        totalSeconds,
        isInTriggerWindow,
        isExpired: false,
        isForceClosed: false,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [bidCloseTime, forcedCloseTime, triggerWindowMinutes, status, onExpire]);

  if (timeLeft.isForceClosed) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-red-100 text-red-800 border border-red-200 dark:bg-red-950/60 dark:border-red-800 dark:text-red-400 text-xs font-semibold">
        <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
        <span>FORCE CLOSED (Ceiling Reached)</span>
      </div>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 text-xs font-semibold">
        <CheckCircle2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span>AUCTION CLOSED</span>
      </div>
    );
  }

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Trigger Window Banner badge */}
      {timeLeft.isInTriggerWindow && (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-100 border border-amber-300 text-amber-800 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300 text-xs font-semibold animate-pulse flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Trigger Window ({triggerWindowMinutes}m)</span>
        </span>
      )}

      {/* Clock display */}
      <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border font-mono transition-colors flex-shrink-0 ${
        timeLeft.isInTriggerWindow
          ? 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:border-amber-600/50 dark:text-amber-300'
          : 'bg-slate-100 border-slate-200 text-emerald-700 dark:bg-slate-900 dark:border-slate-700 dark:text-emerald-400'
      }`}>
        <Clock className={`w-4 h-4 ${timeLeft.isInTriggerWindow ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
        <span className="text-sm font-bold tracking-wider">
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    </div>
  );
}
