import type { SignOptions } from 'jsonwebtoken';

interface JwtConfig {
  secret: string;
  expiresIn: SignOptions['expiresIn'];
}

const KNOWN_PLACEHOLDERS = new Set([
  'change-me',
  'change-me-in-production',
  'dev-secret-change-me-in-production',
  'secret',
  'your-secret',
  'test-only-secret',
]);

function resolveSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (
    process.env.NODE_ENV === 'production' &&
    (!secret || KNOWN_PLACEHOLDERS.has(secret) || secret.length < 32)
  ) {
    throw new Error(
      'JWT_SECRET must be set to a unique random string of at least 32 characters when NODE_ENV is production',
    );
  }

  if (secret && KNOWN_PLACEHOLDERS.has(secret) && process.env.NODE_ENV !== 'test') {
    throw new Error(
      'JWT_SECRET is set to a known placeholder value. Generate a strong random secret before starting the server.',
    );
  }

  if (secret && secret.length < 16 && process.env.NODE_ENV !== 'test') {
    throw new Error('JWT_SECRET is too short. Use at least 16 characters.');
  }

  return secret ?? 'dev-secret-change-me-in-production';
}

export const jwtConfig: JwtConfig = {
  secret: resolveSecret(),
  expiresIn: (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '7d',
};