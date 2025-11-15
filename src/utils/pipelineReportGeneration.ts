import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types/customers";

interface PipelineReportData {
  period: { start: string; end: string };
  stageDistribution: Record<string, { count: number; value: number }>;
  movedCustomers: Array<{ name: string; fromStage: string; toStage: string; value: number }>;
  newCustomers: Array<{ name: string; stage: string; value: number }>;
  stalledCustomers: Array<{ name: string; stage: string; daysSinceUpdate: number }>;
  valueGained: number;
  valueLost: number;
  totalPipelineValue: number;
  totalCustomers: number;
  avgDealSize: number;
}

const fetchPipelineData = async (daysAgo: number): Promise<PipelineReportData> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);
  const endDate = new Date();

  // Fetch customers
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("*")
    .neq("status", "churned");

  if (customersError) throw customersError;

  // Fetch lifecycle stages
  const { data: lifecycleStages } = await supabase
    .from("lifecycle_stages")
    .select("*");

  // Fetch timeline events for the period
  const { data: timelineEvents } = await supabase
    .from("customer_timeline")
    .select("*")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())
    .order("created_at", { ascending: false });

  const customerData = customers as Customer[];

  // Calculate stage distribution
  const stageDistribution: Record<string, { count: number; value: number }> = {};
  customerData.forEach((customer) => {
    const stage = customer.stage || "Unknown";
    if (!stageDistribution[stage]) {
      stageDistribution[stage] = { count: 0, value: 0 };
    }
    stageDistribution[stage].count++;
    stageDistribution[stage].value += customer.contract_size || 0;
  });

  // Identify moved customers (from timeline events)
  const movedCustomers = timelineEvents
    ?.filter((e) => e.event_type === "stage_change")
    .slice(0, 10)
    .map((e) => {
      const customer = customerData.find((c) => c.id === e.customer_id);
      return {
        name: customer?.name || "Unknown",
        fromStage: "Previous",
        toStage: customer?.stage || "Unknown",
        value: customer?.contract_size || 0,
      };
    }) || [];

  // Identify new customers
  const newCustomers = customerData
    .filter((c) => {
      const createdDate = new Date(c.created_at);
      return createdDate >= startDate && createdDate <= endDate;
    })
    .slice(0, 10)
    .map((c) => ({
      name: c.name,
      stage: c.stage || "Unknown",
      value: c.contract_size || 0,
    }));

  // Identify stalled customers
  const stalledCustomers = customerData
    .filter((c) => {
      const updatedDate = new Date(c.updated_at);
      const daysSince = Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= 14 && c.stage !== "Live" && c.stage !== "Lost";
    })
    .slice(0, 10)
    .map((c) => {
      const updatedDate = new Date(c.updated_at);
      const daysSince = Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        name: c.name,
        stage: c.stage || "Unknown",
        daysSinceUpdate: daysSince,
      };
    });

  // Calculate value metrics
  const valueGained = movedCustomers.reduce((sum, c) => sum + c.value, 0);
  const lostCustomers = customerData.filter((c) => c.stage === "Lost" || c.status === "churned");
  const valueLost = lostCustomers.reduce((sum, c) => sum + (c.contract_size || 0), 0);
  const totalPipelineValue = customerData.reduce((sum, c) => sum + (c.contract_size || 0), 0);
  const totalCustomers = customerData.length;
  const avgDealSize = totalCustomers > 0 ? totalPipelineValue / totalCustomers : 0;

  return {
    period: {
      start: startDate.toLocaleDateString(),
      end: endDate.toLocaleDateString(),
    },
    stageDistribution,
    movedCustomers,
    newCustomers,
    stalledCustomers,
    valueGained,
    valueLost,
    totalPipelineValue,
    totalCustomers,
    avgDealSize,
  };
};

const generatePipelineTextReport = (data: PipelineReportData, type: "weekly" | "monthly"): string => {
  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  let report = `=== ${type.toUpperCase()} PIPELINE REPORT ===\n`;
  report += `Period: ${data.period.start} - ${data.period.end}\n`;
  report += `Generated: ${new Date().toLocaleString()}\n\n`;

  report += `=== PIPELINE OVERVIEW ===\n`;
  report += `Total Pipeline Value: ${formatCurrency(data.totalPipelineValue)}\n`;
  report += `Total Customers: ${data.totalCustomers}\n`;
  report += `Average Deal Size: ${formatCurrency(data.avgDealSize)}\n`;
  report += `Value Gained: ${formatCurrency(data.valueGained)}\n`;
  report += `Value Lost: ${formatCurrency(data.valueLost)}\n\n`;

  report += `=== STAGE DISTRIBUTION ===\n`;
  Object.entries(data.stageDistribution).forEach(([stage, stats]) => {
    report += `${stage}: ${stats.count} customers (${formatCurrency(stats.value)})\n`;
  });
  report += `\n`;

  if (data.movedCustomers.length > 0) {
    report += `=== CUSTOMERS MOVED (${data.movedCustomers.length}) ===\n`;
    data.movedCustomers.forEach((c) => {
      report += `- ${c.name}: ${c.fromStage} → ${c.toStage} (${formatCurrency(c.value)})\n`;
    });
    report += `\n`;
  }

  if (data.newCustomers.length > 0) {
    report += `=== NEW CUSTOMERS (${data.newCustomers.length}) ===\n`;
    data.newCustomers.forEach((c) => {
      report += `- ${c.name} (${c.stage}): ${formatCurrency(c.value)}\n`;
    });
    report += `\n`;
  }

  if (data.stalledCustomers.length > 0) {
    report += `=== STALLED CUSTOMERS (${data.stalledCustomers.length}) ===\n`;
    data.stalledCustomers.forEach((c) => {
      report += `- ${c.name} (${c.stage}): ${c.daysSinceUpdate} days since last update\n`;
    });
    report += `\n`;
  }

  report += `=== END OF REPORT ===\n`;
  return report;
};

const downloadPipelineReport = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateWeeklyPipelineReport = async () => {
  const data = await fetchPipelineData(7);
  const report = generatePipelineTextReport(data, "weekly");
  const filename = `pipeline-weekly-report-${new Date().toISOString().split("T")[0]}.txt`;
  downloadPipelineReport(report, filename);
};

export const generateMonthlyPipelineReport = async () => {
  const data = await fetchPipelineData(30);
  const report = generatePipelineTextReport(data, "monthly");
  const filename = `pipeline-monthly-report-${new Date().toISOString().split("T")[0]}.txt`;
  downloadPipelineReport(report, filename);
};
