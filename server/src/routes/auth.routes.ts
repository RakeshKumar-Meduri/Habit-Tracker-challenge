import { Router } from 'express';
import { prisma } from '../db/prisma';
import { 
  hashPassword, 
  verifyPassword, 
  generateSessionToken, 
  generateVerificationToken, 
  generatePasswordResetToken,
  hashToken, 
  sanitizeUser 
} from '../utils/crypto';
import { 
  registerSchema, 
  loginSchema, 
  setEmailSchema, 
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../utils/validation';
import { 
  authLimiter, 
  emailResendLimiter, 
  forgotPasswordLimiter, 
  passwordResetLimiter 
} from '../middleware/rateLimit';
import { requireAuth, extractToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { broadcast } from '../websocket/websocket.server';
import { WS_EVENTS, SESSION_DURATION_DAYS } from '../config/constants';
import { ENV } from '../config/env';
import { 
  sendVerificationEmail, 
  sendPasswordResetEmail, 
  sendPasswordChangedNotificationEmail 
} from '../services/email.service';
import { cleanupDeletedUser } from '../utils/userCleanup';

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
    const cleanEmail = validated.email ? validated.email.trim().toLowerCase() : null;

    // Check username conflict
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existing) {
      if (existing.is_active) {
        throw new AppError(`Username @${cleanUsername} is already registered.`, 400, 'USERNAME_TAKEN');
      } else {
        // The previous account with this username was deleted: purge it and allow registration!
        await cleanupDeletedUser(existing.id);
      }
    }

    // Check email conflict if provided
    if (cleanEmail) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (existingEmail) {
        if (existingEmail.is_active) {
          throw new AppError('An account with this email address already exists.', 400, 'EMAIL_TAKEN');
        } else {
          // The previous account with this email was deleted: purge it and allow registration!
          await cleanupDeletedUser(existingEmail.id);
        }
      }
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
    let verificationTokenToSend: string | null = null;

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
            email: cleanEmail,
            email_verified: false,
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

        // 5. Create Email Verification Token if email provided
        let verifyRawToken: string | null = null;
        if (cleanEmail) {
          const generated = generateVerificationToken();
          verifyRawToken = generated.rawToken;
          await tx.emailVerificationToken.create({
            data: {
              user_id: user.id,
              email: cleanEmail,
              token_hash: generated.tokenHash,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            },
          });
        }

        return { user, groupId: group.id, verifyRawToken };
      });

      createdUser = result.user;
      targetGroupId = result.groupId;
      verificationTokenToSend = result.verifyRawToken;
    } else {
      // No inviteToken: auto-create "<first name>'s Group"
      const firstName = cleanName.split(' ')[0] || cleanUsername;
      const groupName = `${firstName}'s Group`;

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create User
        const user = await tx.user.create({
          data: {
            username: cleanUsername,
            email: cleanEmail,
            email_verified: false,
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

        // 5. Create Email Verification Token if email provided
        let verifyRawToken: string | null = null;
        if (cleanEmail) {
          const generated = generateVerificationToken();
          verifyRawToken = generated.rawToken;
          await tx.emailVerificationToken.create({
            data: {
              user_id: user.id,
              email: cleanEmail,
              token_hash: generated.tokenHash,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            },
          });
        }

        return { user, groupId: group.id, verifyRawToken };
      });

      createdUser = result.user;
      targetGroupId = result.groupId;
      verificationTokenToSend = result.verifyRawToken;
    }

    const safeUser = sanitizeUser(createdUser);

    // Set HttpOnly cookie
    res.cookie(ENV.COOKIE_NAME, rawToken, getCookieOptions());

    // Dispatch branded verification email asynchronously
    if (cleanEmail && verificationTokenToSend) {
      sendVerificationEmail(cleanEmail, cleanName, verificationTokenToSend)
        .then((result) => {
          if (!result.success) {
            console.error('[Registration Email Error]', result.error);
          } else {
            console.log('[Registration Email Success] Sent to', cleanEmail, 'ID:', result.messageId);
          }
        })
        .catch((err) => {
          console.error('[Verification Email Delivery Error]', err.message);
        });
    }

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

    // Search user by username, email, or name
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: clean },
          { username: rawClean.toLowerCase() },
          { email: clean },
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

