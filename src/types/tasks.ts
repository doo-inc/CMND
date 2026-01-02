
export interface Task {
  id: string;
  title: string;
  description: string;
  status: string; // Dynamic column ID
  due_date: string | null;
  customer_id: string | null;
  assigned_to: string | null;
  completed_by?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  // Additional properties for UI display
  customer_name?: string;
  assigned_to_name?: string;
  completed_by_name?: string;
}

export interface Feedback {
  id: string;
  customer_id: string;
  content: string;
  created_by: string;
  created_by_name?: string;
  created_by_avatar?: string;
  created_at: string;
  updated_at: string;
}
