
import type { Database } from "@/integrations/supabase/types";

// Customers types
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"];
export type CustomerUpdate = Database["public"]["Tables"]["customers"]["Update"];

// Staff types
export type Staff = Database["public"]["Tables"]["staff"]["Row"];
export type StaffInsert = Database["public"]["Tables"]["staff"]["Insert"];
export type StaffUpdate = Database["public"]["Tables"]["staff"]["Update"];

// Lifecycle stages types
export type LifecycleStage = Database["public"]["Tables"]["lifecycle_stages"]["Row"];
export type LifecycleStageInsert = Database["public"]["Tables"]["lifecycle_stages"]["Insert"];
export type LifecycleStageUpdate = Database["public"]["Tables"]["lifecycle_stages"]["Update"];

// Contracts types
export type Contract = Database["public"]["Tables"]["contracts"]["Row"];
export type ContractInsert = Database["public"]["Tables"]["contracts"]["Insert"];
export type ContractUpdate = Database["public"]["Tables"]["contracts"]["Update"];

// Renewal activities types
export type RenewalActivity = Database["public"]["Tables"]["renewal_activities"]["Row"];
export type RenewalActivityInsert = Database["public"]["Tables"]["renewal_activities"]["Insert"];
export type RenewalActivityUpdate = Database["public"]["Tables"]["renewal_activities"]["Update"];

// Documents types
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
export type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];

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
