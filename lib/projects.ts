import { supabase } from "@/lib/supabase";
import { Project } from "@/types/project";
import { getCurrentAppUser } from "@/lib/auth";

export type CreateAttentionPointInput = {
  title?: string;
  notes?: string;
  photos?: string[];
};

export type CreateEquipmentItemInput = {
  label?: string;
  quantity?: number;
  is_checked?: boolean;
  notes?: string;
  is_default_item?: boolean;
};

export type CreateTaskInput = {
  description?: string;
  is_removed?: boolean;
  is_done?: boolean;
  notes?: string;
  responsible_person?: string;
  photos?: string[];
};

export type CreateContainerInput = {
  waste_type?: string;
  container_size?: string;
  planned_quantity?: number;
  actual_quantity?: number;
  planned_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  planned_pickup_date?: string | null;
  actual_pickup_date?: string | null;
  change_reason?: string;
  notes?: string;
};

type CreateProjectInput = {
  project_number: string;
  name: string;
  address: string;
  opdrachtgever: string;
  demolition_type: string;
  building_type: string;
  area_m2: number;
  customer_contact: string;
  start_date: string | null;
  end_date: string | null;
  work_days: number;
  notes: string;
  status: string;

  bag_source_address?: string;
  bag_build_year?: number | null;
  bag_surface_m2?: number | null;
  bag_pand_id?: string | null;
  bag_verblijfsobject_id?: string | null;
  bag_status?: string | null;

  estimated_surface_m2?: number | null;
  estimated_man_hours?: number | null;
  estimated_container_count?: number | null;
  estimated_material_notes?: string;

  attention_points?: CreateAttentionPointInput[];
  equipment_items?: CreateEquipmentItemInput[];
  tasks?: CreateTaskInput[];
  containers?: CreateContainerInput[];
};

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatSupabaseError(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Onbekende fout";
  }

  const maybe = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  return [maybe.message, maybe.details, maybe.hint, maybe.code]
    .filter(Boolean)
    .join(" | ") || "Onbekende fout";
}

export async function getProjects(authUserId: string): Promise<Project[]> {
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    return [];
  }

  if (appUser.role === "admin" || appUser.role === "office") {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fout bij ophalen projecten:", error);
      return [];
    }

    return data ?? [];
  }

  const ownProjectsPromise = supabase
    .from("projects")
    .select("*")
    .eq("user_id", authUserId);

  const linkedProjectsPromise = appUser.profileId
    ? supabase
        .from("project_executors")
        .select(`
          project_id,
          executors!inner (
            id,
            linked_user_id
          ),
          projects (*)
        `)
        .eq("executors.linked_user_id", appUser.profileId)
    : Promise.resolve({ data: [], error: null });

  const [ownProjectsResult, linkedProjectsResult] = await Promise.all([
    ownProjectsPromise,
    linkedProjectsPromise,
  ]);

  if (ownProjectsResult.error) {
    console.error("Fout bij ophalen eigen projecten:", ownProjectsResult.error);
    return [];
  }

  if (linkedProjectsResult.error) {
    console.error("Fout bij ophalen gekoppelde projecten:", linkedProjectsResult.error);
    return [];
  }

  const ownProjects = ownProjectsResult.data ?? [];
  const linkedProjects = ((linkedProjectsResult.data ?? []) as any[])
    .map((row) => row.projects)
    .filter(Boolean);

  const merged = [...ownProjects, ...linkedProjects];

  const uniqueProjects = Array.from(
    new Map(merged.map((project) => [project.id, project])).values()
  ) as Project[];

  uniqueProjects.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });

  return uniqueProjects;
}

