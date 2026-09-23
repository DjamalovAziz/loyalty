import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

export async function uploadBusinessLogo(businessId: string, file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Use png, jpg, or webp.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File is too large. Max size is 1 MB.");
  }

  const ext = file.type.split("/")[1] ?? "bin";
  const path = `business-logos/${businessId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  return data.publicUrl;
}
