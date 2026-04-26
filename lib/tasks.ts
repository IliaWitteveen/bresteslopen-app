import { supabase } from "@/lib/supabase";
import { ProjectTask } from "@/types/task";

type CreateTaskInput = {
  project_id: string;
  task_type: string;
  title: string;
  location: string;
  priority: string;
  status: string;
  is_checked: boolean;
  notes: string;
};

type UpdateTaskInput = {
  task_type: string;
  title: string;
  location: string;
  priority: string;
  status: string;
  is_checked: boolean;
  notes: string;
};

function toNullableString(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : null;
}

export async function getTasksByProjectId(projectId: string): Promise<ProjectTask[]> {
  const { data, error } = await supabase
    .from("project_tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fout bij ophalen taken:", error);
    return [];
  }

  return data ?? [];
}

export async function createTask(input: CreateTaskInput) {
  const payload = {
    project_id: input.project_id,
    task_type: input.task_type.trim(),
    title: input.title.trim(),
    location: toNullableString(input.location),
    priority: toNullableString(input.priority),
    status: input.status.trim() || "Open",
    is_checked: Boolean(input.is_checked),
    notes: toNullableString(input.notes),
  };

  const { data, error } = await supabase
    .from("project_tasks")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Fout bij opslaan taak:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      payload,
    });
    throw error;
  }

  return data;
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  const payload = {
    task_type: input.task_type.trim(),
    title: input.title.trim(),
    location: toNullableString(input.location),
    priority: toNullableString(input.priority),
    status: input.status.trim() || "Open",
    is_checked: Boolean(input.is_checked),
    notes: toNullableString(input.notes),
    checked_at: input.is_checked ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("project_tasks")
    .update(payload)
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    console.error("Fout bij bijwerken taak:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      taskId,
      payload,
    });
    throw error;
  }

  return data;
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase
    .from("project_tasks")
    .delete()
    .eq("id", taskId);

  if (error) {
    console.error("Fout bij verwijderen taak:", error);
    throw error;
  }

  return true;
}

export async function toggleTaskChecked(taskId: string, currentValue: boolean) {
  const { data, error } = await supabase
    .from("project_tasks")
    .update({
      is_checked: !currentValue,
      status: !currentValue ? "Gereed" : "Open",
      checked_at: !currentValue ? new Date().toISOString() : null,
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    console.error("Fout bij wijzigen taak:", error);
    throw error;
  }

  return data;
}