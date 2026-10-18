import test from 'node:test';
import assert from 'node:assert/strict';

import { getAuctionStatus, isAuctionBiddable } from '../lib/time-utils.js';
import { computeSupplierRankings, analyzeRankChanges } from '../lib/ranking.js';
import { evaluateAuctionExtension } from '../lib/auction/extensionEngine.js';
import { validateAuctionTiming, validateBidPrice, RFQSchema, AuctionConfigSchema } from '../lib/validation.js';

test('Comprehensive British Reverse Auction Test Suite (14 Assignment Verification Cases)', async (t) => {

  // =========================================================================
  // CASE 1: Valid auction creation
  // =========================================================================
  await t.test('Case 1: Valid auction creation passes schema and timing checks', () => {
    const validConfig = {
      bidStartTime: '2026-09-23T18:00:00.000Z',
      bidCloseTime: '2026-09-23T18:30:00.000Z',
      forcedCloseTime: '2026-09-23T19:00:00.000Z',
      triggerWindowMinutes: 10,
      extensionDurationMinutes: 5,
      extensionTrigger: 'L1_CHANGE',
    };

    const parsed = AuctionConfigSchema.safeParse(validConfig);
    assert.equal(parsed.success, true, 'Valid auction configuration must be accepted');

    const timing = validateAuctionTiming(
      validConfig.bidStartTime,
      validConfig.bidCloseTime,
      validConfig.forcedCloseTime
    );
    assert.equal(timing.valid, true);
    assert.equal(timing.error, null);
  });

  // =========================================================================
  // CASE 2: Invalid forced close (forced close earlier than bid close)
  // =========================================================================
  await t.test('Case 2: Invalid forced close is strictly rejected', () => {
    const invalidConfig = {
      bidStartTime: '2026-09-23T18:00:00.000Z',
      bidCloseTime: '2026-09-23T18:30:00.000Z',
      forcedCloseTime: '2026-09-23T18:20:00.000Z', // Earlier than close!
      triggerWindowMinutes: 10,
      extensionDurationMinutes: 5,
      extensionTrigger: 'BID_RECEIVED',
    };

    const parsed = AuctionConfigSchema.safeParse(invalidConfig);
    assert.equal(parsed.success, false, 'Auction with forced close <= close time must fail');

    const timing = validateAuctionTiming(
      invalidConfig.bidStartTime,
      invalidConfig.bidCloseTime,
      invalidConfig.forcedCloseTime
    );
    assert.equal(timing.valid, false);
    assert.match(timing.error, /Forced Bid Close Time must be strictly later/);
  });

  // =========================================================================
  // CASE 3: Valid bid
  // =========================================================================
  await t.test('Case 3: Valid bid calculation and acceptance', () => {
    const freight = 80000;
    const origin = 5000;
    const destination = 4000;
    const totalPrice = freight + origin + destination;

    assert.equal(totalPrice, 89000);

    const priceCheck = validateBidPrice(totalPrice, 95000);
    assert.equal(priceCheck.valid, true);
    assert.equal(priceCheck.error, null);
  });

  // =========================================================================
  // CASE 4: Bid higher than or equal to current L1
  // =========================================================================
  await t.test('Case 4: Bid higher than or equal to L1 is rejected', () => {
    const currentL1Price = 85000;
    const higherBid = 87000;
    const equalBid = 85000;

    const resHigher = validateBidPrice(higherBid, currentL1Price);
    assert.equal(resHigher.valid, false);
    assert.match(resHigher.error, /must be lower than the current L1 price/);

    const resEqual = validateBidPrice(equalBid, currentL1Price);
    assert.equal(resEqual.valid, false);
    assert.match(resEqual.error, /must be lower than the current L1 price/);
  });

  // =========================================================================
  // CASE 5: Bid on closed auction
  // =========================================================================
  await t.test('Case 5: Bid on closed auction is rejected', () => {
    const closedAuction = {
      bidStartTime: new Date('2026-09-23T17:00:00Z'),
      bidCloseTime: new Date('2026-09-23T18:00:00Z'),
      forcedCloseTime: new Date('2026-09-23T18:30:00Z'),
      status: 'CLOSED',
    };

    const now = new Date('2026-09-23T18:05:00Z');
    assert.equal(getAuctionStatus(closedAuction, now), 'CLOSED');
    assert.equal(isAuctionBiddable(closedAuction, now), false);
  });

  // =========================================================================
  // CASE 6: Bid after forced close
  // =========================================================================
  await t.test('Case 6: Bid after forced close is strictly rejected', () => {
    const auction = {
      bidStartTime: new Date('2026-09-23T17:00:00Z'),
      bidCloseTime: new Date('2026-09-23T18:25:00Z'),
      forcedCloseTime: new Date('2026-09-23T18:30:00Z'),
      status: 'ACTIVE',
    };

    const afterForced = new Date('2026-09-23T18:30:01Z');
    assert.equal(getAuctionStatus(auction, afterForced), 'FORCE_CLOSED');
    assert.equal(isAuctionBiddable(auction, afterForced), false);
  });

  // =========================================================================
  // CASE 7: Bid inside trigger window
  // =========================================================================
  await t.test('Case 7: Bid inside trigger window is recognized', () => {
    const currentClose = new Date('2026-09-23T19:00:00Z');
    const auction = {
      bidCloseTime: currentClose,
      forcedCloseTime: new Date('2026-09-23T19:30:00Z'),
      triggerWindowMinutes: 10,
      extensionDurationMinutes: 5,
      extensionTrigger: 'BID_RECEIVED',
    };

    // Bid at 18:55 (5 mins before close -> INSIDE trigger window)
    const res = evaluateAuctionExtension({
      auction,
      bidTimestamp: new Date('2026-09-23T18:55:00Z'),
    });

    assert.equal(res.isInTriggerWindow, true);
    assert.equal(res.shouldExtend, true);
    assert.equal(res.newCloseTime.toISOString(), new Date('2026-09-23T19:05:00Z').toISOString());
  });

  // =========================================================================
  // CASE 8: Bid outside trigger window
  // =========================================================================
  await t.test('Case 8: Bid outside trigger window does not trigger extension', () => {
    const currentClose = new Date('2026-09-23T19:00:00Z');
    const auction = {
      bidCloseTime: currentClose,
      forcedCloseTime: new Date('2026-09-23T19:30:00Z'),
      triggerWindowMinutes: 10,
      extensionDurationMinutes: 5,
      extensionTrigger: 'BID_RECEIVED',
    };

    // Bid at 18:45 (15 mins before close -> OUTSIDE trigger window)
    const res = evaluateAuctionExtension({
      auction,
      bidTimestamp: new Date('2026-09-23T18:45:00Z'),
    });

    assert.equal(res.isInTriggerWindow, false);
    assert.equal(res.shouldExtend, false);
    assert.equal(res.newCloseTime.toISOString(), currentClose.toISOString());
  });

  // =========================================================================
  // CASE 9: Rank change trigger
  // =========================================================================
  await t.test('Case 9: RANK_CHANGE trigger behavior', () => {
    const auction = {
      bidCloseTime: new Date('2026-09-23T19:00:00Z'),
      forcedCloseTime: new Date('2026-09-23T19:30:00Z'),
      triggerWindowMinutes: 5,
      extensionDurationMinutes: 5,
      extensionTrigger: 'RANK_CHANGE',
    };

    // Sub-case A: Rank didn't change
    const noChange = evaluateAuctionExtension({
      auction,
      bidTimestamp: new Date('2026-09-23T18:57:00Z'),
      didAnyRankChange: false,
      didL1Change: false,
    });
    assert.equal(noChange.shouldExtend, false);

    // Sub-case B: Rank changed
    const changed = evaluateAuctionExtension({
      auction,
      bidTimestamp: new Date('2026-09-23T18:57:00Z'),
      didAnyRankChange: true,
      didL1Change: false,
    });
    assert.equal(changed.shouldExtend, true);
    assert.equal(changed.newCloseTime.toISOString(), new Date('2026-09-23T19:05:00Z').toISOString());
  });

  // =========================================================================
  // CASE 10: L1 change trigger
  // =========================================================================
  await t.test('Case 10: L1_CHANGE trigger behavior', () => {
    const auction = {
      bidCloseTime: new Date('2026-09-23T19:00:00Z'),
      forcedCloseTime: new Date('2026-09-23T19:30:00Z'),
      triggerWindowMinutes: 5,
      extensionDurationMinutes: 5,
      extensionTrigger: 'L1_CHANGE',
    };

    // Sub-case A: Bid improved rank to L2 (didAnyRankChange=true, didL1Change=false)
    const l2Only = evaluateAuctionExtension({
      auction,
      bidTimestamp: new Date('2026-09-23T18:57:00Z'),
      didAnyRankChange: true,
      didL1Change: false,
    });
    assert.equal(l2Only.shouldExtend, false);

    // Sub-case B: Bid took L1 (didL1Change=true)
    const l1Change = evaluateAuctionExtension({
      auction,
      bidTimestamp: new Date('2026-09-23T18:57:00Z'),
      didAnyRankChange: true,
      didL1Change: true,
      supplierName: 'Hapag-Lloyd',
    });
    assert.equal(l1Change.shouldExtend, true);
    assert.equal(l1Change.newCloseTime.toISOString(), new Date('2026-09-23T19:05:00Z').toISOString());
  });

  // =========================================================================
  // CASE 11: Repeated extension
  // =========================================================================
  await t.test('Case 11: Repeated extensions increment close time successively', () => {
    let currentClose = new Date('2026-09-23T18:00:00Z');
    const forcedClose = new Date('2026-09-23T18:30:00Z');
    const auction = {
      bidCloseTime: currentClose,
      forcedCloseTime: forcedClose,
      triggerWindowMinutes: 5,
      extensionDurationMinutes: 5,
      extensionTrigger: 'BID_RECEIVED',
    };

    // Extension 1: 18:00 -> 18:05
    let res = evaluateAuctionExtension({
      auction: { ...auction, bidCloseTime: currentClose },
      bidTimestamp: new Date('2026-09-23T17:58:00Z'),
    });
    assert.equal(res.shouldExtend, true);
    assert.equal(res.newCloseTime.toISOString(), new Date('2026-09-23T18:05:00Z').toISOString());
    currentClose = res.newCloseTime;

    // Extension 2: 18:05 -> 18:10
    res = evaluateAuctionExtension({
      auction: { ...auction, bidCloseTime: currentClose },
      bidTimestamp: new Date('2026-09-23T18:03:00Z'),
    });
    assert.equal(res.shouldExtend, true);
    assert.equal(res.newCloseTime.toISOString(), new Date('2026-09-23T18:10:00Z').toISOString());
  });

  // =========================================================================
  // CASE 12: Extension capped at forced close
  // =========================================================================
  await t.test('Case 12: Extension is strictly clamped at forcedCloseTime', () => {
    const currentClose = new Date('2026-09-23T18:28:00Z');
    const forcedClose = new Date('2026-09-23T18:30:00Z');
    const auction = {
      bidCloseTime: currentClose,
      forcedCloseTime: forcedClose,
      triggerWindowMinutes: 5,
      extensionDurationMinutes: 5, // 18:28 + 5m would be 18:33 -> MUST cap at 18:30
      extensionTrigger: 'BID_RECEIVED',
    };

    const res = evaluateAuctionExtension({
      auction,
      bidTimestamp: new Date('2026-09-23T18:27:00Z'),
    });

    assert.equal(res.shouldExtend, true);
    assert.equal(res.newCloseTime.toISOString(), forcedClose.toISOString());
    assert.equal(res.forcedCloseHit, true);
    assert.equal(res.extensionMinutesAdded, 2);
  });

  // =========================================================================
  // CASE 13: Multiple concurrent bids & tie-breaking
  // =========================================================================
  await t.test('Case 13: Multiple concurrent bids and tie-breaking by earliest timestamp', () => {
    const bids = [
      {
        id: 'bid-1',
        supplierId: 'supp-A',
        supplierName: 'ABC Logistics',
        totalPrice: 90000,
        createdAt: new Date('2026-09-23T18:00:00.000Z'),
      },
      {
        id: 'bid-2',
        supplierId: 'supp-B',
        supplierName: 'Fast Cargo',
        totalPrice: 85000,
        createdAt: new Date('2026-09-23T18:02:00.000Z'),
      },
      {
        id: 'bid-3',
        supplierId: 'supp-C',
        supplierName: 'Prime Transport',
        totalPrice: 85000, // Equal price to B, but submitted later
        createdAt: new Date('2026-09-23T18:02:05.000Z'),
      },
    ];

    const rankings = computeSupplierRankings(bids);
    assert.equal(rankings.length, 3);
    assert.equal(rankings[0].supplierId, 'supp-B', 'Earlier timestamp wins tie for L1');
    assert.equal(rankings[0].rankLabel, 'L1');
    assert.equal(rankings[1].supplierId, 'supp-C', 'Later timestamp takes L2');
    assert.equal(rankings[1].rankLabel, 'L2');
    assert.equal(rankings[2].supplierId, 'supp-A');
    assert.equal(rankings[2].rankLabel, 'L3');
  });

  // =========================================================================
  // CASE 14: Auction close behavior
  // =========================================================================
  await t.test('Case 14: Auction close behavior transitions status and rejects bids', () => {
    const auction = {
      bidStartTime: new Date('2026-09-23T17:00:00Z'),
      bidCloseTime: new Date('2026-09-23T18:00:00Z'),
      forcedCloseTime: new Date('2026-09-23T18:30:00Z'),
      status: 'ACTIVE',
    };

    // Before close -> ACTIVE
    const beforeClose = new Date('2026-09-23T17:59:59Z');
    assert.equal(getAuctionStatus(auction, beforeClose), 'ACTIVE');
    assert.equal(isAuctionBiddable(auction, beforeClose), true);

    // At or after close time (no extensions) -> CLOSED
    const atClose = new Date('2026-09-23T18:00:00Z');
    assert.equal(getAuctionStatus(auction, atClose), 'CLOSED');
    assert.equal(isAuctionBiddable(auction, atClose), false);
  });
});
