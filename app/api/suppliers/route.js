import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/models/User';
import Bid from '@/models/Bid';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();

    const suppliers = await User.find({ role: 'SUPPLIER' }).lean();

    // Enrich with bid metrics
    const enrichedSuppliers = await Promise.all(
      suppliers.map(async (supplier) => {
        let bidCount = 0;
        let lastBidPrice = null;
        let lastBidTime = null;

        try {
          const bids = await Bid.find({ supplierId: supplier._id }).lean();
          bidCount = Array.isArray(bids) ? bids.length : 0;
          if (bidCount > 0) {
            const sortedBids = [...bids].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            lastBidPrice = sortedBids[0]?.totalPrice || null;
            lastBidTime = sortedBids[0]?.createdAt || null;
          }
        } catch {
          // Keep default if bid lookup unavailable
        }

        return {
          id: supplier._id,
          name: supplier.name,
          email: supplier.email,
          company: supplier.companyName,
          carrierCode: supplier.carrierCode,
          totalBids: bidCount,
          lastBidPrice,
          lastBidTime,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedSuppliers,
    });
  } catch (error) {
    console.error('GET /api/suppliers error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}
