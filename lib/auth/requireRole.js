import { NextResponse } from 'next/server';
import { getCurrentUser } from './getCurrentUser.js';

/**
 * Ensures the incoming request has a valid authenticated session with the required role(s).
 *
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles (e.g. 'BUYER', ['BUYER', 'ADMIN'])
 * @param {Request} [request]
 * @returns {Promise<{ user: Object|null, error: NextResponse|null }>}
 */
export async function requireRole(allowedRoles, request = null) {
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

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  // ADMIN generally has cross-cutting permissions unless strictly restricted
  if (!roles.includes(user.role) && user.role !== 'ADMIN') {
    return {
      user,
      error: NextResponse.json(
        {
          success: false,
          message: `Access denied. Requires one of roles: [${roles.join(', ')}]. Current role: ${user.role}.`,
        },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}

export default requireRole;
