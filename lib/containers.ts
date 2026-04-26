import { supabase } from "@/lib/supabase";
import { ProjectContainer, type ProjectContainerStatus } from "@/types/container";

type CreateContainerInput = {
  project_id: string;
  waste_type: string;
  container_size: string;
  planned_quantity: number;
  actual_quantity: number;
  planned_delivery_date: string | null;
  actual_delivery_date: string | null;
  planned_pickup_date: string | null;
  actual_pickup_date: string | null;
  status?: ProjectContainerStatus | string | null;
  delivery_time?: string | null;
  pickup_time?: string | null;
  location?: string | null;
  change_reason: string;
  notes: string;
};

type UpdateContainerInput = {
  waste_type: string;
  container_size: string;
  planned_quantity: number;
  actual_quantity: number;
  planned_delivery_date: string | null;
  actual_delivery_date: string | null;
  planned_pickup_date: string | null;
  actual_pickup_date: string | null;
  status?: ProjectContainerStatus | string | null;
  delivery_time?: string | null;
  pickup_time?: string | null;
  location?: string | null;
  change_reason: string;
  notes: string;
};

function toNullableString(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : null;
}

export async function getContainersByProjectId(projectId: string): Promise<ProjectContainer[]> {
  const { data, error } = await supabase
    .from("project_containers")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fout bij ophalen containers:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }

  return (data ?? []) as ProjectContainer[];
}

export async function createContainer(input: CreateContainerInput) {
  const payload = {
    project_id: input.project_id,
    waste_type: input.waste_type.trim(),
    container_size: input.container_size.trim(),
    planned_quantity: Number(input.planned_quantity || 0),
    actual_quantity: Number(input.actual_quantity || 0),
    planned_delivery_date: toNullableString(input.planned_delivery_date),
    actual_delivery_date: toNullableString(input.actual_delivery_date),
    planned_pickup_date: toNullableString(input.planned_pickup_date),
    actual_pickup_date: toNullableString(input.actual_pickup_date),
    status: toNullableString(input.status || "Gepland"),
    delivery_time: toNullableString(input.delivery_time),
    pickup_time: toNullableString(input.pickup_time),
    location: toNullableString(input.location),
    change_reason: toNullableString(input.change_reason),
    notes: toNullableString(input.notes),
  };

  const { data, error } = await supabase
    .from("project_containers")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Fout bij opslaan container:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      payload,
    });
    throw new Error(
      [error.message, error.details, error.hint, error.code].filter(Boolean).join(" | ")
    );
  }

  return data as ProjectContainer;
}

export async function updateContainer(containerId: string, input: UpdateContainerInput) {
  const payload = {
    waste_type: input.waste_type.trim(),
    container_size: input.container_size.trim(),
    planned_quantity: Number(input.planned_quantity || 0),
    actual_quantity: Number(input.actual_quantity || 0),
    planned_delivery_date: toNullableString(input.planned_delivery_date),
    actual_delivery_date: toNullableString(input.actual_delivery_date),
    planned_pickup_date: toNullableString(input.planned_pickup_date),
    actual_pickup_date: toNullableString(input.actual_pickup_date),
    status: toNullableString(input.status || "Gepland"),
    delivery_time: toNullableString(input.delivery_time),
    pickup_time: toNullableString(input.pickup_time),
    location: toNullableString(input.location),
    change_reason: toNullableString(input.change_reason),
    notes: toNullableString(input.notes),
  };

  const { data, error } = await supabase
    .from("project_containers")
    .update(payload)
    .eq("id", containerId)
    .select()
    .single();

  if (error) {
    console.error("Fout bij bijwerken container:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      payload,
      containerId,
    });
    throw new Error(
      [error.message, error.details, error.hint, error.code].filter(Boolean).join(" | ")
    );
  }

  return data as ProjectContainer;
}

export async function deleteContainer(containerId: string) {
  const { error } = await supabase
    .from("project_containers")
    .delete()
    .eq("id", containerId);

  if (error) {
    console.error("Fout bij verwijderen container:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      containerId,
    });
    throw new Error(
      [error.message, error.details, error.hint, error.code].filter(Boolean).join(" | ")
    );
  }

  return true;
}