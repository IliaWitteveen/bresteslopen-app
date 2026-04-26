import { supabase } from "@/lib/supabase";
import { Executor } from "@/types/executor";

export async function getExecutors(): Promise<Executor[]> {
  const { data, error } = await supabase
    .from("executors")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Fout bij ophalen uitvoerders:", error);
    return [];
  }

  return data ?? [];
}

export async function getExecutorsByProjectId(projectId: string): Promise<Executor[]> {
  const { data, error } = await supabase
    .from("project_executors")
    .select(`
      id,
      executor_id,
      executors (
        id,
        name,
        is_app_user,
        linked_user_id,
        is_active,
        created_at
      )
    `)
    .eq("project_id", projectId);

  if (error) {
    console.error("Fout bij ophalen projectuitvoerders:", error);
    return [];
  }

  return (data ?? [])
    .map((row: any) => row.executors)
    .filter(Boolean);
}

export async function addExecutorToProject(projectId: string, executorId: string) {
  const { data, error } = await supabase
    .from("project_executors")
    .insert([{ project_id: projectId, executor_id: executorId }])
    .select()
    .single();

  if (error) {
    console.error("Fout bij koppelen uitvoerder:", error);
    throw error;
  }

  return data;
}

export async function removeExecutorFromProject(projectId: string, executorId: string) {
  const { error } = await supabase
    .from("project_executors")
    .delete()
    .eq("project_id", projectId)
    .eq("executor_id", executorId);

  if (error) {
    console.error("Fout bij verwijderen uitvoerder:", error);
    throw error;
  }

  return true;
}