import mongoose from 'mongoose';
import connectDB from '../db/mongodb.js';
import Auction from '../../models/Auction.js';
import Bid from '../../models/Bid.js';
import ActivityLog from '../../models/ActivityLog.js';
import User from '../../models/User.js';
import { getAuctionStatus } from './status.js';
import { computeSupplierRankings, analyzeRankChanges } from './ranking.js';
import { evaluateAuctionExtension } from './extensionEngine.js';
import { broadcastAuctionUpdate } from './eventBus.js';

/**
 * Places a bid in an auction, enforces British Auction rules, updates rankings,
 * applies dynamic extensions, logs activity, prevents concurrent race conditions,
 * and broadcasts realtime events.
 *
 * @param {Object} params
 * @param {string} params.auctionId
 * @param {string} params.supplierId
 * @param {string} params.carrierName
 * @param {number} params.freightCharges
 * @param {number} [params.originCharges=0]
 * @param {number} [params.destinationCharges=0]
 * @param {number} [params.transitTime=15]
 * @param {Date|string} params.quoteValidity
 * @param {Date} [params.now=new Date()]
 * @returns {Promise<Object>}
 */
export async function placeBid({
  auctionId,
  supplierId,
  carrierName,
  freightCharges,
  originCharges = 0,
  destinationCharges = 0,
  transitTime = 15,
  quoteValidity,
  now = new Date(),
}) {
  await connectDB();

  const currentTime = new Date(now);

  // 1. Validate carrier name input
  if (!carrierName || typeof carrierName !== 'string' || !carrierName.trim()) {
    const error = new Error('Carrier / Vessel name is required');
    error.statusCode = 400;
    throw error;
  }

  // 2. Validate numerical inputs
  const freight = Number(freightCharges);
  const origin = Number(originCharges);
  const destination = Number(destinationCharges);
  const days = Number(transitTime);

  if (isNaN(freight) || freight <= 0) {
    const error = new Error('Freight charges must be greater than zero');
    error.statusCode = 400;
    throw error;
  }
  if (isNaN(origin) || origin < 0) {
    const error = new Error('Origin charges must be a non-negative number');
    error.statusCode = 400;
    throw error;
  }
  if (isNaN(destination) || destination < 0) {
    const error = new Error('Destination charges must be a non-negative number');
    error.statusCode = 400;
    throw error;
  }
  if (isNaN(days) || days < 1) {
    const error = new Error('Transit time must be at least 1 day');
    error.statusCode = 400;
    throw error;
  }

  const totalPrice = freight + origin + destination;
  if (totalPrice <= 0) {
    const error = new Error('Total quote price must be greater than zero');
    error.statusCode = 400;
    throw error;
  }

  // 3. Validate quote validity date (must be in future)
  const validityDate = quoteValidity ? new Date(quoteValidity) : new Date(currentTime.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (isNaN(validityDate.getTime()) || validityDate.getTime() <= currentTime.getTime()) {
    const error = new Error('Quote validity date must be in the future');
    error.statusCode = 400;
    throw error;
  }

  // 4. Validate supplier
  const supplier = await User.findById(supplierId);
  if (!supplier) {
    const error = new Error('Supplier user not found');
    error.statusCode = 404;
    throw error;
  }

  // Optimistic concurrency retry loop (up to 3 attempts)
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;

    // Fetch latest auction state
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      const error = new Error('Auction not found');
      error.statusCode = 404;
      throw error;
    }

    // Validate auction state
    const status = getAuctionStatus(auction, currentTime);
    if (status === 'FORCE_CLOSED' || currentTime.getTime() >= new Date(auction.forcedCloseTime).getTime()) {
      if (auction.status !== 'FORCE_CLOSED') {
        auction.status = 'FORCE_CLOSED';
        await auction.save();
        await ActivityLog.create({
          auctionId: auction._id,
          eventType: 'AUCTION_FORCE_CLOSED',
          description: `Auction reached Forced Close Time ceiling (${new Date(auction.forcedCloseTime).toLocaleTimeString()}). Zero further bids accepted.`,
          createdAt: currentTime,
        });
      }
      const error = new Error('Auction is force-closed. No further bids can be accepted.');
      error.statusCode = 400;
      error.code = 'AUCTION_FORCE_CLOSED';
      throw error;
    }

    if (status === 'CLOSED' || currentTime.getTime() >= new Date(auction.bidCloseTime).getTime()) {
      if (auction.status !== 'CLOSED' && auction.status !== 'FORCE_CLOSED') {
        auction.status = 'CLOSED';
        await auction.save();
        await ActivityLog.create({
          auctionId: auction._id,
          eventType: 'AUCTION_CLOSED',
          description: `Auction closing time reached (${new Date(auction.bidCloseTime).toLocaleTimeString()}). Bidding concluded.`,
          createdAt: currentTime,
        });
      }
      const error = new Error('Auction has closed. Bidding period has ended.');
      error.statusCode = 400;
      error.code = 'AUCTION_CLOSED';
      throw error;
    }

    if (status === 'UPCOMING') {
      const error = new Error(`Auction has not started yet. Starts at ${new Date(auction.bidStartTime).toLocaleString()}`);
      error.statusCode = 400;
      error.code = 'AUCTION_UPCOMING';
      throw error;
    }

    // Check supplier's existing best bid in this auction
    const existingBids = await Bid.find({ auctionId }).lean();
    const supplierExistingBids = existingBids.filter(
      b => String(b.supplierId) === String(supplierId)
    );

    if (supplierExistingBids.length > 0) {
      const bestExistingPrice = Math.min(...supplierExistingBids.map(b => Number(b.totalPrice)));
      if (totalPrice >= bestExistingPrice) {
        const error = new Error(
          `Your new bid (₹${totalPrice.toLocaleString()}) must be strictly lower than your current best quote of ₹${bestExistingPrice.toLocaleString()}`
        );
        error.statusCode = 400;
        error.code = 'NON_IMPROVING_BID';
        throw error;
      }
    }

    // Compute old rankings
    const oldRankings = computeSupplierRankings(existingBids);

    // Compute new rankings
    const generatedBidId = new mongoose.Types.ObjectId();
    const newBidObj = {
      _id: generatedBidId,
      auctionId: auction._id,
      rfqId: auction.rfqId,
      supplierId: supplier._id,
      supplierName: supplier.companyName || supplier.name,
      carrierName: carrierName.trim(),
      freightCharges: freight,
      originCharges: origin,
      destinationCharges: destination,
      totalPrice,
      transitTime: days,
      quoteValidity: validityDate,
      createdAt: currentTime,
    };

    const simulatedAllBids = [...existingBids, newBidObj];
    const newRankings = computeSupplierRankings(simulatedAllBids);
    const myNewRankEntry = newRankings.find(r => String(r.supplierId) === String(supplier._id));
    const newRank = myNewRankEntry ? myNewRankEntry.rank : newRankings.length;

    // Analyze rank shifts
    const { didL1Change, didAnyRankChange, currentL1 } = analyzeRankChanges(oldRankings, newRankings);

    // Evaluate British Auction Extension
    const extensionResult = evaluateAuctionExtension({
      auction,
      bidTimestamp: currentTime,
      didL1Change,
      didAnyRankChange,
      supplierName: newBidObj.supplierName,
    });

    // Prepare atomic update with optimistic version check
    const currentVersion = auction.version || 1;
    const updates = {
      $inc: { totalBidsCount: 1, version: 1 },
      $set: {
        currentL1Price: currentL1 ? currentL1.totalPrice : totalPrice,
        currentL1SupplierId: currentL1 ? currentL1.supplierId : supplier._id,
        currentL1SupplierName: currentL1 ? currentL1.supplierName : newBidObj.supplierName,
      },
    };

    if (extensionResult.shouldExtend) {
      updates.$set.bidCloseTime = extensionResult.newCloseTime;
      updates.$inc.extensionsCount = 1;
    }

    // Atomic compare-and-swap on version
    const updatedAuction = await Auction.findOneAndUpdate(
      { _id: auction._id, version: currentVersion },
      updates,
      { new: true }
    );

    if (!updatedAuction) {
      // Concurrent write detected! Back off and retry
      if (attempts >= maxAttempts) {
        const error = new Error('High bidding concurrency detected. Please resubmit your quote.');
        error.statusCode = 409;
        throw error;
      }
      await new Promise(res => setTimeout(res, 50 * attempts));
      continue;
    }

    // Persist new bid
    const newBid = new Bid({
      ...newBidObj,
      rankAtSubmission: newRank,
      isL1: newRank === 1,
    });
    await newBid.save();

    // Log Bid Placed Activity
    await ActivityLog.create({
      auctionId: auction._id,
      eventType: 'BID_PLACED',
      supplierId: supplier._id,
      supplierName: newBid.supplierName,
      bidId: newBid._id,
      description: `${newBid.supplierName} placed a bid of ₹${totalPrice.toLocaleString()} via ${newBid.carrierName} (Rank: L${newRank})`,
      metadata: {
        totalPrice,
        freightCharges: freight,
        originCharges: origin,
        destinationCharges: destination,
        rank: newRank,
        isL1: newRank === 1,
      },
      createdAt: currentTime,
    });

    // Log Extension Activity if triggered
    if (extensionResult.shouldExtend) {
      await ActivityLog.create({
        auctionId: auction._id,
        eventType: 'AUCTION_EXTENDED',
        supplierId: supplier._id,
        supplierName: newBid.supplierName,
        bidId: newBid._id,
        description: `Auction extended by ${extensionResult.extensionMinutesAdded}m until ${new Date(extensionResult.newCloseTime).toLocaleTimeString()} (${extensionResult.reason})`,
        oldCloseTime: extensionResult.oldCloseTime,
        newCloseTime: extensionResult.newCloseTime,
        reason: extensionResult.reason,
        metadata: {
          extensionTrigger: auction.extensionTrigger,
          extensionMinutesAdded: extensionResult.extensionMinutesAdded,
          forcedCloseHit: extensionResult.forcedCloseHit,
        },
        createdAt: new Date(currentTime.getTime() + 10),
      });
    }

    // Log Rank Change Activity if non-L1 rank changed
    if (didAnyRankChange && !newBid.isL1) {
      await ActivityLog.create({
        auctionId: auction._id,
        eventType: 'RANK_CHANGED',
        supplierId: supplier._id,
        supplierName: newBid.supplierName,
        bidId: newBid._id,
        description: `${newBid.supplierName} climbed to rank L${newRank}`,
        metadata: { newRank },
        createdAt: new Date(currentTime.getTime() + 5),
      });
    }

    // Realtime Broadcast via SSE
    broadcastAuctionUpdate(auction._id, {
      type: extensionResult.shouldExtend ? 'AUCTION_EXTENDED' : 'NEW_BID',
      auctionId: String(auction._id),
      bid: newBid.toObject(),
      auction: {
        ...updatedAuction.toObject(),
        computedStatus: getAuctionStatus(updatedAuction, currentTime),
      },
      rankings: newRankings,
      extension: extensionResult,
    });

    return {
      success: true,
      bid: newBid,
      auction: updatedAuction,
      rankings: newRankings,
      extension: extensionResult,
    };
  }
}
