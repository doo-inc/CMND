import { supabase } from "@/integrations/supabase/client";
import { FilterParams } from "./customerUtils";
import { canonicalizeStageName } from "@/utils/stageNames";

export interface DashboardMetrics {
  totalCustomers: number;
  liveCustomers: number;
  totalContracts: number;
  totalRevenue: number;
  totalARR: number;
  mrr: number;
  pipelineValue: number;
  pipelineCount: number;
  averageDealSize: number;
  conversionRate: number;
  churnRate: string;
  pitchToPayDays: number;
  payToLiveDays: number;
  customersAtRisk: number;
}

/**
 * Fetches all dashboard metrics in optimized batch queries
 * Reduces 13+ API calls to just 4-5 queries
 */
export async function fetchDashboardMetrics(filterParams?: FilterParams): Promise<DashboardMetrics> {
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

  // Build filter conditions
  const countryFilter = filterParams?.countries?.length ? filterParams.countries : null;
  const segmentFilter = filterParams?.segments?.length ? filterParams.segments : null;

  // BATCH 1: Customers data (single query for multiple metrics)
  let customersQuery = supabase
    .from('customers')
    .select('id, stage, status, contract_size, estimated_deal_value, country, segment, created_at, churn_date');

  if (countryFilter) customersQuery = customersQuery.in('country', countryFilter);
  if (segmentFilter) customersQuery = customersQuery.in('segment', segmentFilter);
  if (filterParams?.dateFrom) customersQuery = customersQuery.gte('created_at', filterParams.dateFrom.toISOString());
  if (filterParams?.dateTo) customersQuery = customersQuery.lte('created_at', filterParams.dateTo.toISOString());

  // BATCH 2: Contracts data (single query for revenue/ARR/MRR)
  let contractsQuery = supabase
    .from('contracts')
    .select('id, customer_id, status, annual_rate, setup_fee, value, renewal_date, end_date, created_at, customers!inner(id, country, segment, status)');

  if (countryFilter) contractsQuery = contractsQuery.in('customers.country', countryFilter);
  if (segmentFilter) contractsQuery = contractsQuery.in('customers.segment', segmentFilter);
  if (filterParams?.dateFrom) contractsQuery = contractsQuery.gte('created_at', filterParams.dateFrom.toISOString());
  if (filterParams?.dateTo) contractsQuery = contractsQuery.lte('created_at', filterParams.dateTo.toISOString());

  // BATCH 3: Lifecycle stages for timing calculations (only if needed)
  let stagesQuery = supabase
    .from('lifecycle_stages')
    .select('customer_id, name, status, status_changed_at')
    .eq('status', 'done')
    .not('status_changed_at', 'is', null);

  // Execute all queries in parallel
  const [customersResult, contractsResult, stagesResult] = await Promise.all([
    customersQuery,
    contractsQuery,
    stagesQuery
  ]);

  const customers = customersResult.data || [];
  const contracts = contractsResult.data || [];
  const stages = stagesResult.data || [];

  // Helper: case-insensitive stage check
  const isLiveStage = (stage?: string | null) => 
    stage?.toLowerCase() === 'live';
  const isLostStage = (stage?: string | null) => 
    stage?.toLowerCase() === 'lost';

  // Calculate all metrics from cached data
  // Exclude churned AND lost customers from total
  const activeCustomers = customers.filter(c => 
    c.status !== 'churned' && !isLostStage(c.stage)
  );
  const totalCustomers = activeCustomers.length;

  // Contracts metrics - include active, pending, or null status; exclude churned customers
  const validContracts = contracts.filter(c => {
    const contractStatus = c.status?.toLowerCase();
    const customerStatus = c.customers?.status;
    return (contractStatus === 'active' || contractStatus === 'pending' || c.status === null) &&
           customerStatus !== 'churned';
  });
  const totalContracts = validContracts.length;

  // Active contracts only (status = 'active')
  const activeContracts = contracts.filter(c => {
    const contractStatus = c.status?.toLowerCase();
    const customerStatus = c.customers?.status;
    return contractStatus === 'active' && customerStatus !== 'churned';
  });

  // Live customers = customers with ACTIVE contracts only
  const liveCustomerIds = new Set(activeContracts.map(c => c.customer_id).filter(Boolean));
  const liveCustomerCount = liveCustomerIds.size;

  // Pipeline customers: NOT churned, NOT in live customers set, NOT Lost
  const pipelineCustomers = customers.filter(c => 
    c.status !== 'churned' && 
    !liveCustomerIds.has(c.id) &&
    !isLostStage(c.stage)
  );
  const pipelineValue = pipelineCustomers.reduce((sum, c) => 
    sum + (c.estimated_deal_value || c.contract_size || 0), 0
  );
  const pipelineCount = pipelineCustomers.length;
  const averageDealSize = pipelineCount > 0 ? Math.round(pipelineValue / pipelineCount) : 0;

  // Conversion rate: live customers / total customers
  const conversionRate = totalCustomers > 0 ? (liveCustomerCount / totalCustomers) * 100 : 0;

  // Total Revenue (setup_fee + annual_rate or value)
  const totalRevenue = validContracts.reduce((sum, c) => {
    const contractValue = (c.setup_fee > 0 || c.annual_rate > 0)
      ? (c.setup_fee || 0) + (c.annual_rate || 0)
      : (c.value || 0);
    return sum + contractValue;
  }, 0);

  // ARR from active contracts
  const totalARR = validContracts.reduce((sum, c) => sum + (c.annual_rate || 0), 0);

  // MRR (active contracts with future end date)
  const activeContractsForMRR = validContracts.filter(c => 
    c.end_date && new Date(c.end_date) > today
  );
  const mrr = Math.round(activeContractsForMRR.reduce((sum, c) => sum + (c.annual_rate || 0), 0) / 12);

  // Customers at risk (contracts renewing in 30 days)
  const atRiskContracts = contracts.filter(c =>
    c.renewal_date &&
    new Date(c.renewal_date) >= today &&
    new Date(c.renewal_date) <= thirtyDaysFromNow &&
    (c.customers?.status === 'done' || c.customers?.status === 'active')
  );
  const uniqueAtRiskCustomers = new Set(atRiskContracts.map(c => c.customer_id));
  const customersAtRisk = uniqueAtRiskCustomers.size;

  // Churn rate - churned in period / (active + churned in period)
  const churnedInPeriod = customers.filter(c => 
    c.status === 'churned' && 
    c.churn_date && 
    new Date(c.churn_date) >= sixMonthsAgo
  ).length;
  const baseForChurn = totalCustomers + churnedInPeriod;
  const churnRate = baseForChurn > 0 
    ? `${((churnedInPeriod / baseForChurn) * 100).toFixed(1)}%`
    : "0.0%";

  // Pitch to Pay & Pay to Live timing
  const discoveryStages = stages.filter(s => canonicalizeStageName(s.name) === 'Discovery Call');
  const paymentStages = stages.filter(s => canonicalizeStageName(s.name) === 'Payment Processed');
  const goLiveStages = stages.filter(s => canonicalizeStageName(s.name) === 'Go Live');

  // Pitch to Pay
  const pitchToPayTimes: number[] = [];
  discoveryStages.forEach(discovery => {
    const payment = paymentStages.find(p => p.customer_id === discovery.customer_id);
    if (payment && discovery.status_changed_at && payment.status_changed_at) {
      const discoveryDate = new Date(discovery.status_changed_at);
      const paymentDate = new Date(payment.status_changed_at);
      if (paymentDate > discoveryDate) {
        const diffDays = Math.ceil((paymentDate.getTime() - discoveryDate.getTime()) / (1000 * 60 * 60 * 24));
        pitchToPayTimes.push(diffDays);
      }
    }
  });
  const pitchToPayDays = pitchToPayTimes.length > 0 
    ? Math.round(pitchToPayTimes.reduce((a, b) => a + b, 0) / pitchToPayTimes.length)
    : 0;

  // Pay to Live
  const payToLiveTimes: number[] = [];
  paymentStages.forEach(payment => {
    const goLive = goLiveStages.find(g => g.customer_id === payment.customer_id);
    if (goLive && payment.status_changed_at && goLive.status_changed_at) {
      const paymentDate = new Date(payment.status_changed_at);
      const goLiveDate = new Date(goLive.status_changed_at);
      if (goLiveDate > paymentDate) {
        const diffDays = Math.ceil((goLiveDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
        payToLiveTimes.push(diffDays);
      }
    }
  });
  const payToLiveDays = payToLiveTimes.length > 0
    ? Math.round(payToLiveTimes.reduce((a, b) => a + b, 0) / payToLiveTimes.length)
    : 0;

  return {
    totalCustomers,
    liveCustomers: liveCustomerCount,
    totalContracts,
    totalRevenue,
    totalARR,
    mrr,
    pipelineValue,
    pipelineCount,
    averageDealSize,
    conversionRate,
    churnRate,
    pitchToPayDays,
    payToLiveDays,
    customersAtRisk
  };
}

