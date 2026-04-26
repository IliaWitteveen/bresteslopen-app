import { supabase } from "@/lib/supabase";

export type AppUserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export async function getUserProfileByEmail(email: string): Promise<AppUserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle(); // 🔥 belangrijk

  if (error) {
    console.error("Fout bij ophalen gebruikersprofiel:", error);
    return null;
  }

  return data;
}