export async function createProject(input: CreateProjectInput, authUserId: string) {
  const {
    attention_points = [],
    equipment_items = [],
    tasks = [],
    containers = [],
    bag_source_address,
    bag_build_year,
    bag_surface_m2,
    bag_pand_id,
    bag_verblijfsobject_id,
    bag_status,
    estimated_surface_m2,
    estimated_man_hours,
    estimated_container_count,
    estimated_material_notes,
    ...baseProjectInput
  } = input;

  const projectInsertPayload = {
    ...baseProjectInput,
    user_id: authUserId,
    bag_source_address: bag_source_address || null,
    bag_build_year: bag_build_year ?? null,
    bag_surface_m2: bag_surface_m2 ?? null,
    bag_pand_id: bag_pand_id || null,
    bag_verblijfsobject_id: bag_verblijfsobject_id || null,
    bag_status: bag_status || null,
    estimated_surface_m2: estimated_surface_m2 ?? null,
    estimated_man_hours: estimated_man_hours ?? null,
    estimated_container_count: estimated_container_count ?? null,
    estimated_material_notes: estimated_material_notes || null,
  };

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert([projectInsertPayload])
    .select()
    .single();

  if (projectError) {
    console.error("Fout bij opslaan project:", {
      message: projectError.message,
      details: projectError.details,
      hint: projectError.hint,
      code: projectError.code,
    });
    throw new Error(formatSupabaseError(projectError));
  }

  try {
    if (attention_points.length > 0) {
      await insertAttentionPoints(project.id, attention_points);
    }

    if (equipment_items.length > 0) {
      await insertEquipmentItems(project.id, equipment_items);
    }

    if (tasks.length > 0) {
      await insertTasks(project.id, tasks);
    }

    if (containers.length > 0) {
      await insertContainers(project.id, containers);
    }

    return project;
  } catch (error) {
    console.error("Fout bij opslaan aanvullende projectdata:", error);

    await supabase.from("projects").delete().eq("id", project.id);

    throw error;
  }
}

async function insertAttentionPoints(
  projectId: string,
  attentionPoints: CreateAttentionPointInput[]
) {
  const cleanedAttentionPoints = attentionPoints
    .map((item) => ({
      title: safeString(item?.title),
      notes: safeString(item?.notes),
      photos: safeStringArray(item?.photos),
    }))
    .filter((item) => item.title || item.notes || item.photos.length > 0);

  for (let index = 0; index < cleanedAttentionPoints.length; index += 1) {
    const item = cleanedAttentionPoints[index];

    const { data: insertedAttentionPoint, error: attentionError } = await supabase
      .from("project_attention_points")
      .insert([
        {
          project_id: projectId,
          title: item.title || `Aandachtspunt ${index + 1}`,
          notes: item.notes || null,
          sort_order: index,
        },
      ])
      .select()
      .single();

    if (attentionError) {
      console.error("Fout bij opslaan aandachtspunt:", {
        message: attentionError.message,
        details: attentionError.details,
        hint: attentionError.hint,
        code: attentionError.code,
      });
      throw new Error(formatSupabaseError(attentionError));
    }

    if (item.photos.length > 0) {
      const photoRows = item.photos.map((photoUrl, photoIndex) => ({
        attention_point_id: insertedAttentionPoint.id,
        photo_url: photoUrl,
        caption: null,
        sort_order: photoIndex,
      }));

      const { error: photoError } = await supabase
        .from("project_attention_point_photos")
        .insert(photoRows);

      if (photoError) {
        console.error("Fout bij opslaan aandachtspuntfoto's:", {
          message: photoError.message,
          details: photoError.details,
          hint: photoError.hint,
          code: photoError.code,
        });
        throw new Error(formatSupabaseError(photoError));
      }
    }
  }
}

