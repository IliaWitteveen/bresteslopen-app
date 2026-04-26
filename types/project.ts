export type Project = {
  id: string;
  project_number: string;
  name: string;
  address: string;
  opdrachtgever: string;
  demolition_type: string;
  building_type: string;
  area_m2: number;
  customer_contact: string;
  start_date: string;
  end_date: string;
  work_days: number;
  notes: string | null;
  status: string;

  user_id?: string | null;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;

  bag_source_address?: string | null;
  bag_pand_id?: string | null;
  bag_verblijfsobject_id?: string | null;
  bag_build_year?: number | null;
  bag_surface_m2?: number | null;
  bag_status?: string | null;
  bag_payload_json?: Record<string, unknown> | null;

  estimated_surface_m2?: number | null;
  actual_surface_m2?: number | null;

  estimated_man_hours?: number | null;
  actual_man_hours?: number | null;

  estimated_container_count?: number | null;
  actual_container_count?: number | null;

  estimated_material_notes?: string | null;
  actual_material_notes?: string | null;

  preparation_pdf_url?: string | null;
  completion_pdf_url?: string | null;
  completed_report_sent_at?: string | null;
};