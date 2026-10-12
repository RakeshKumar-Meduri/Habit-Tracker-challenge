import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from '../config/env';

let supabaseClient: SupabaseClient | null = null;

if (ENV.SUPABASE_URL && (ENV.SUPABASE_SERVICE_ROLE_KEY || ENV.SUPABASE_ANON_KEY)) {
  try {
    const key = ENV.SUPABASE_SERVICE_ROLE_KEY || ENV.SUPABASE_ANON_KEY;
    supabaseClient = createClient(ENV.SUPABASE_URL, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('[Supabase] Supabase client initialized successfully');
  } catch (err) {
    console.warn('[Supabase] Failed to initialize Supabase client:', err);
    supabaseClient = null;
  }
} else {
  console.log('[Supabase] Running without Supabase SDK credentials (set SUPABASE_URL and keys in .env)');
}

export const supabase = supabaseClient;

/**
 * Storage bucket names used by PULSE
 */
export const BUCKETS = {
  AVATARS: 'pulse-avatars',
  PROGRESS_PHOTOS: 'pulse-progress-photos',
} as const;

/**
 * Ensure storage buckets exist: avatars are public, progress photos are private
 */
export async function ensureStorageBuckets() {
  if (!supabase) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const existing = new Set((buckets || []).map(b => b.name));

    for (const bucketName of Object.values(BUCKETS)) {
      if (!existing.has(bucketName)) {
        await supabase.storage.createBucket(bucketName, {
          public: bucketName === BUCKETS.AVATARS, // Avatars are public, progress photos are private
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        });
        console.log(`[Supabase Storage] Created bucket: ${bucketName} (public: ${bucketName === BUCKETS.AVATARS})`);
      }
    }
  } catch (err) {
    console.warn('[Supabase Storage Bucket Error]', (err as Error).message);
  }
}

/**
 * Generate a short-lived or long-lived signed URL for private bucket objects
 */
export async function getSignedMediaUrl(
  bucket: string,
  filePath: string,
  expiresInSeconds: number = 86400 // Default 24 hours
): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, expiresInSeconds);
    if (error || !data) {
      console.warn('[Supabase Storage Signed URL Error]', error?.message);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.error('[Supabase Storage Signed URL Exception]', err);
    return null;
  }
}

/**
 * Upload a media buffer/base64 to Supabase Storage and return signed or public URL
 */
export async function uploadMediaToSupabase(
  bucket: string,
  filePath: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string | null> {
  if (!supabase) {
    console.warn('[Supabase Storage] Cannot upload: Supabase client not initialized');
    return null;
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, fileBuffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.error('[Supabase Storage Upload Error]', error.message);
      return null;
    }

    // For private progress photos, create a signed URL so media is protected
    if (bucket === BUCKETS.PROGRESS_PHOTOS) {
      const signedUrl = await getSignedMediaUrl(bucket, data.path, 60 * 60 * 24 * 30); // 30-day signed access
      if (signedUrl) {
        return signedUrl;
      }
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('[Supabase Storage Upload Exception]', err);
    return null;
  }
}
