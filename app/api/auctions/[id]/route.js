import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Auction from '@/models/Auction';
import RFQ from '@/models/RFQ';
import Bid from '@/models/Bid';
import ActivityLog from '@/models/ActivityLog';
import { getAuctionStatus } from '@/lib/auction/status';
import { computeSupplierRankings } from '@/lib/auction/ranking';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const auction = await Auction.findById(id)
      .populate({
        path: 'rfqId',
        populate: { path: 'buyerId', select: 'name companyName email' },
      })
      .lean();

    if (!auction) {
      return NextResponse.json(
        { success: false, message: 'Auction not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const liveStatus = getAuctionStatus(auction, now);

    // If database status is stale compared to live clock, update it quietly and log event
    if (auction.status !== liveStatus && (liveStatus === 'CLOSED' || liveStatus === 'FORCE_CLOSED')) {
      await Auction.findByIdAndUpdate(auction._id, { status: liveStatus });
      auction.status = liveStatus;

      // Log closure in audit trail if not already logged
      const existingCloseLog = await ActivityLog.findOne({
        auctionId: auction._id,
        eventType: liveStatus === 'FORCE_CLOSED' ? 'AUCTION_FORCE_CLOSED' : 'AUCTION_CLOSED',
      });

      if (!existingCloseLog) {
        await ActivityLog.create({
          auctionId: auction._id,
          eventType: liveStatus === 'FORCE_CLOSED' ? 'AUCTION_FORCE_CLOSED' : 'AUCTION_CLOSED',
          description: liveStatus === 'FORCE_CLOSED'
            ? `Auction reached Forced Close Time ceiling (${new Date(auction.forcedCloseTime).toLocaleTimeString()}). Zero further bids accepted.`
            : `Auction closing time reached (${new Date(auction.bidCloseTime).toLocaleTimeString()}). Bidding concluded.`,
          metadata: {
            finalL1Price: auction.currentL1Price,
            finalL1Supplier: auction.currentL1SupplierName,
          },
        });
      }
    }

    // Fetch all bids for this auction
    const bids = await Bid.find({ auctionId: auction._id })
      .sort({ createdAt: -1 })
      .lean();

    // Compute official rankings
    const rankings = computeSupplierRankings(bids);

    // Compute trigger window information
    const closeMs = new Date(auction.bidCloseTime).getTime();
    const triggerWindowMinutes = Number(auction.triggerWindowMinutes);
    const triggerWindowStartMs = closeMs - (triggerWindowMinutes * 60 * 1000);
    const isInTriggerWindow = now.getTime() >= triggerWindowStartMs && now.getTime() < closeMs;

    return NextResponse.json({
      success: true,
      data: {
        ...auction,
        computedStatus: liveStatus,
        isAcceptingBids: liveStatus === 'ACTIVE',
        isInTriggerWindow,
        triggerWindowStart: new Date(triggerWindowStartMs),
        rankings,
        bidsCount: bids.length,
        currentL1Price: rankings[0] ? rankings[0].totalPrice : null,
        currentL1Supplier: rankings[0] ? rankings[0].supplierName : null,
      },
    });
  } catch (error) {
    console.error('GET /api/auctions/[id] error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch auction details' },
      { status: 500 }
    );
  }
}
