import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export async function uploadResumeAsset(file: File, ownerId: string, kind: "profile" | "experience") {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const fileName = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const filePath = `${ownerId}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from("resume-assets").upload(filePath, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from("resume-assets").getPublicUrl(filePath);
  return data.publicUrl;
}
