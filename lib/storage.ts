import { getSupabase } from "./supabaseClient";

const LOGO_BUCKET = "logos";
const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Uploads a logo file to the Supabase "logos" storage bucket and returns its public
 * URL. Server-only (uses the service role client) so this must only be called from
 * Server Actions. Returns null if no file was actually provided.
 */
export async function uploadLogo(file: File | null, pathPrefix: string): Promise<string | null> {
  if (!file || file.size === 0) return null;

  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("Logo file is too large (max 5MB).");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Logo must be an image file.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${pathPrefix}/${Date.now()}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await getSupabase()
    .storage.from(LOGO_BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true });
  if (error) throw error;

  const { data } = getSupabase().storage.from(LOGO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
