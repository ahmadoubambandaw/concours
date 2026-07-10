import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import type { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string; // userId
  schoolId: string | null;
  role: Role;
  type: 'access';
}

export const signAccessToken = (payload: Omit<AccessTokenPayload, 'type'>): string =>
  jwt.sign({ ...payload, type: 'access' }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
  } as jwt.SignOptions);

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;

// Le refresh token est une chaîne aléatoire opaque ; seul son hash est stocké
// en base, pour qu'une fuite de la table ne compromette pas les sessions.
export const generateRefreshToken = (): string => crypto.randomBytes(48).toString('hex');

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');
