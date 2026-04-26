import { supabase } from "@/lib/supabase";

export type AppRole = "admin" | "uitvoerder" | "office" | null;

export type CurrentAppUser = {
  authUserId: string;
  profileId: string | null;
  email: string;
  name: string | null;
  role: AppRole;
};

type UserRow = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
}

function normalizeRole(role: string | null | undefined): AppRole {
  if (!role) return null;

  const value = role.trim().toLowerCase();

  if (value === "admin") return "admin";
  if (value === "uitvoerder") return "uitvoerder";
  if (value === "office") return "office";

  return null;
}

export async function getUserProfileByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role")
    .ilike("email", normalizedEmail)
    .maybeSingle<UserRow>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function getCurrentAppUser(): Promise<CurrentAppUser | null> {
  const authUser = await getCurrentUser();

  if (!authUser?.email) {
    return null;
  }

  const profile = await getUserProfileByEmail(authUser.email);

  return {
    authUserId: authUser.id,
    profileId: profile?.id ?? null,
    email: authUser.email,
    name: profile?.name ?? authUser.email,
    role: normalizeRole(profile?.role),
  };
}

export async function requireCurrentAppUser(): Promise<CurrentAppUser> {
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    throw new Error("Geen ingelogde gebruiker gevonden.");
  }

  return appUser;
}

export async function isCurrentUserAdmin() {
  const appUser = await getCurrentAppUser();
  return appUser?.role === "admin";
}

export async function isCurrentUserUitvoerder() {
  const appUser = await getCurrentAppUser();
  return appUser?.role === "uitvoerder";
}