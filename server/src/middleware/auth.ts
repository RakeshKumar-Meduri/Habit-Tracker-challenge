import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { hashToken } from '../utils/crypto';
import { ENV } from '../config/env';
import { AppError } from './errorHandler';

export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  role: string;
  height: number;
  weight_current: number;
  age: number;
  gender: string;
  avatar_color: string | null;
  photo_url: string | null;
  is_private: boolean;
  is_active: boolean;
  must_change_password: boolean;
  groupId: string | null;
  groupRole: 'owner' | 'member' | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function extractToken(req: Request): string | null {
  // 1. Check HttpOnly cookie
  if (req.cookies && req.cookies[ENV.COOKIE_NAME]) {
    return req.cookies[ENV.COOKIE_NAME];
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const rawToken = extractToken(req);
    if (!rawToken) {
      throw new AppError('Unauthorized: Missing session token', 401, 'UNAUTHORIZED');
    }

    const tokenHash = hashToken(rawToken);

    // Look up session in PostgreSQL by token hash (or fallback to plain token for backwards compatibility)
    const session = await prisma.session.findFirst({
      where: {
        OR: [
          { session_token_hash: tokenHash },
          { token: rawToken },
        ],
        revoked_at: null,
      },
      include: {
        user: {
          include: {
            memberships: {
              take: 1,
            },
          },
        },
      },
    });

    if (!session || !session.user || !session.user.is_active) {
      throw new AppError('Unauthorized: Invalid or expired session', 401, 'UNAUTHORIZED');
    }

    if (new Date(session.expires_at) <= new Date()) {
      throw new AppError('Unauthorized: Session has expired', 401, 'SESSION_EXPIRED');
    }

    // Touch last_used_at asynchronously (don't block the request)
    prisma.session.update({
      where: { id: session.id },
      data: { last_used_at: new Date() },
    }).catch(err => console.warn('[Session Touch Error]', err.message));

    const membership = session.user.memberships[0] || null;

    req.user = {
      id: session.user.id,
      username: session.user.username,
      name: session.user.name,
      role: session.user.role,
      height: session.user.height,
      weight_current: session.user.weight_current,
      age: session.user.age,
      gender: session.user.gender,
      avatar_color: session.user.avatar_color,
      photo_url: session.user.photo_url,
      is_private: session.user.is_private,
      is_active: session.user.is_active,
      must_change_password: session.user.must_change_password,
      groupId: membership ? membership.group_id : null,
      groupRole: membership ? (membership.role as 'owner' | 'member') : null,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export async function requireGroupOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
  }
  if (req.user.groupRole !== 'owner') {
    return next(new AppError('Forbidden: Only group owners can perform this action', 403, 'FORBIDDEN'));
  }
  next();
}
