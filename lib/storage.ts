import { getSupabase } from "./supabaseClient";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Uploads an image to the given public Supabase Storage bucket and returns its
 * public URL. Server-only (uses the service role client) so this must only be
 * called from Server Actions. Returns null if no file was actually provided.
 */
async function uploadImage(file: File | null, bucket: string, pathPrefix: string): Promise<string | null> {
  if (!file || file.size === 0) return null;

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 5MB).");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${pathPrefix}/${unique}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await getSupabase()
    .storage.from(bucket)
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true });
  if (error) throw error;

  const { data } = getSupabase().storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Uploads a client/company logo to the "logos" bucket. */
export async function uploadLogo(file: File | null, pathPrefix: string): Promise<string | null> {
  return uploadImage(file, "logos", pathPrefix);
}

/** Uploads an image attached to a task to the "task-images" bucket. */
export async function uploadTaskImage(file: File | null, taskId: string): Promise<string | null> {
  return uploadImage(file, "task-images", `tasks/${taskId}`);
}
