import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { getJwtSecret } from '../config/env';

export interface TokenPayload {
  userId: string;
  role: Role;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(
    payload,
    getJwtSecret(),
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
};
