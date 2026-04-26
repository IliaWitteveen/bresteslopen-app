import { createClient } from "@/lib/supabase/server";
import { mockProjects } from "@/lib/mock-data";
import { Project } from "@/lib/types";

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();

  if (!supabase) {
    return mockProjects;
  }

  const { data, error } = await supabase.from("projects").select("*").order("start_date", { ascending: false });

  if (error || !data) {
    return mockProjects;
  }

  return data.map((row) => ({
    id: row.id,
    projectNumber: row.project_number,
    name: row.name,
    address: row.address,
    opdrachtgever: row.opdrachtgever,
    demolitionType: row.demolition_type,
    buildingType: row.building_type,
    areaM2: row.area_m2,
    customerContact: row.customer_contact,
    startDate: row.start_date,
    endDate: row.end_date,
    workDays: row.work_days,
    status: row.status,
    notes: row.notes,
    executors: [],
    tasks: [],
    containers: [],
    photos: [],
    history: []
  }));
}

export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = await createClient();

  if (!supabase) {
    return mockProjects.find((project) => project.id === id) ?? null;
  }

  const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();

  if (error || !data) {
    return mockProjects.find((project) => project.id === id) ?? null;
  }

  return {
    id: data.id,
    projectNumber: data.project_number,
    name: data.name,
    address: data.address,
    opdrachtgever: data.opdrachtgever,
    demolitionType: data.demolition_type,
    buildingType: data.building_type,
    areaM2: data.area_m2,
    customerContact: data.customer_contact,
    startDate: data.start_date,
    endDate: data.end_date,
    workDays: data.work_days,
    status: data.status,
    notes: data.notes,
    executors: [],
    tasks: [],
    containers: [],
    photos: [],
    history: []
  };
}
