export type Executor = {
  id: string;
  name: string;
  is_app_user: boolean;
  linked_user_id: string | null;
  is_active?: boolean;
  created_at?: string;
};

export type ProjectExecutor = {
  id: string;
  project_id: string;
  executor_id: string;
  created_at?: string;
};