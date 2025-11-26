import { supabase } from "@/integrations/supabase/client";
import { PARTNERSHIP_TYPE_LABELS } from "@/types/partnerships";

interface ReportData {
  lifecycleChanges: any[];
  newCustomers: any[];
  newContracts: any[];
  newPartnerships: any[];
  churns: any[];
  periodStart: Date;
  periodEnd: Date;
}

const getLatestLifecycleStages = (stages: any[]) => {
  const customerStages = new Map();
  stages.forEach(stage => {
    const existing = customerStages.get(stage.customer_id);
    if (!existing || new Date(stage.status_changed_at) > new Date(existing.status_changed_at)) {
      customerStages.set(stage.customer_id, stage);
    }
  });
  return Array.from(customerStages.values());
};

const fetchWeeklyData = async (): Promise<ReportData> => {
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 7);

  const [lifecycleData, customersData, contractsData, partnershipsData, churnsData] = await Promise.all([
    supabase
      .from('lifecycle_stages')
      .select('customer_id, name, status_changed_at, customers!inner(name)')
      .gte('status_changed_at', periodStart.toISOString()),
    supabase
      .from('customers')
      .select('id, name, created_at, stage')
      .gte('created_at', periodStart.toISOString()),
    supabase
      .from('contracts')
      .select('id, name, customer_id, value, setup_fee, annual_rate, status, start_date, created_at, customers!inner(name)')
      .gte('created_at', periodStart.toISOString()),
    supabase
      .from('partnerships')
      .select('id, name, partnership_type, status, expected_value, country, created_at')
      .gte('created_at', periodStart.toISOString()),
    supabase
      .from('customers')
      .select('id, name, churn_date')
      .eq('status', 'churned')
      .gte('churn_date', periodStart.toISOString()),
  ]);

  return {
    lifecycleChanges: getLatestLifecycleStages(lifecycleData.data || []),
    newCustomers: customersData.data || [],
    newContracts: contractsData.data || [],
    newPartnerships: partnershipsData.data || [],
    churns: churnsData.data || [],
    periodStart,
    periodEnd,
  };
};

const fetchMonthlyData = async (): Promise<ReportData> => {
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 30);

  const [lifecycleData, customersData, contractsData, partnershipsData, churnsData] = await Promise.all([
    supabase
      .from('lifecycle_stages')
      .select('customer_id, name, status_changed_at, customers!inner(name)')
      .gte('status_changed_at', periodStart.toISOString()),
    supabase
      .from('customers')
      .select('id, name, created_at, stage')
      .gte('created_at', periodStart.toISOString()),
    supabase
      .from('contracts')
      .select('id, name, customer_id, value, setup_fee, annual_rate, status, start_date, created_at, customers!inner(name)')
      .gte('created_at', periodStart.toISOString()),
    supabase
      .from('partnerships')
      .select('id, name, partnership_type, status, expected_value, country, created_at')
      .gte('created_at', periodStart.toISOString()),
    supabase
      .from('customers')
      .select('id, name, churn_date')
      .eq('status', 'churned')
      .gte('churn_date', periodStart.toISOString()),
  ]);

  return {
    lifecycleChanges: getLatestLifecycleStages(lifecycleData.data || []),
    newCustomers: customersData.data || [],
    newContracts: contractsData.data || [],
    newPartnerships: partnershipsData.data || [],
    churns: churnsData.data || [],
    periodStart,
    periodEnd,
  };
};

const generateTextReport = (data: ReportData, type: 'weekly' | 'monthly'): string => {
  const { lifecycleChanges, newCustomers, newContracts, newPartnerships, churns, periodStart, periodEnd } = data;

  let report = `${type.toUpperCase()} UPDATE REPORT\n`;
  report += `Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}\n`;
  report += `Generated: ${new Date().toLocaleString()}\n\n`;
  report += `===========================================\n\n`;

  report += `SUMMARY\n`;
  report += `-------\n`;
  report += `Lifecycle Changes: ${lifecycleChanges.length}\n`;
  report += `Newly Added Customers: ${newCustomers.length}\n`;
  report += `New Contracts: ${newContracts.length}\n`;
  report += `New Partnerships: ${newPartnerships.length}\n`;
  report += `Churns: ${churns.length}\n\n`;

  if (lifecycleChanges.length > 0) {
    report += `LIFECYCLE CHANGES\n`;
    report += `-----------------\n`;
    lifecycleChanges.forEach(change => {
      report += `• ${change.customers.name} → ${change.name}\n`;
    });
    report += `\n`;
  }

  if (newCustomers.length > 0) {
    report += `NEWLY ADDED CUSTOMERS\n`;
    report += `---------------------\n`;
    newCustomers.forEach((customer: any) => {
      const stage = customer.stage ? ` (${customer.stage})` : '';
      report += `• ${customer.name}${stage} - ${new Date(customer.created_at).toLocaleDateString()}\n`;
    });
    report += `\n`;
  }

  if (newContracts.length > 0) {
    report += `NEW CONTRACTS\n`;
    report += `-------------\n`;
    newContracts.forEach((contract: any) => {
      const totalValue = (contract.setup_fee || 0) + (contract.annual_rate || 0);
      const customerName = contract.customers?.name || 'Unknown Customer';
      const startDate = contract.start_date ? new Date(contract.start_date).toLocaleDateString() : 'N/A';
      report += `• ${customerName}: ${contract.name} - $${totalValue.toLocaleString()} (${contract.status || 'N/A'}) - Start: ${startDate}\n`;
    });
    report += `\n`;
  }

  if (newPartnerships.length > 0) {
    report += `NEW PARTNERSHIPS\n`;
    report += `----------------\n`;
    newPartnerships.forEach((partnership: any) => {
      const partnerType = PARTNERSHIP_TYPE_LABELS[partnership.partnership_type as keyof typeof PARTNERSHIP_TYPE_LABELS] || partnership.partnership_type;
      const expectedValue = partnership.expected_value ? `$${partnership.expected_value.toLocaleString()}` : 'N/A';
      const country = partnership.country ? ` - ${partnership.country}` : '';
      report += `• ${partnership.name} (${partnerType}) - Expected: ${expectedValue} - ${partnership.status}${country}\n`;
    });
    report += `\n`;
  }

  if (churns.length > 0) {
    report += `CHURNED CUSTOMERS\n`;
    report += `-----------------\n`;
    churns.forEach(churn => {
      report += `• ${churn.name} (${new Date(churn.churn_date).toLocaleDateString()})\n`;
    });
    report += `\n`;
  }

  return report;
};

const downloadReport = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateWeeklyReport = async () => {
  const data = await fetchWeeklyData();
  const report = generateTextReport(data, 'weekly');
  const filename = `weekly-update-${data.periodStart.toISOString().split('T')[0]}.txt`;
  downloadReport(report, filename);
};

export const generateMonthlyReport = async () => {
  const data = await fetchMonthlyData();
  const report = generateTextReport(data, 'monthly');
  const filename = `monthly-update-${data.periodStart.toISOString().split('T')[0]}.txt`;
  downloadReport(report, filename);
};
