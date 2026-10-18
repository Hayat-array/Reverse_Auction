/**
 * Computes supplier rankings (L1, L2, L3, ...) from a list of bids.
 * 
 * Rules:
 * 1. For each unique supplier, only their lowest (best) bid is considered.
 * 2. Suppliers are sorted by:
 *    - Lowest totalPrice ascending
 *    - Earliest bid submission time (createdAt) ascending for tie-breaking
 * 3. Ranks are assigned 1-indexed (1 -> L1, 2 -> L2, etc.).
 *
 * @param {Array<Object>} bids
 * @returns {Array<Object>} Array of ranked entries: { rank, rankLabel: 'L1', supplierId, supplierName, carrierName, totalPrice, bidId, createdAt, ... }
 */
export function computeSupplierRankings(bids = []) {
  if (!bids || bids.length === 0) {
    return [];
  }

  // 1. Group bids by supplierId and find each supplier's lowest bid
  const bestBidBySupplier = new Map();

  for (const bid of bids) {
    const sId = String(bid.supplierId?._id || bid.supplierId);
    const existing = bestBidBySupplier.get(sId);

    if (!existing) {
      bestBidBySupplier.set(sId, bid);
    } else {
      const existingPrice = Number(existing.totalPrice);
      const newPrice = Number(bid.totalPrice);

      if (newPrice < existingPrice) {
        bestBidBySupplier.set(sId, bid);
      } else if (newPrice === existingPrice) {
        // Tie breaker: earliest timestamp wins
        const existingTime = new Date(existing.createdAt || 0).getTime();
        const newTime = new Date(bid.createdAt || 0).getTime();
        if (newTime < existingTime) {
          bestBidBySupplier.set(sId, bid);
        }
      }
    }
  }

  // 2. Sort the best bids
  const sortedBids = Array.from(bestBidBySupplier.values()).sort((a, b) => {
    const priceA = Number(a.totalPrice);
    const priceB = Number(b.totalPrice);

    if (priceA !== priceB) {
      return priceA - priceB;
    }

    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeA - timeB;
  });

  // 3. Assign ranks
  return sortedBids.map((bid, index) => {
    const rank = index + 1;
    return {
      rank,
      rankLabel: `L${rank}`,
      supplierId: String(bid.supplierId?._id || bid.supplierId),
      supplierName: bid.supplierName,
      carrierName: bid.carrierName,
      totalPrice: Number(bid.totalPrice),
      freightCharges: Number(bid.freightCharges || 0),
      originCharges: Number(bid.originCharges || 0),
      destinationCharges: Number(bid.destinationCharges || 0),
      transitTime: bid.transitTime,
      quoteValidity: bid.quoteValidity,
      bidId: String(bid._id || bid.id),
      createdAt: bid.createdAt,
      isL1: rank === 1,
    };
  });
}

/**
 * Compares old rankings and new rankings to identify:
 * 1. Did the L1 supplier change?
 * 2. Did any supplier's rank change?
 *
 * @param {Array<Object>} oldRankings
 * @param {Array<Object>} newRankings
 * @returns {{ didL1Change: boolean, didAnyRankChange: boolean, previousL1: Object|null, currentL1: Object|null, changedSuppliers: Array }}
 */
export function analyzeRankChanges(oldRankings = [], newRankings = []) {
  const previousL1 = oldRankings.find(r => r.rank === 1) || null;
  const currentL1 = newRankings.find(r => r.rank === 1) || null;

  // Check L1 change:
  // - If previously no L1 and now there is one, L1 changed!
  // - If L1 supplierId changed, L1 changed!
  // - If same supplier but price lowered, in British auction does L1 supplier change?
  // Section 6.C states: "Only extend when the current L1 supplier changes during the trigger window.
  // Example: Supplier A = ₹1000 -> L1, Supplier B = ₹1100 -> L2. Supplier B submits ₹950 -> Supplier B becomes L1."
  let didL1Change = false;
  if (!previousL1 && currentL1) {
    didL1Change = true;
  } else if (previousL1 && currentL1) {
    if (String(previousL1.supplierId) !== String(currentL1.supplierId)) {
      didL1Change = true;
    }
  }

  // Check if any rank changed
  let didAnyRankChange = false;
  const changedSuppliers = [];

  const oldRankMap = new Map();
  for (const r of oldRankings) {
    oldRankMap.set(String(r.supplierId), r.rank);
  }

  for (const r of newRankings) {
    const sId = String(r.supplierId);
    const oldRank = oldRankMap.get(sId);

    if (oldRank === undefined) {
      // New supplier entered the leaderboard
      didAnyRankChange = true;
      changedSuppliers.push({
        supplierId: sId,
        supplierName: r.supplierName,
        oldRank: null,
        newRank: r.rank,
      });
    } else if (oldRank !== r.rank) {
      didAnyRankChange = true;
      changedSuppliers.push({
        supplierId: sId,
        supplierName: r.supplierName,
        oldRank,
        newRank: r.rank,
      });
    }
  }

  return {
    didL1Change,
    didAnyRankChange,
    previousL1,
    currentL1,
    changedSuppliers,
  };
}
