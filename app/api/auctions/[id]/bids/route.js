import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Bid from '@/models/Bid';
import { placeBid } from '@/lib/auction/bidService';
import { requireRole } from '@/lib/auth/requireRole';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const bids = await Bid.find({ auctionId: id })
      .populate('supplierId', 'name companyName email avatar')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: bids,
    });
  } catch (error) {
    console.error('GET /api/auctions/[id]/bids error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch bids' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    // 1. Verify Authentication & Role === SUPPLIER (Buyers strictly forbidden from placing supplier bids)
    const { user: authUser, error: authError } = await requireRole('SUPPLIER', request);
    if (authError) {
      return authError;
    }

    const { id: auctionId } = await params;
    const body = await request.json();

    const {
      carrierName,
      freightCharges,
      originCharges = 0,
      destinationCharges = 0,
      transitTime = 15,
      quoteValidity,
    } = body || {};

    const resolvedCarrierName = carrierName?.trim() || `${authUser.companyName || authUser.name} Express`;

    // 2. Execute bid placement with authenticated supplier identity
    const result = await placeBid({
      auctionId,
      supplierId: authUser.id,
      carrierName: resolvedCarrierName,
      freightCharges: Number(freightCharges),
      originCharges: Number(originCharges),
      destinationCharges: Number(destinationCharges),
      transitTime: Number(transitTime),
      quoteValidity,
    });

    return NextResponse.json(
      {
        success: true,
        message: result.extension?.shouldExtend
          ? `Bid accepted! Auction extended by ${result.extension.extensionMinutesAdded}m.`
          : 'Bid placed successfully!',
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/auctions/[id]/bids error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to submit bid',
        code: error.code || 'BID_SUBMISSION_FAILED',
      },
      { status: error.statusCode || 400 }
    );
  }
}
