import { NextResponse } from 'next/server';
import connectDB, { isMemoryMode } from '@/lib/db/mongodb';
import { MemoryUser, initMemorySeed } from '@/lib/db/inMemoryStore';
import User from '@/models/User';
import { comparePassword } from '@/lib/auth/password';
import { createSessionToken, AUTH_COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth/token';

export async function POST(request) {
  try {
    await connectDB();

    if (isMemoryMode()) {
      initMemorySeed();
    }

    const body = await request.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Query user — use .lean() on the in-memory chain to get a real Promise<array>
    let user = null;
    if (isMemoryMode()) {
      const users = await MemoryUser.find().lean();
      user = users.find(u => u.email?.toLowerCase() === normalizedEmail) || null;
    } else {
      user = await User.findOne({ email: normalizedEmail }).lean();
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // User is authenticated — generate session token
    const token = await createSessionToken({
      id: String(user._id),
      email: user.email,
      role: user.role,
      name: user.name,
      companyName: user.companyName,
      carrierCode: user.carrierCode || '',
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
          carrierCode: user.carrierCode || '',
        },
      },
      { status: 200 }
    );

    // Force secure:false on HTTP localhost — HTTPS-only cookies are silently dropped in dev
    const isDev = process.env.NODE_ENV !== 'production';
    const cookieOpts = isDev
      ? { ...COOKIE_OPTIONS, secure: false }
      : COOKIE_OPTIONS;

    response.cookies.set(AUTH_COOKIE_NAME, token, cookieOpts);

    return response;
  } catch (error) {
    console.error('[Login] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during login' },
      { status: 500 }
    );
  }
}
