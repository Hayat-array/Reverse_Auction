import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt
 * @param {string} password 
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare plain text password with hashed password
 * @param {string} password 
 * @param {string} hash 
 * @returns {Promise<boolean>}
 */
export async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

// Pre-computed verified hash of 'password123' with 10 rounds
export const DEMO_PASSWORD_HASH = '$2b$10$/VIjtuikTMdJkfb8vTPfNO/PJUvxqUwe4GoBV3wz4eIfxAKdvs4xK';

