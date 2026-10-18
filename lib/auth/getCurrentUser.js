import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, verifySessionToken } from './token.js';

/**
 * Retrieves the currently authenticated user from the request session cookie.
 * Works seamlessly in Next.js Server Components, Server Actions, and Route Handlers.
 *
 * @param {Request} [request] - Optional NextRequest or standard Request instance
 * @returns {Promise<Object|null>} The authenticated user object or null
 */
export async function getCurrentUser(request = null) {
  try {
    let token = null;

    if (request && typeof request.cookies?.get === 'function') {
      token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    } else if (request && request.headers) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]*)`));
      if (match) token = decodeURIComponent(match[1]);
    }

    if (!token) {
      // Fallback to next/headers cookies()
      const cookieStore = await cookies();
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    }

    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload || !payload.id || !payload.role) {
      return null;
    }

    return {
      id: payload.id,
      _id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      companyName: payload.companyName,
      carrierCode: payload.carrierCode || '',
    };
  } catch (err) {
    console.error('Error getting current user:', err);
    return null;
  }
}

export default getCurrentUser;
