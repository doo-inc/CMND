// Define basic types without relying on Supabase generated types
// These types match our database schema but don't depend on the generated types

// Customers types
export interface Customer {
  id: string;
  name: string;
  logo?: string | null;
  segment?: string | null;
  region?: string | null;
  stage?: string | null;
  status?: string | null;
  contract_size?: number | null;
  owner_id?: string | null;
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
