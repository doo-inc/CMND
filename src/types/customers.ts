// Define basic types without relying on Supabase generated types
// These types match our database schema but don't depend on the generated types

// Customers types
export interface Customer {
  id: string;
  name: string;
  logo?: string | null;
  segment?: string | null;
  country?: string | null;
  stage?: string | null;
  status?: "not-started" | "in-progress" | "done" | "blocked" | "churned" | null;
  churn_date?: string | null;
  contract_size?: number | null;
  estimated_deal_value?: number | null;
  setup_fee?: number | null;
  annual_rate?: number | null;
  go_live_date?: string | null;
  subscription_end_date?: string | null;
  owner_id?: string | null;
  description?: string | null;
  industry?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  company_registration_number?: string | null;
  legal_address?: string | null;
  representative_name?: string | null;
  representative_title?: string | null;
  payment_terms_days?: number | null;
  currency?: string | null;
  service_type?: 'text' | 'voice' | 'both' | null;
  text_plan?: 'basic' | 'growth' | 'pro' | 'scale' | 'enterprise' | 'large_enterprise' | null;
  text_ai_responses?: number | null;
  voice_tier?: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | null;
  voice_hours?: number | null;
  voice_price_per_hour?: number | null;
  created_at: string;
  updated_at: string;
}

export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at'>;
export type CustomerUpdate = Partial<CustomerInsert>;

// Staff types
export interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  created_at: string;
  updated_at: string;
}

export type StaffInsert = Omit<Staff, 'id' | 'created_at' | 'updated_at'>;
export type StaffUpdate = Partial<StaffInsert>;

// Lifecycle stages types
export interface LifecycleStage {
  id: string;
  customer_id: string;
  name: string;
  status?: string | null;
  owner_id?: string | null;
  deadline?: string | null;
  notes?: string | null;
  category?: string | null;
  created_at: string;
  updated_at: string;
}

export type LifecycleStageInsert = Omit<LifecycleStage, 'id' | 'created_at' | 'updated_at'>;
export type LifecycleStageUpdate = Partial<LifecycleStageInsert>;

// Contracts types
export interface Contract {
  id: string;
  customer_id: string;
  name: string;
  status?: string | null;
  value: number;
  start_date: string;
  end_date: string;
  renewal_date?: string | null;
  terms?: string | null;
  owner_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type ContractInsert = Omit<Contract, 'id' | 'created_at' | 'updated_at'>;
export type ContractUpdate = Partial<ContractInsert>;

// Timeline events types
export interface TimelineEvent {
  id: string;
  customer_id: string;
  event_type: string;
  event_description: string;
  created_at: string;
  created_by?: string | null;
  created_by_name?: string | null;
  created_by_avatar?: string | null;
  related_id?: string | null;
  related_type?: string | null;
  updated_at: string;
}

export type TimelineEventInsert = Omit<TimelineEvent, 'id' | 'created_at' | 'updated_at'>;
export type TimelineEventUpdate = Partial<TimelineEventInsert>;

// Renewal activities types
export interface RenewalActivity {
  id: string;
  contract_id: string;
  activity_type: string;
  description: string;
  status?: string | null;
  due_date?: string | null;
  completed_date?: string | null;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

export type RenewalActivityInsert = Omit<RenewalActivity, 'id' | 'created_at' | 'updated_at'>;
export type RenewalActivityUpdate = Partial<RenewalActivityInsert>;

// Documents types
export interface Document {
  id: string;
  customer_id: string;
  contract_id?: string | null;
  name: string;
  document_type: string;
  file_path: string;
  file_size?: number | null;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentInsert = Omit<Document, 'id' | 'created_at' | 'updated_at'>;
export type DocumentUpdate = Partial<DocumentInsert>;

// Feedback types
export interface Feedback {
  id: string;
  customer_id: string;
  content: string;
  created_by: string;
  created_by_name?: string | null;
  created_by_avatar?: string | null;
  created_at: string;
  updated_at: string;
}

export type FeedbackInsert = Omit<Feedback, 'id' | 'created_at' | 'updated_at'>;
export type FeedbackUpdate = Partial<FeedbackInsert>;

// Tasks types
export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  due_date?: string | null;
  customer_id?: string | null;
  assigned_to?: string | null;
  customer_name?: string;
  assigned_to_name?: string;
  created_at: string;
  updated_at: string;
}

export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at'>;
export type TaskUpdate = Partial<TaskInsert>;

// Enhanced types with additional fields for UI components
export interface CustomerWithOwner extends Customer {
  owner?: {
    id: string;
    name: string;
    role?: string;
  };
}

export interface LifecycleStageWithOwner extends LifecycleStage {
  owner?: {
    id: string;
    name: string;
    role?: string;
  };
}

// CustomerData interface for UI components - updated to include new contract fields
export interface CustomerData {
  id: string;
  name: string;
  logo?: string;
  segment?: string;
  country?: string;
  stage?: string;
  status?: string;
  contractSize: number;
  setup_fee?: number;
  annual_rate?: number;
  go_live_date?: string;
  subscription_end_date?: string;
  completedStages?: string[];
  furthestCompletedStage?: string;
  lastUpdatedStage?: string;
  owner: {
    id: string;
    name: string;
    role: string;
  };
  owner_id?: string;
  description?: string;
  contract_size?: number;
  lifecyclePercentage?: number;
  industry?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}
