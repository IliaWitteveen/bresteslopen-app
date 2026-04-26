export type ProjectPhoto = {
  id: string;
  project_id: string;
  task_id: string | null;
  file_url: string | null;
  category: string;
  label: string | null;
  title: string;
  notes: string | null;
  uploaded_by_user_id: string | null;
  created_at?: string;
};