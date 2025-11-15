import { supabase } from "@/integrations/supabase/client";

interface ReportData {
  newCustomers: any[];
  newLeads: any[];
  lifecycleChanges: any[];
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

  const [customersData, leadsData, lifecycleData, churnsData] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, created_at')
      .gte('created_at', periodStart.toISOString())
      .neq('status', 'churned'),
    supabase
      .from('customers')
      .select('id, name, created_at')
      .eq('status', 'lead')
      .gte('created_at', periodStart.toISOString()),
    supabase
      .from('lifecycle_stages')
      .select('customer_id, name, status_changed_at, customers!inner(name)')
      .gte('status_changed_at', periodStart.toISOString()),
    supabase
      .from('customers')
      .select('id, name, churn_date')
      .eq('status', 'churned')
      .gte('churn_date', periodStart.toISOString()),
  ]);

  return {
    newCustomers: customersData.data || [],
    newLeads: leadsData.data || [],
    lifecycleChanges: getLatestLifecycleStages(lifecycleData.data || []),
    churns: churnsData.data || [],
    periodStart,
    periodEnd,
  };
};

const fetchMonthlyData = async (): Promise<ReportData> => {
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 30);

  const [customersData, leadsData, lifecycleData, churnsData] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, created_at')
      .gte('created_at', periodStart.toISOString())
      .neq('status', 'churned'),
    supabase
      .from('customers')
      .select('id, name, created_at')
      .eq('status', 'lead')
      .gte('created_at', periodStart.toISOString()),
    supabase
      .from('lifecycle_stages')
      .select('customer_id, name, status_changed_at, customers!inner(name)')
      .gte('status_changed_at', periodStart.toISOString()),
    supabase
      .from('customers')
      .select('id, name, churn_date')
      .eq('status', 'churned')
      .gte('churn_date', periodStart.toISOString()),
  ]);

  return {
    newCustomers: customersData.data || [],
    newLeads: leadsData.data || [],
    lifecycleChanges: getLatestLifecycleStages(lifecycleData.data || []),
    churns: churnsData.data || [],
    periodStart,
    periodEnd,
  };
};

const generateTextReport = (data: ReportData, type: 'weekly' | 'monthly'): string => {
  const { newCustomers, newLeads, lifecycleChanges, churns, periodStart, periodEnd } = data;

  let report = `${type.toUpperCase()} UPDATE REPORT\n`;
  report += `Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}\n`;
  report += `Generated: ${new Date().toLocaleString()}\n\n`;
  report += `===========================================\n\n`;

  report += `SUMMARY\n`;
  report += `-------\n`;
  report += `New Customers: ${newCustomers.length}\n`;
  report += `New Leads: ${newLeads.length}\n`;
  report += `Lifecycle Changes: ${lifecycleChanges.length}\n`;
  report += `Churns: ${churns.length}\n\n`;

  if (newCustomers.length > 0) {
    report += `NEW CUSTOMERS\n`;
    report += `-------------\n`;
    newCustomers.forEach(customer => {
      report += `• ${customer.name} (${new Date(customer.created_at).toLocaleDateString()})\n`;
    });
    report += `\n`;
  }

  if (newLeads.length > 0) {
    report += `NEW LEADS\n`;
    report += `---------\n`;
    newLeads.forEach(lead => {
      report += `• ${lead.name} (${new Date(lead.created_at).toLocaleDateString()})\n`;
    });
    report += `\n`;
  }

  if (lifecycleChanges.length > 0) {
    report += `LIFECYCLE CHANGES\n`;
    report += `-----------------\n`;
    lifecycleChanges.forEach(change => {
      report += `• ${change.customers.name} → ${change.name}\n`;
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
