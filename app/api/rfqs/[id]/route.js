import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import RFQ from '@/models/RFQ';
import Auction from '@/models/Auction';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const rfq = await RFQ.findById(id)
      .populate('auctionId')
      .populate('buyerId', 'name companyName email')
      .lean();

    if (!rfq) {
      return NextResponse.json(
        { success: false, message: 'RFQ not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rfq,
    });
  } catch (error) {
    console.error('GET /api/rfqs/[id] error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch RFQ' },
      { status: 500 }
    );
  }
}
