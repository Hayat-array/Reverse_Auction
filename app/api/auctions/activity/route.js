import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ActivityLog from '@/models/ActivityLog';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    const logs = await ActivityLog.find({})
      .sort({ createdAt: -1 })
      .lean();

    const result = Array.isArray(logs) ? logs.slice(0, limit) : [];

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('GET /api/auctions/activity error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
