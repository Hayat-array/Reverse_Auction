/**
 * Computes the real-time status of an auction based on current time and configured dates.
 *
 * Statuses:
 * - UPCOMING: Current time < bidStartTime
 * - ACTIVE: bidStartTime <= Current time < bidCloseTime and not forced-closed
 * - CLOSED: Current time >= bidCloseTime (and < forcedCloseTime)
 * - FORCE_CLOSED: Current time >= forcedCloseTime OR manually marked FORCE_CLOSED
 *
 * @param {Object} auction
 * @param {Date} [now]
 * @returns {'UPCOMING' | 'ACTIVE' | 'CLOSED' | 'FORCE_CLOSED'}
 */
export function getAuctionStatus(auction, now = new Date()) {
  if (!auction) return 'CLOSED';

  const currentTime = new Date(now).getTime();
  const startTime = new Date(auction.bidStartTime).getTime();
  const closeTime = new Date(auction.bidCloseTime).getTime();
  const forcedTime = new Date(auction.forcedCloseTime).getTime();

  if (auction.status === 'FORCE_CLOSED' || currentTime >= forcedTime) {
    return 'FORCE_CLOSED';
  }

  if (currentTime >= closeTime) {
    return 'CLOSED';
  }

  if (currentTime < startTime) {
    return 'UPCOMING';
  }

  return 'ACTIVE';
}

/**
 * Checks if the auction is currently accepting bids.
 */
export function isAuctionBiddable(auction, now = new Date()) {
  return getAuctionStatus(auction, now) === 'ACTIVE';
}
