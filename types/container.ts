export type ProjectContainerStatus =
  | "Gepland"
  | "Onderweg"
  | "Geplaatst"
  | "Opgehaald"
  | "Geannuleerd";

export type ProjectContainer = {
  id: string;
  project_id: string;
  waste_type: string;
  container_size: string;
  planned_quantity: number;
  actual_quantity: number;

  planned_delivery_date: string | null;
  actual_delivery_date: string | null;

  planned_pickup_date: string | null;
  actual_pickup_date: string | null;

  status: ProjectContainerStatus | string | null;
  delivery_time: string | null;
  pickup_time: string | null;
  location: string | null;

  change_reason: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};