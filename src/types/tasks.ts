
export type TaskCategory = "COE" | "BD" | "General";

export const TASK_CATEGORIES: { id: TaskCategory; label: string; color: string; bg: string }[] = [
  { id: "COE", label: "COE", color: "text-violet-700 dark:text-violet-300", bg: "bg-violet-100 dark:bg-violet-900/30" },
  { id: "BD", label: "BD", color: "text-sky-700 dark:text-sky-300", bg: "bg-sky-100 dark:bg-sky-900/30" },
  { id: "General", label: "General", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-800" },
];

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  category: TaskCategory;
  due_date: string | null;
  customer_id: string | null;
  assigned_to: string | null;
  completed_by?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
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
