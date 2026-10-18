import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ActivityLog from '@/models/ActivityLog';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const activities = await ActivityLog.find({ auctionId: id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('GET /api/auctions/[id]/activity error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch auction activity log' },
      { status: 500 }
    );
  }
}
