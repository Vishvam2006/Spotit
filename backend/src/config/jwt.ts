import type { SignOptions } from 'jsonwebtoken';

interface JwtConfig {
  secret: string;
  expiresIn: SignOptions['expiresIn'];
}

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set when NODE_ENV is production');
}

export const jwtConfig: JwtConfig = {
  secret: process.env.JWT_SECRET || 'dev-secret-change-me-in-production',
  expiresIn: (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '7d',
};
