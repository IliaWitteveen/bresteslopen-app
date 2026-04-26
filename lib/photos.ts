import { supabase } from "@/lib/supabase";
import { ProjectPhoto } from "@/types/photo";

const PHOTO_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_PHOTO_BUCKET || "photos";

function describeSupabaseError(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Onbekende fout";
  }

  const maybe = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  return {
    message: maybe.message || "Onbekende fout",
    details: maybe.details || "",
    hint: maybe.hint || "",
    code: maybe.code || "",
  };
}

export async function getPhotosByProjectId(projectId: string): Promise<ProjectPhoto[]> {
  try {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get photos by project id error:", describeSupabaseError(error));
      return [];
    }

    return (data || []) as ProjectPhoto[];
  } catch (error) {
    console.error("Get photos by project id unexpected error:", describeSupabaseError(error));
    return [];
  }
}

export async function createPhoto(
  photo: Omit<ProjectPhoto, "id" | "created_at">
): Promise<ProjectPhoto> {
  const { data, error } = await supabase
    .from("photos")
    .insert(photo)
    .select()
    .single();

  if (error) {
    console.error("Create photo error:", describeSupabaseError(error));
    throw error;
  }

  return data as ProjectPhoto;
}

export async function uploadPhotoFile(file: File, projectId: string): Promise<string> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const safeExt = ext ? `.${ext.toLowerCase()}` : "";
  const safeName = file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const filePath = `${projectId}/${Date.now()}-${safeName || "bestand"}${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(filePath, file, {
      upsert: false,
    });

  if (uploadError) {
    console.error("Upload photo file error:", describeSupabaseError(uploadError));
    throw uploadError;
  }

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("Public URL ophalen mislukt.");
  }

  return data.publicUrl;
}