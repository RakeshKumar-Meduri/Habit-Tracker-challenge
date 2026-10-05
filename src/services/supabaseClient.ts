import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Upload an image file directly to Supabase storage from the client
 */
export async function uploadImageToSupabase(
  bucket: string,
  filePath: string,
  file: File | Blob
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase client is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
      upsert: true,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { success: true, url: publicUrlData.publicUrl };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to upload image' };
  }
}
