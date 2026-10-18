import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Auction from '@/models/Auction';
import { getAuctionStatus } from '@/lib/auction/status';
import { requireRole } from '@/lib/auth/requireRole';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    // Fetch auctions with populated RFQ
    const query = {};
    const auctions = await Auction.find(query)
      .populate({
        path: 'rfqId',
        select: 'title referenceId origin destination mode containerType quantity targetPrice buyerName',
      })
      .sort({ [sortBy]: sortOrder })
      .lean();

    const now = new Date();

    // Map through auctions, calculate live status dynamically, and apply search/filter
    const computedAuctions = auctions
      .map((auc) => {
        const liveStatus = getAuctionStatus(auc, now);
        return {
          ...auc,
          computedStatus: liveStatus,
          isAcceptingBids: liveStatus === 'ACTIVE',
        };
      })
      .filter((auc) => {
        if (statusFilter && auc.computedStatus !== statusFilter) {
          return false;
        }

        if (search) {
          const s = search.toLowerCase();
          const matchTitle = auc.title?.toLowerCase().includes(s);
          const matchRef = auc.rfqId?.referenceId?.toLowerCase().includes(s);
          const matchOrigin = auc.rfqId?.origin?.port?.toLowerCase().includes(s);
          const matchDest = auc.rfqId?.destination?.port?.toLowerCase().includes(s);
          return matchTitle || matchRef || matchOrigin || matchDest;
        }

        return true;
      });

    return NextResponse.json({
      success: true,
      data: computedAuctions,
    });
  } catch (error) {
    console.error('GET /api/auctions error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch auctions' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  // Only BUYER or ADMIN can create auctions directly
  const { user: authUser, error: authError } = await requireRole(['BUYER', 'ADMIN'], request);
  if (authError) {
    return authError;
  }

  return NextResponse.json(
    {
      success: false,
      message: 'Direct auction creation is managed via RFQ creation (/api/rfqs)',
    },
    { status: 400 }
  );
}
