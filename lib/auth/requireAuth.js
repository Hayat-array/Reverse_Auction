import { NextResponse } from 'next/server';
import { getCurrentUser } from './getCurrentUser.js';

/**
 * Ensures the incoming request has a valid authenticated session.
 *
 * @param {Request} [request]
 * @returns {Promise<{ user: Object|null, error: NextResponse|null }>}
 */
export async function requireAuth(request = null) {
  const user = await getCurrentUser(request);

  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        {
          success: false,
          message: 'Authentication required. Please log in.',
        },
        { status: 401 }
      ),
    };
  }

  return { user, error: null };
}

export default requireAuth;
