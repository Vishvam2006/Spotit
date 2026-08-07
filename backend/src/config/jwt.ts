import type { SignOptions } from 'jsonwebtoken';

interface JwtConfig {
  secret: string;
  expiresIn: SignOptions['expiresIn'];
}

export const jwtConfig: JwtConfig = {
  secret: process.env.JWT_SECRET || 'dev-secret-change-me-in-production',
  expiresIn: (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '7d',
};
