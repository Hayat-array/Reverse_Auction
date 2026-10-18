import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE_NAME = 'auth_session';
const SECRET_STRING = process.env.SESSION_SECRET || 'gocomet-british-auction-production-secret-2026-key';
const SECRET_KEY = new TextEncoder().encode(SECRET_STRING);

async function getSession(request) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Allow static resources and public API endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/') // Let API routes handle their own 401/403 JSON responses
  ) {
    return NextResponse.next();
  }

  const session = await getSession(request);
  const isAuthenticated = Boolean(session && session.id && session.role);
  const userRole = session?.role;

  // 2. Public Login Route
  if (pathname === '/login') {
    if (isAuthenticated) {
      if (userRole === 'BUYER' || userRole === 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/supplier/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 3. Root Route '/'
  if (pathname === '/') {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (userRole === 'BUYER' || userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/supplier/dashboard', request.url));
  }

  // 4. All other frontend pages require authentication
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Role-based Route Protection
  // Supplier attempting to access buyer-only pages
  if (userRole === 'SUPPLIER') {
    if (pathname.startsWith('/auctions/')) {
      const auctionId = pathname.replace('/auctions/', '');
      return NextResponse.redirect(new URL(`/supplier/auctions/${auctionId}`, request.url));
    }
    if (pathname === '/dashboard' || pathname.startsWith('/rfqs') || pathname === '/auctions') {
      return NextResponse.redirect(new URL('/supplier/dashboard', request.url));
    }
  }

  // Buyer attempting to access supplier-only workspace
  if (userRole === 'BUYER') {
    if (pathname.startsWith('/supplier/auctions/')) {
      const auctionId = pathname.replace('/supplier/auctions/', '');
      return NextResponse.redirect(new URL(`/auctions/${auctionId}`, request.url));
    }
    if (pathname.startsWith('/supplier')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
