import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  role: Role;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as TokenPayload;
};
