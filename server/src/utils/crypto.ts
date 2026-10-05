import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const LEGACY_SALT = '_PULSE_SALT_2026';

/**
 * Hash password with bcrypt (cost factor 10)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password.trim(), salt);
}

/**
 * Verify password against stored hash.
 * Supports modern bcrypt hashes as well as legacy SHA-256+salt hashes.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<{ isValid: boolean; needsRehash: boolean }> {
  if (!password || !storedHash) {
    return { isValid: false, needsRehash: false };
  }

  // Check if hash is bcrypt ($2a$, $2b$, $2y$)
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    const isValid = await bcrypt.compare(password.trim(), storedHash);
    return { isValid, needsRehash: false };
  }

  // Legacy SHA-256 check
  const legacyHash = crypto.createHash('sha256').update(password.trim() + LEGACY_SALT).digest('hex');
  if (legacyHash === storedHash) {
    return { isValid: true, needsRehash: true };
  }

  // Plain SHA-256 without salt (for any pre-salt accounts)
  const plainSha256 = crypto.createHash('sha256').update(password.trim()).digest('hex');
  if (plainSha256 === storedHash) {
    return { isValid: true, needsRehash: true };
  }

  return { isValid: false, needsRehash: false };
}

/**
 * Cryptographic SHA-256 hash for session and invite tokens
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generate secure session token and its database-stored hash
 */
export function generateSessionToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Strip password hash and sensitive fields from user object
 */
export function sanitizeUser<T extends Record<string, any>>(user: T | null | undefined): Omit<T, 'password_hash'> | null {
  if (!user || typeof user !== 'object') return null;
  const copy = { ...user };
  delete copy.password_hash;
  return copy;
}
