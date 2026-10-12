import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import { reviewLimiter } from '../middleware/rateLimit';
import { reviewSchema } from '../utils/validation';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

const router = Router();

/**
 * GET /api/reviews/me
 * Returns the authenticated user's review if it exists, or null.
 */
router.get('/api/reviews/me', requireAuth, reviewLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const review = await prisma.review.findUnique({
      where: { user_id: userId },
      select: {
        id: true,
        user_id: true,
        rating: true,
        comment: true,
        created_at: true,
        updated_at: true,
      },
    });

    res.status(200).json({
      success: true,
      review: review
        ? {
            id: review.id,
            userId: review.user_id,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.created_at,
            updatedAt: review.updated_at,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reviews
 * Creates a new review for the authenticated user.
 * Enforces exactly one review per user via DB unique constraint on user_id.
 */
router.post('/api/reviews', requireAuth, reviewLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Server-side Zod validation
    const parsed = reviewSchema.parse(req.body);

    // Explicit existence check before creation
    const existing = await prisma.review.findUnique({
      where: { user_id: userId },
    });

    if (existing) {
      throw new AppError(
        'You have already submitted a review. You can edit your existing review.',
        409,
        'REVIEW_ALREADY_EXISTS'
      );
    }

    // Insert review into database
    try {
      const newReview = await prisma.review.create({
        data: {
          user_id: userId,
          rating: parsed.rating,
          comment: parsed.comment.trim(),
        },
      });

      res.status(201).json({
        success: true,
        message: 'Thank you for your feedback! Your review has been saved.',
        review: {
          id: newReview.id,
          userId: newReview.user_id,
          rating: newReview.rating,
          comment: newReview.comment,
          createdAt: newReview.created_at,
          updatedAt: newReview.updated_at,
        },
      });
    } catch (dbErr: any) {
      // Catch unique constraint violation (P2002 or Postgres 23505) for concurrent requests
      if (
        (dbErr instanceof Prisma.PrismaClientKnownRequestError && dbErr.code === 'P2002') ||
        dbErr?.code === '23505'
      ) {
        throw new AppError(
          'You have already submitted a review. You can edit your existing review.',
          409,
          'REVIEW_ALREADY_EXISTS'
        );
      }
      throw dbErr;
    }
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/reviews/me
 * Updates the authenticated user's existing review record without creating a new row.
 */
router.patch('/api/reviews/me', requireAuth, reviewLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    // Server-side Zod validation
    const parsed = reviewSchema.parse(req.body);

    // Verify existing review exists
    const existing = await prisma.review.findUnique({
      where: { user_id: userId },
    });

    if (!existing) {
      throw new AppError(
        'No existing review found to update. Please submit a review first.',
        404,
        'REVIEW_NOT_FOUND'
      );
    }

    // Update existing review record
    const updated = await prisma.review.update({
      where: { user_id: userId },
      data: {
        rating: parsed.rating,
        comment: parsed.comment.trim(),
        updated_at: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Your review has been successfully updated.',
      review: {
        id: updated.id,
        userId: updated.user_id,
        rating: updated.rating,
        comment: updated.comment,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