async function insertEquipmentItems(
  projectId: string,
  equipmentItems: CreateEquipmentItemInput[]
) {
  const cleanedEquipmentItems = equipmentItems
    .map((item) => ({
      label: safeString(item?.label),
      quantity: safeNumber(item?.quantity, 1),
      is_checked: Boolean(item?.is_checked),
      notes: safeString(item?.notes),
      is_default_item: Boolean(item?.is_default_item),
    }))
    .filter((item) => item.label);

  if (cleanedEquipmentItems.length === 0) {
    return;
  }

  const rows = cleanedEquipmentItems.map((item, index) => ({
    project_id: projectId,
    label: item.label,
    quantity: item.quantity > 0 ? item.quantity : 1,
    is_checked: item.is_checked,
    notes: item.notes || null,
    sort_order: index,
    is_default_item: item.is_default_item,
  }));

  const { error } = await supabase.from("project_equipment_items").insert(rows);

  if (error) {
    console.error("Fout bij opslaan spullen/gereedschap:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(formatSupabaseError(error));
  }
}

async function insertTasks(projectId: string, tasks: CreateTaskInput[]) {
  const cleanedTasks = tasks
    .map((item) => ({
      description: safeString(item?.description),
      is_removed: Boolean(item?.is_removed),
      is_done: Boolean(item?.is_done),
      notes: safeString(item?.notes),
      responsible_person: safeString(item?.responsible_person),
      photos: safeStringArray(item?.photos),
    }))
    .filter(
      (item) =>
        item.description || item.notes || item.photos.length > 0 || item.responsible_person
    );

  for (let index = 0; index < cleanedTasks.length; index += 1) {
    const item = cleanedTasks[index];

    const { data: insertedTask, error: taskError } = await supabase
      .from("project_tasks")
      .insert([
        {
          project_id: projectId,
          task_type: item.is_removed ? "Wel slopen" : "Niet slopen",
          title: item.description || `Taak ${index + 1}`,
          description: item.description || `Taak ${index + 1}`,
          is_removed: item.is_removed,
          is_done: item.is_done,
          notes: item.notes || null,
          responsible_person: item.responsible_person || null,
          sort_order: index,
        },
      ])
      .select()
      .single();

    if (taskError) {
      console.error("Fout bij opslaan taak:", {
        message: taskError.message,
        details: taskError.details,
        hint: taskError.hint,
        code: taskError.code,
      });
      throw new Error(formatSupabaseError(taskError));
    }

    if (item.photos.length > 0) {
      const photoRows = item.photos.map((photoUrl, photoIndex) => ({
        task_id: insertedTask.id,
        photo_url: photoUrl,
        caption: null,
        sort_order: photoIndex,
      }));

      const { error: photoError } = await supabase
        .from("project_task_photos")
        .insert(photoRows);

      if (photoError) {
        console.error("Fout bij opslaan taakfoto's:", {
          message: photoError.message,
          details: photoError.details,
          hint: photoError.hint,
          code: photoError.code,
        });
        throw new Error(formatSupabaseError(photoError));
      }
    }
  }
}

async function insertContainers(projectId: string, containers: CreateContainerInput[]) {
  const cleanedContainers = containers
    .map((item) => ({
      waste_type: safeString(item?.waste_type),
      container_size: safeString(item?.container_size),
      planned_quantity: safeNumber(item?.planned_quantity, 0),
      actual_quantity: safeNumber(item?.actual_quantity, 0),
      planned_delivery_date: safeString(item?.planned_delivery_date) || null,
      actual_delivery_date: safeString(item?.actual_delivery_date) || null,
      planned_pickup_date: safeString(item?.planned_pickup_date) || null,
      actual_pickup_date: safeString(item?.actual_pickup_date) || null,
      change_reason: safeString(item?.change_reason),
      notes: safeString(item?.notes),
    }))
    .filter((item) => item.waste_type && item.container_size);

  if (cleanedContainers.length === 0) {
    return;
  }

  const rows = cleanedContainers.map((item) => ({
    project_id: projectId,
    waste_type: item.waste_type,
    container_size: item.container_size,
    planned_quantity: item.planned_quantity,
    actual_quantity: item.actual_quantity,
    planned_delivery_date: item.planned_delivery_date,
    actual_delivery_date: item.actual_delivery_date,
    planned_pickup_date: item.planned_pickup_date,
    actual_pickup_date: item.actual_pickup_date,
    change_reason: item.change_reason || null,
    notes: item.notes || null,
  }));

  const { error } = await supabase.from("project_containers").insert(rows);

  if (error) {
    console.error("Fout bij opslaan containers:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw new Error(formatSupabaseError(error));
  }
}

export async function getProjectById(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Fout bij ophalen project:", error);
    return null;
  }

  return data;
}

export async function deleteProjectById(projectId: string) {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) throw error;
}