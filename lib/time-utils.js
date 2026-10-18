import { getAuctionStatus, isAuctionBiddable } from './auction/status.js';

export { getAuctionStatus, isAuctionBiddable };

/**
 * Calculates remaining milliseconds until auction bid close or forced close.
 */
export function getRemainingMs(targetTime, now = new Date()) {
  const target = new Date(targetTime).getTime();
  const current = new Date(now).getTime();
  return Math.max(0, target - current);
}

/**
 * Formats milliseconds into HH:MM:SS or MM:SS string
 */
export function formatTimeRemaining(ms) {
  if (ms <= 0) return '00:00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Determines whether the current timestamp is inside the extension trigger window.
 */
export function checkInTriggerWindow(auction, now = new Date()) {
  const current = new Date(now).getTime();
  const close = new Date(auction.bidCloseTime).getTime();
  const windowMs = (Number(auction.triggerWindowMinutes) || 10) * 60 * 1000;
  const windowStart = close - windowMs;

  return current >= windowStart && current < close;
}

/**
 * Returns human-readable time format e.g. "6:05 PM"
 */
export function formatLocalTime(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
