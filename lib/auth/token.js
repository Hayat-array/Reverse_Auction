import { SignJWT, jwtVerify } from 'jose';

export const AUTH_COOKIE_NAME = 'auth_session';

const SECRET_STRING = process.env.SESSION_SECRET || 'gocomet-british-auction-production-secret-2026-key';
const SECRET_KEY = new TextEncoder().encode(SECRET_STRING);

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
};

export const SESSION_COOKIE_OPTIONS = COOKIE_OPTIONS;

/**
 * Creates a signed JWT session token
 * @param {Object} user - User payload { id, email, role, name, companyName, carrierCode }
 * @returns {Promise<string>}
 */
export async function createSessionToken(user) {
  const payload = {
    id: String(user.id || user._id),
    email: user.email,
    role: user.role,
    name: user.name,
    companyName: user.companyName,
    carrierCode: user.carrierCode || '',
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

/**
 * Verifies a JWT session token and returns the payload
 * @param {string} token 
 * @returns {Promise<Object|null>}
 */
export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload;
  } catch {
    return null;
  }
}