/**
 * Core verification logic shared between GET and POST
 */
async function executeEmailVerification(tokenStr: string) {
  if (!tokenStr || typeof tokenStr !== 'string' || tokenStr.trim().length < 10) {
    return {
      success: false,
      status: 'invalid' as const,
      message: 'The email verification link is invalid or malformed.',
    };
  }

  const rawToken = tokenStr.trim();
  const tokenHash = hashToken(rawToken);

  const tokenRecord = await prisma.emailVerificationToken.findUnique({
    where: { token_hash: tokenHash },
    include: { user: true },
  });

  if (!tokenRecord) {
    return {
      success: false,
      status: 'invalid' as const,
      message: 'This email verification link does not exist or is invalid.',
    };
  }

  if (tokenRecord.used_at) {
    return {
      success: false,
      status: 'already_used' as const,
      message: 'This email verification link has already been used.',
    };
  }

  if (new Date(tokenRecord.expires_at) <= new Date()) {
    return {
      success: false,
      status: 'expired' as const,
      message: 'This email verification link has expired. Please request a new one.',
    };
  }

  // Transactionally consume token and mark email verified
  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({
      where: { id: tokenRecord.id },
      data: { used_at: new Date() },
    });

    await tx.user.update({
      where: { id: tokenRecord.user_id },
      data: {
        email: tokenRecord.email,
        email_verified: true,
        email_verified_at: new Date(),
      },
    });
  });

  return {
    success: true,
    status: 'verified' as const,
    message: 'Your email address has been successfully verified! You can now access all PULSE features.',
    user: {
      id: tokenRecord.user.id,
      email: tokenRecord.email,
      username: tokenRecord.user.username,
      name: tokenRecord.user.name,
    },
  };
}

