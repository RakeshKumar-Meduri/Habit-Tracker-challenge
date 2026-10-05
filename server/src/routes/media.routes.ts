import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { uploadMediaToSupabase, BUCKETS } from '../db/supabase';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// ----------------------------------------------------
// Upload User Media to Supabase Storage
// ----------------------------------------------------
router.post('/api/media/upload', requireAuth, async (req, res, next) => {
  try {
    const { imageBase64, type = 'avatar' } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new AppError('Image base64 data is required', 400, 'MISSING_IMAGE');
    }

    // Parse mime type and raw base64 data
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let contentType = 'image/jpeg';
    let buffer: Buffer;

    if (matches && matches.length === 3) {
      contentType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageBase64, 'base64');
    }

    const bucket = type === 'progress' ? BUCKETS.PROGRESS_PHOTOS : BUCKETS.AVATARS;
    const extension = contentType.split('/')[1] || 'jpg';
    const filename = `${req.user!.id}/${Date.now()}.${extension}`;

    const publicUrl = await uploadMediaToSupabase(bucket, filename, buffer, contentType);

    if (!publicUrl) {
      // If Supabase credentials are not configured, return a mock or local data URL
      return res.json({
        success: true,
        url: imageBase64.startsWith('data:') ? imageBase64 : `data:${contentType};base64,${imageBase64}`,
        storage: 'local_fallback',
      });
    }

    res.json({
      success: true,
      url: publicUrl,
      storage: 'supabase',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
