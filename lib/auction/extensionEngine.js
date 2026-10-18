/**
 * Evaluates whether a bid qualifies for an auction extension according to British Auction rules.
 *
 * Rule:
 * newCloseTime = MIN(currentCloseTime + extensionDuration, forcedCloseTime)
 *
 * Triggers:
 * 1. BID_RECEIVED: Any valid bid placed within the trigger window.
 * 2. RANK_CHANGE: Any supplier rank shift (e.g. L3 -> L2 or new supplier entered) within trigger window.
 * 3. L1_CHANGE: Only when L1 lowest bidder changes (or first bid becomes L1) within trigger window.
 *
 * @param {Object} params
 * @param {Object} params.auction Current auction document
 * @param {Date|string} [params.bidTimestamp] Timestamp of the bid (default: now)
 * @param {boolean} params.didL1Change Whether L1 changed
 * @param {boolean} params.didAnyRankChange Whether any rank changed
 * @param {string} [params.supplierName] Submitting supplier's name
 * @returns {{
 *   shouldExtend: boolean,
 *   reason: string|null,
 *   oldCloseTime: Date,
 *   newCloseTime: Date,
 *   extensionMinutesAdded: number,
 *   isInTriggerWindow: boolean,
 *   triggerWindowStart: Date,
 *   forcedCloseHit: boolean
 * }}
 */
export function evaluateAuctionExtension({
  auction,
  bidTimestamp = new Date(),
  didL1Change = false,
  didAnyRankChange = false,
  supplierName = '',
}) {
  const bidTime = new Date(bidTimestamp).getTime();
  const currentCloseTime = new Date(auction.bidCloseTime);
  const currentCloseMs = currentCloseTime.getTime();
  const forcedCloseTime = new Date(auction.forcedCloseTime);
  const forcedCloseMs = forcedCloseTime.getTime();

  const triggerWindowMinutes = Number(auction.triggerWindowMinutes);
  const extensionDurationMinutes = Number(auction.extensionDurationMinutes);
  const triggerType = auction.extensionTrigger; // 'BID_RECEIVED' | 'RANK_CHANGE' | 'L1_CHANGE'

  // Trigger window starts triggerWindowMinutes before current close time
  const triggerWindowStartMs = currentCloseMs - (triggerWindowMinutes * 60 * 1000);
  const triggerWindowStart = new Date(triggerWindowStartMs);

  // Is the bid placed within the trigger window?
  const isInTriggerWindow = bidTime >= triggerWindowStartMs && bidTime < currentCloseMs;

  // If already at or past forced close time, cannot extend
  if (currentCloseMs >= forcedCloseMs) {
    return {
      shouldExtend: false,
      reason: 'Auction has already reached or passed forced close ceiling',
      oldCloseTime: currentCloseTime,
      newCloseTime: currentCloseTime,
      extensionMinutesAdded: 0,
      isInTriggerWindow,
      triggerWindowStart,
      forcedCloseHit: true,
    };
  }

  // If not inside the trigger window, no extension
  if (!isInTriggerWindow) {
    return {
      shouldExtend: false,
      reason: `Bid received outside trigger window (${triggerWindowMinutes} min before close)`,
      oldCloseTime: currentCloseTime,
      newCloseTime: currentCloseTime,
      extensionMinutesAdded: 0,
      isInTriggerWindow: false,
      triggerWindowStart,
      forcedCloseHit: false,
    };
  }

  // Check trigger condition
  let conditionMet = false;
  let triggerReason = '';

  switch (triggerType) {
    case 'BID_RECEIVED':
      conditionMet = true;
      triggerReason = `Qualifying bid submitted by ${supplierName || 'supplier'} in last ${triggerWindowMinutes}m window`;
      break;

    case 'RANK_CHANGE':
      conditionMet = didAnyRankChange;
      triggerReason = didAnyRankChange
        ? `Supplier rank change triggered by ${supplierName || 'supplier'} in last ${triggerWindowMinutes}m window`
        : `Bid in trigger window did not alter supplier rankings (required for RANK_CHANGE)`;
      break;

    case 'L1_CHANGE':
      conditionMet = didL1Change;
      triggerReason = didL1Change
        ? `Lowest bidder (L1) rank changed to ${supplierName || 'new leader'} in last ${triggerWindowMinutes}m window`
        : `Bid in trigger window did not change L1 leader (required for L1_CHANGE)`;
      break;

    default:
      conditionMet = false;
      triggerReason = `Unknown extension trigger: ${triggerType}`;
  }

  if (!conditionMet) {
    return {
      shouldExtend: false,
      reason: triggerReason,
      oldCloseTime: currentCloseTime,
      newCloseTime: currentCloseTime,
      extensionMinutesAdded: 0,
      isInTriggerWindow: true,
      triggerWindowStart,
      forcedCloseHit: false,
    };
  }

  // Calculate potential new close time:
  // newCloseTime = MIN(currentCloseTime + extensionDuration, forcedCloseTime)
  const potentialNewCloseMs = currentCloseMs + (extensionDurationMinutes * 60 * 1000);
  const boundedNewCloseMs = Math.min(potentialNewCloseMs, forcedCloseMs);
  const boundedNewCloseTime = new Date(boundedNewCloseMs);

  // Check if we actually extended by at least 1 millisecond
  const shouldExtend = boundedNewCloseMs > currentCloseMs;
  const extensionMinutesAdded = Math.round((boundedNewCloseMs - currentCloseMs) / (60 * 1000) * 10) / 10;
  const forcedCloseHit = boundedNewCloseMs === forcedCloseMs;

  let finalReason = triggerReason;
  if (shouldExtend) {
    if (forcedCloseHit) {
      finalReason += ` — Extended by ${extensionMinutesAdded}m (capped exactly at Forced Close: ${forcedCloseTime.toLocaleTimeString()})`;
    } else {
      finalReason += ` — Extended by ${extensionDurationMinutes}m to ${boundedNewCloseTime.toLocaleTimeString()}`;
    }
  }

  return {
    shouldExtend,
    reason: finalReason,
    oldCloseTime: currentCloseTime,
    newCloseTime: boundedNewCloseTime,
    extensionMinutesAdded,
    isInTriggerWindow: true,
    triggerWindowStart,
    forcedCloseHit,
  };
}
