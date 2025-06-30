
export interface ProcessedCustomer {
  id: string;
  name: string;
  logo?: string | null;
  segment?: string | null;
  country?: string | null;
  owner_id?: string | null;
  annual_rate?: number | null;
  setup_fee?: number | null;
  go_live_date?: string | null;
  subscription_end_date?: string | null;
  timeLeft: string;
  status: "active" | "expiring_soon" | "expired" | "missing_date";
  delta: number;
  progressPercentage: number;
  contractCount: number;
  lifetimeValue: number;
  contracts: any[];
}

export type ViewMode = "timeline" | "renewals";
