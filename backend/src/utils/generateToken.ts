import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import type { JwtPayload } from '../types';

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
}
