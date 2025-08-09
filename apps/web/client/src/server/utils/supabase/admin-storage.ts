import 'server-only';
import { env } from '@/env';
import { createClient } from '@supabase/supabase-js';

export type SignedUploadResult = {
  path: string;
  signedUrl: string;
};

const createAdminSupabase = () => {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin credentials are not configured');
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'onlook-admin-storage' } },
  });
};

export const uploadBufferAndGetSignedUrl = async (
  bucket: string,
  path: string,
  buffer: Buffer | Uint8Array,
  options?: {
    contentType?: string;
    cacheControl?: string;
    upsert?: boolean;
    expiresInSeconds?: number; // default 1 day
  },
): Promise<SignedUploadResult> => {
  if (typeof window !== 'undefined') {
    throw new Error('uploadBufferAndGetSignedUrl must be called on the server');
  }
  const supabase = createAdminSupabase();
  const fileBody = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, fileBody, {
      cacheControl: options?.cacheControl ?? 'public, max-age=31536000, immutable',
      contentType: options?.contentType ?? 'application/gzip',
      upsert: options?.upsert ?? true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const expiresIn = options?.expiresInSeconds ?? 60 * 60 * 24; // 1 day
  const { data: signed, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (signError || !signed?.signedUrl) {
    throw signError ?? new Error('Failed to create signed URL');
  }

  return { path, signedUrl: signed.signedUrl };
};

export const uploadBlobToStorage = async (
  bucket: string,
  path: string,
  blob: Blob,
  options?: {
    contentType?: string;
    cacheControl?: string;
    upsert?: boolean;
  },
): Promise<{ path: string } | null> => {
  if (typeof window !== 'undefined') {
    throw new Error('uploadBlobToStorage must be called on the server');
  }
  const supabase = createAdminSupabase();
  const arrayBuffer = await blob.arrayBuffer();
  const fileBody = Buffer.from(arrayBuffer);
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, fileBody, {
      cacheControl: options?.cacheControl ?? 'public, max-age=31536000, immutable',
      contentType: options?.contentType,
      upsert: options?.upsert ?? true,
    });
  if (error) {
    throw error;
  }
  return data ? { path: data.path } : null;
};

export const uploadBlobAndGetSignedUrl = async (
  bucket: string,
  path: string,
  blob: Blob,
  options?: {
    contentType?: string;
    cacheControl?: string;
    upsert?: boolean;
    expiresInSeconds?: number;
  },
): Promise<SignedUploadResult> => {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return uploadBufferAndGetSignedUrl(bucket, path, buffer, options);
};


