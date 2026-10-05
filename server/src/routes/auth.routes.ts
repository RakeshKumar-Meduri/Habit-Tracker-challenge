import { Router } from 'express';
import { prisma } from '../db/prisma';
import { hashPassword, verifyPassword, generateSessionToken, hashToken, sanitizeUser } from '../utils/crypto';
import { registerSchema, loginSchema } from '../utils/validation';
import { authLimiter } from '../middleware/rateLimit';
import { requireAuth, extractToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { broadcast } from '../websocket/websocket.server';
import { WS_EVENTS, SESSION_DURATION_DAYS } from '../config/constants';
import { ENV } from '../config/env';

const router = Router();

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: ENV.IS_PROD,
    sameSite: (ENV.IS_PROD ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

// ----------------------------------------------------
// Register User
// ----------------------------------------------------
router.post('/api/auth/register', authLimiter, async (req, res, next) => {
  try {
    const validated = registerSchema.parse(req.body);
    const pass = (validated.password || validated.passwordPlain)!.trim();
    const cleanUsername = validated.username.trim().replace(/^@+/, '').toLowerCase();
    const cleanName = (validated.name || cleanUsername).trim();

    // Check username conflict
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existing) {
      throw new AppError(`Username @${cleanUsername} is already registered.`, 400, 'USERNAME_TAKEN');
    }

    const hashedPassword = await hashPassword(pass);
    const { rawToken, tokenHash } = generateSessionToken();
    const sessionExpiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const gradients = [
      'from-[#D98B4A] to-[#B45F1E]',
      'from-emerald-500 to-teal-700',
      'from-violet-500 to-purple-700',
      'from-amber-500 to-orange-700',
      'from-cyan-500 to-blue-700',
      'from-rose-500 to-pink-700',
    ];
    const avatar_color = gradients[Math.floor(Math.random() * gradients.length)];

    let targetGroupId: string;
    let createdUser: any;

    if (validated.inviteToken) {
      const inviteTokenStr = validated.inviteToken.trim();
      const inviteHash = hashToken(inviteTokenStr);

      // Verify invite inside transaction
      const result = await prisma.$transaction(async (tx) => {
        const invite = await tx.invite.findFirst({
          where: {
            OR: [
              { token: inviteTokenStr },
              { token_hash: inviteHash },
            ],
          },
        });

        if (!invite || invite.revoked) {
          throw new AppError('Invite link is invalid or has been revoked.', 400, 'INVALID_INVITE');
        }
        if (new Date(invite.expires_at) <= new Date()) {
          throw new AppError('This invite link has expired.', 400, 'INVITE_EXPIRED');
        }
        if (invite.uses >= invite.max_uses) {
          throw new AppError('This invite link has reached its maximum uses.', 400, 'INVITE_MAX_USES');
        }

        const group = await tx.group.findUnique({ where: { id: invite.group_id } });
        if (!group) {
          throw new AppError('The group for this invite link does not exist.', 400, 'GROUP_NOT_FOUND');
        }

        // 1. Create User
        const user = await tx.user.create({
          data: {
            username: cleanUsername,
            name: cleanName,
            password_hash: hashedPassword,
            role: 'member',
            height: validated.height || 175,
            weight_current: validated.weight || 70,
            age: validated.age || 25,
            gender: validated.gender || 'male',
            avatar_color,
          },
        });

        // 2. Create Membership
        await tx.membership.create({
          data: {
            user_id: user.id,
            group_id: group.id,
            role: 'member',
          },
        });

        // 3. Increment Invite uses
        await tx.invite.update({
          where: { id: invite.id },
          data: { uses: { increment: 1 } },
        });

        // 4. Create Session
        await tx.session.create({
          data: {
            user_id: user.id,
            session_token_hash: tokenHash,
            token: rawToken,
            expires_at: sessionExpiresAt,
          },
        });

        return { user, groupId: group.id };
      });

      createdUser = result.user;
      targetGroupId = result.groupId;
    } else {
      // No inviteToken: auto-create "<first name>'s Group"
      const firstName = cleanName.split(' ')[0] || cleanUsername;
      const groupName = `${firstName}'s Group`;

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create User
        const user = await tx.user.create({
          data: {
            username: cleanUsername,
            name: cleanName,
            password_hash: hashedPassword,
            role: 'member',
            height: validated.height || 175,
            weight_current: validated.weight || 70,
            age: validated.age || 25,
            gender: validated.gender || 'male',
            avatar_color,
          },
        });

        // 2. Create Group
        const group = await tx.group.create({
          data: {
            name: groupName,
            owner_id: user.id,
            step_target: 10000,
          },
        });

        // 3. Create Membership as owner
        await tx.membership.create({
          data: {
            user_id: user.id,
            group_id: group.id,
            role: 'owner',
          },
        });

        // 4. Create Session
        await tx.session.create({
          data: {
            user_id: user.id,
            session_token_hash: tokenHash,
            token: rawToken,
            expires_at: sessionExpiresAt,
          },
        });

        return { user, groupId: group.id };
      });

      createdUser = result.user;
      targetGroupId = result.groupId;
    }

    const safeUser = sanitizeUser(createdUser);

    // Set HttpOnly cookie
    res.cookie(ENV.COOKIE_NAME, rawToken, getCookieOptions());

    // Broadcast registration event only AFTER transaction commits
    broadcast({
      type: WS_EVENTS.USER_REGISTERED,
      payload: safeUser,
    }, null, targetGroupId);

    res.json({
      success: true,
      token: rawToken,
      user: safeUser,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Login User
// ----------------------------------------------------
router.post('/api/auth/login', authLimiter, async (req, res, next) => {
  try {
    const validated = loginSchema.parse(req.body);
    const rawClean = validated.identifier.trim();
    const clean = rawClean.replace(/^@+/, '').toLowerCase();
    const pass = validated.password || validated.passwordPlain || '';

    // Search user by username or name
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: clean },
          { username: rawClean.toLowerCase() },
          { name: { equals: rawClean, mode: 'insensitive' } },
        ],
        is_active: true,
      },
    });

    if (!user) {
      throw new AppError('Invalid username or password.', 401, 'INVALID_CREDENTIALS');
    }

    const { isValid, needsRehash } = await verifyPassword(pass, user.password_hash);
    if (!isValid) {
      throw new AppError('Incorrect password.', 401, 'INVALID_CREDENTIALS');
    }

    // Seamlessly upgrade legacy hash to bcrypt in background
    if (needsRehash) {
      const newHash = await hashPassword(pass);
      prisma.user.update({
        where: { id: user.id },
        data: { password_hash: newHash },
      }).catch(err => console.warn('[Password Rehash Error]', err.message));
    }

    const { rawToken, tokenHash } = generateSessionToken();
    const sessionExpiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        user_id: user.id,
        session_token_hash: tokenHash,
        token: rawToken,
        expires_at: sessionExpiresAt,
      },
    });

    res.cookie(ENV.COOKIE_NAME, rawToken, getCookieOptions());

    res.json({
      success: true,
      token: rawToken,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Logout User
// ----------------------------------------------------
router.post('/api/auth/logout', async (req, res) => {
  try {
    const rawToken = extractToken(req);
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await prisma.session.updateMany({
        where: {
          OR: [
            { session_token_hash: tokenHash },
            { token: rawToken },
          ],
        },
        data: {
          revoked_at: new Date(),
        },
      });
    }
  } catch (err) {
    console.warn('[Logout Error]', err);
  }

  res.clearCookie(ENV.COOKIE_NAME, { path: '/' });
  res.json({ success: true, message: 'Logged out successfully' });
});

// ----------------------------------------------------
// Get Current Session User
// ----------------------------------------------------
router.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

export default router;