// ----------------------------------------------------
// Verify Email (POST - programmatic / SPA fetch)
// ----------------------------------------------------
router.post('/api/auth/verify-email', async (req, res, next) => {
  try {
    const token = (req.body?.token || req.query?.token || '') as string;
    const result = await executeEmailVerification(token);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Verify Email (GET - direct email link click)
// ----------------------------------------------------
router.get('/api/auth/verify-email', async (req, res, next) => {
  try {
    const token = (req.query?.token || '') as string;
    const result = await executeEmailVerification(token);

    // If client requested HTML browser view, safely redirect to frontend URL
    if (req.accepts('html')) {
      const redirectUrl = new URL(`${ENV.FRONTEND_URL}/verify-email`);
      redirectUrl.searchParams.set('status', result.status);
      redirectUrl.searchParams.set('message', result.message);
      res.redirect(302, redirectUrl.toString());
      return;
    }

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Resend Verification Email (Rate Limited)
// ----------------------------------------------------
router.post('/api/auth/resend-verification', emailResendLimiter, async (req, res, next) => {
  try {
    const validated = resendVerificationSchema.parse(req.body);
    let targetUser: any = null;

    // 1. Try logged-in session user first
    const rawToken = extractToken(req);
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      const session = await prisma.session.findFirst({
        where: {
          OR: [{ session_token_hash: tokenHash }, { token: rawToken }],
          revoked_at: null,
        },
        include: { user: true },
      });
      if (session?.user && session.user.is_active) {
        targetUser = session.user;
      }
    }

    // 2. If no valid session, check email body
    if (!targetUser && validated.email) {
      targetUser = await prisma.user.findUnique({
        where: { email: validated.email.trim().toLowerCase() },
      });
    }

    // If no target user found, respond with generic success to prevent account enumeration
    if (!targetUser) {
      res.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      });
      return;
    }

    if (!targetUser.email) {
      throw new AppError('No email address associated with this account. Please provide an email address first.', 400, 'NO_EMAIL_ON_ACCOUNT');
    }

    if (targetUser.email_verified) {
      res.json({
        success: true,
        message: 'Your email address is already verified.',
        alreadyVerified: true,
      });
      return;
    }

    // Anti-abuse: Check if a token was already generated for this user in the last 60 seconds
    const recentToken = await prisma.emailVerificationToken.findFirst({
      where: {
        user_id: targetUser.id,
        created_at: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentToken) {
      throw new AppError('Please wait at least 60 seconds before requesting another verification email.', 429, 'RESEND_COOLDOWN');
    }

    // Generate fresh single-use verification token
    const { rawToken: newVerifyToken, tokenHash: newVerifyHash } = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        user_id: targetUser.id,
        email: targetUser.email,
        token_hash: newVerifyHash,
        expires_at: expiresAt,
      },
    });

    // Send email via Resend
    const emailResult = await sendVerificationEmail(targetUser.email, targetUser.name, newVerifyToken);
    if (!emailResult.success) {
      console.error('[Resend Verification Error]', emailResult.error);
      throw new AppError(emailResult.error || 'Failed to dispatch verification email. Please try again.', 500, 'EMAIL_SEND_FAILED');
    }

    res.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.',
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Set or Update Email for Account (Migration / Onboarding)
// ----------------------------------------------------
router.post('/api/auth/set-email', requireAuth, emailResendLimiter, async (req, res, next) => {
  try {
    const validated = setEmailSchema.parse(req.body);
    const cleanEmail = validated.email.trim().toLowerCase();
    const userId = req.user!.id;

    // Check conflict with other accounts
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing && existing.id !== userId) {
      if (existing.is_active) {
        throw new AppError('This email address is already registered with another account.', 400, 'EMAIL_TAKEN');
      } else {
        await cleanupDeletedUser(existing.id);
      }
    }

    // Update user's email and reset verification status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: cleanEmail,
        email_verified: false,
        email_verified_at: null,
      },
    });

    // Generate verification token and send verification email
    const { rawToken: verifyToken, tokenHash: verifyHash } = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        user_id: userId,
        email: cleanEmail,
        token_hash: verifyHash,
        expires_at: expiresAt,
      },
    });

    const emailResult = await sendVerificationEmail(cleanEmail, updatedUser.name, verifyToken);
    if (!emailResult.success) {
      console.error('[Set Email Verification Error]', emailResult.error);
      throw new AppError(emailResult.error || 'Failed to dispatch verification email to the updated address.', 500, 'EMAIL_SEND_FAILED');
    }

    res.json({
      success: true,
      message: 'Email address updated. A verification link has been sent to your inbox.',
      user: sanitizeUser(updatedUser),
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Request Password Reset Link (Forgot Password)
// ----------------------------------------------------
router.post('/api/auth/forgot-password', forgotPasswordLimiter, async (req, res, next) => {
  const startTime = Date.now();
  try {
    const validated = forgotPasswordSchema.parse(req.body);
    const cleanEmail = validated.email.toLowerCase().trim();

    // Standardized generic message to prevent account enumeration
    const genericSuccessMessage = "If an account matches that email, we'll send a password-reset link. Please check your inbox and spam folder.";

    // Look up user by email
    const user = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        is_active: true,
      },
    });

    if (user && user.email) {
      // Anti-spam cooldown: Check if a reset token was created for this user in the last 60 seconds
      const recentToken = await prisma.passwordResetToken.findFirst({
        where: {
          user_id: user.id,
          created_at: { gte: new Date(Date.now() - 60 * 1000) },
        },
      });

      if (!recentToken) {
        // Generate secure 64-char single-use token and SHA-256 hash
        const { rawToken, tokenHash } = generatePasswordResetToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

        await prisma.passwordResetToken.create({
          data: {
            user_id: user.id,
            email: user.email,
            token_hash: tokenHash,
            expires_at: expiresAt,
          },
        });

        // Dispatch branded reset email asynchronously
        sendPasswordResetEmail(user.email, user.name || user.username, rawToken).catch((err) => {
          console.error('[Password Reset Email Error]', err.message);
        });
      }
    }

    // Timing attack mitigation: ensure response time is consistent (~250ms)
    const elapsed = Date.now() - startTime;
    if (elapsed < 250) {
      await new Promise((resolve) => setTimeout(resolve, 250 - elapsed));
    }

    res.json({
      success: true,
      message: genericSuccessMessage,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Verify Password Reset Token (Validity & Expiry Check)
// ----------------------------------------------------
router.post('/api/auth/verify-reset-token', passwordResetLimiter, async (req, res, next) => {
  try {
    const rawToken = (req.body?.token || req.query?.token || '') as string;
    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length < 10) {
      res.json({
        valid: false,
        reason: 'invalid',
        message: 'This password reset link is invalid or malformed. Please request a new link.',
      });
      return;
    }

    const tokenHash = hashToken(rawToken.trim());
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      res.json({
        valid: false,
        reason: 'invalid',
        message: 'This password reset link does not exist or is invalid.',
      });
      return;
    }

    if (tokenRecord.used_at) {
      res.json({
        valid: false,
        reason: 'already_used',
        message: 'This password reset link has already been used. Please request a new one.',
      });
      return;
    }

    if (new Date(tokenRecord.expires_at) <= new Date()) {
      res.json({
        valid: false,
        reason: 'expired',
        message: 'This password reset link has expired. Please request a new one.',
      });
      return;
    }

    // Mask email for user reassurance without leaking full data
    const emailParts = tokenRecord.email.split('@');
    const maskedEmail = emailParts[0].length > 2 
      ? `${emailParts[0].slice(0, 2)}***@${emailParts[1]}` 
      : `${emailParts[0]}***@${emailParts[1]}`;

    res.json({
      valid: true,
      email: maskedEmail,
      username: tokenRecord.user.username,
      message: 'Token is valid.',
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// Execute Password Reset
// ----------------------------------------------------
router.post('/api/auth/reset-password', passwordResetLimiter, async (req, res, next) => {
  try {
    const validated = resetPasswordSchema.parse(req.body);
    const rawToken = validated.token.trim();
    const tokenHash = hashToken(rawToken);

    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new AppError('This password reset link does not exist or is invalid.', 400, 'INVALID_RESET_TOKEN');
    }

    if (tokenRecord.used_at) {
      throw new AppError('This password reset link has already been used. Please request a new link.', 400, 'TOKEN_ALREADY_USED');
    }

    if (new Date(tokenRecord.expires_at) <= new Date()) {
      throw new AppError('This password reset link has expired. Please request a new link.', 400, 'TOKEN_EXPIRED');
    }

    if (!tokenRecord.user.is_active) {
      throw new AppError('This account is currently deactivated.', 403, 'ACCOUNT_INACTIVE');
    }

    const cleanPass = validated.newPassword.trim();
    if (cleanPass.toLowerCase() === tokenRecord.user.username.toLowerCase()) {
      throw new AppError('Password cannot match your username.', 400, 'PASSWORD_CANNOT_MATCH_USERNAME');
    }

    // Hash new password using bcrypt
    const hashedPassword = await hashPassword(cleanPass);

    // Atomically consume token, update user password, and revoke all active user sessions
    await prisma.$transaction(async (tx) => {
      // 1. Invalidate/consume token
      await tx.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { used_at: new Date() },
      });

      // 2. Update password hash & reset must_change_password
      await tx.user.update({
        where: { id: tokenRecord.user_id },
        data: {
          password_hash: hashedPassword,
          must_change_password: false,
        },
      });

      // 3. Security: Revoke all existing sessions for this user
      await tx.session.updateMany({
        where: { user_id: tokenRecord.user_id },
        data: { revoked_at: new Date() },
      });
    });

    // Clear any existing session cookie
    res.clearCookie(ENV.COOKIE_NAME, { path: '/' });

    // Send security notification email
    sendPasswordChangedNotificationEmail(
      tokenRecord.email,
      tokenRecord.user.name || tokenRecord.user.username
    ).catch((err) => {
      console.warn('[Password Changed Notification Email Error]', err.message);
    });

    res.json({
      success: true,
      message: 'Your password has been successfully reset! Please sign in with your new password.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;

