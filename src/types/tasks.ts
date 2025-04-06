
export interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done" | "blocked";
  due_date: string | null;
  customer_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  customer_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
