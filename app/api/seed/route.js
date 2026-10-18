import { NextResponse } from 'next/server';
import { runSeed } from '@/lib/seedData';

export async function POST() {
  try {
    const result = await runSeed();
    return NextResponse.json({
      success: true,
      message: 'Demo data seeded successfully',
      data: result,
    });
  } catch (error) {
    console.error('POST /api/seed error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to seed demo data' },
      { status: 500 }
    );
  }
}
