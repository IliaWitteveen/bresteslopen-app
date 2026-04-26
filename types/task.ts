export type ProjectTask = {
  id: string;
  project_id: string;
  task_type: string;
  title: string;
  location: string | null;
  priority: string | null;
  status: string;
  is_checked: boolean;
  checked_by_user_id: string | null;
  checked_at: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};