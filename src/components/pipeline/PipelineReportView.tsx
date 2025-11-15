import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types/customers";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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

export const PipelineReportView: React.FC = () => {
  const [weeklyData, setWeeklyData] = useState<PipelineReportData | null>(null);
  const [monthlyData, setMonthlyData] = useState<PipelineReportData | null>(null);
  const [allTimeData, setAllTimeData] = useState<PipelineReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"weekly" | "monthly" | "all_time">("all_time");

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const [weekly, monthly, allTime] = await Promise.all([
        fetchPipelineData(7),
        fetchPipelineData(30),
        fetchPipelineData(null), // null for all-time
      ]);
      setWeeklyData(weekly);
      setMonthlyData(monthly);
      setAllTimeData(allTime);
    } catch (error) {
      console.error("Failed to fetch report data:", error);
      toast.error("Failed to load pipeline reports");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPipelineData = async (daysAgo: number | null): Promise<PipelineReportData> => {
    const startDate = daysAgo ? new Date() : null;
    if (startDate && daysAgo) {
      startDate.setDate(startDate.getDate() - daysAgo);
    }
    const endDate = new Date();

    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("*")
      .neq("status", "churned");

    if (customersError) throw customersError;

    // Fetch timeline events - filter by date only if startDate exists
    const timelineQuery = supabase
      .from("customer_timeline")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (startDate) {
      timelineQuery
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());
    }
    
    const { data: timelineEvents } = await timelineQuery;

    const customerData = customers as Customer[];

    const stageDistribution: Record<string, { count: number; value: number }> = {};
    customerData.forEach((customer) => {
      const stage = customer.stage || "Unknown";
      if (!stageDistribution[stage]) {
        stageDistribution[stage] = { count: 0, value: 0 };
      }
      stageDistribution[stage].count++;
      stageDistribution[stage].value += customer.contract_size || 0;
    });

    // Parse timeline events to extract actual stage changes
    const movedCustomers = timelineEvents
      ?.filter((e) => e.event_type === "stage_change")
      .slice(0, 10)
      .map((e) => {
        const customer = customerData.find((c) => c.id === e.customer_id);
        // Parse event_description to extract previous and new stages
        // Format: "Stage changed from X to Y" or similar
        let fromStage = "Previous";
        let toStage = customer?.stage || "Unknown";
        
        if (e.event_description) {
          const fromMatch = e.event_description.match(/from\s+([^to]+)\s+to/i);
          const toMatch = e.event_description.match(/to\s+(.+)$/i);
          if (fromMatch) fromStage = fromMatch[1].trim();
          if (toMatch) toStage = toMatch[1].trim();
        }
        
        return {
          name: customer?.name || "Unknown",
          fromStage,
          toStage,
          value: customer?.contract_size || 0,
        };
      }) || [];

    const newCustomers = customerData
      .filter((c) => {
        if (!startDate) return true; // For all-time, consider all customers as "tracked"
        const createdDate = new Date(c.created_at);
        return createdDate >= startDate && createdDate <= endDate;
      })
      .slice(0, 10)
      .map((c) => ({
        name: c.name,
        stage: c.stage || "Unknown",
        value: c.contract_size || 0,
      }));

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

    // Calculate value gained/lost based on beneficial vs negative stage movements
    const beneficialStages = ["Signed", "Go Live", "Renewing", "Upsell Opportunity"];
    const negativeStages = ["Lost", "Churned", "At Risk"];
    
    const valueGained = movedCustomers
      .filter(c => beneficialStages.some(s => c.toStage.includes(s)))
      .reduce((sum, c) => sum + c.value, 0);
    
    const valueLost = movedCustomers
      .filter(c => negativeStages.some(s => c.toStage.includes(s)))
      .reduce((sum, c) => sum + c.value, 0);
    const totalPipelineValue = customerData.reduce((sum, c) => sum + (c.contract_size || 0), 0);
    const totalCustomers = customerData.length;
    const avgDealSize = totalCustomers > 0 ? totalPipelineValue / totalCustomers : 0;

    return {
      period: {
        start: startDate ? startDate.toLocaleDateString() : "All Time",
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

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const downloadReport = (data: PipelineReportData, type: "weekly" | "monthly" | "all_time") => {
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

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const reportName = type === "all_time" ? "all-time" : type;
    link.download = `pipeline-${reportName}-report-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${reportName.replace("-", " ")} report downloaded`);
  };

  const renderReportContent = (data: PipelineReportData | null) => {
    if (!data) return null;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Current Pipeline Value</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(data.totalPipelineValue)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Current Active Customers</p>
                <p className="text-2xl font-bold text-blue-600">{data.totalCustomers}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Value Gained This Period</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(data.valueGained)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Value Lost This Period</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(data.valueLost)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Stage Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Stage Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(data.stageDistribution).map(([stage, stats]) => (
              <div key={stage} className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="font-medium">{stage}</p>
                <p className="text-sm text-muted-foreground">{stats.count} customers</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(stats.value)}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Customers Moved */}
        {data.movedCustomers.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Customers Moved This Period ({data.movedCustomers.length})</h3>
            <div className="space-y-2">
              {data.movedCustomers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{customer.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {customer.fromStage} → {customer.toStage}
                    </span>
                  </div>
                  <span className="font-semibold text-primary">{formatCurrency(customer.value)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* New Customers */}
        {data.newCustomers.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">New Customers This Period ({data.newCustomers.length})</h3>
            <div className="space-y-2">
              {data.newCustomers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{customer.name}</span>
                    <span className="text-sm text-muted-foreground">({customer.stage})</span>
                  </div>
                  <span className="font-semibold text-primary">{formatCurrency(customer.value)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Stalled Customers */}
        {data.stalledCustomers.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Currently Stalled Customers ({data.stalledCustomers.length})</h3>
            <p className="text-xs text-muted-foreground mb-3">No activity for 14+ days</p>
            <div className="space-y-2">
              {data.stalledCustomers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{customer.name}</span>
                    <span className="text-sm text-muted-foreground">({customer.stage})</span>
                  </div>
                  <span className="text-sm text-orange-600">{customer.daysSinceUpdate} days inactive</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Card>
    );
  }

  const getTabLabel = () => {
    if (activeTab === "all_time") return "all time";
    return activeTab;
  };

  return (
    <Card className="p-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "weekly" | "monthly" | "all_time")}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Pipeline Reports</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Detailed analytics for {getTabLabel()} pipeline performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const data = activeTab === "weekly" ? weeklyData : activeTab === "monthly" ? monthlyData : allTimeData;
                if (data) downloadReport(data, activeTab);
              }}
              className="hover-scale"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <TabsList>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="all_time">All Time</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="weekly" className="mt-0">
          {renderReportContent(weeklyData)}
        </TabsContent>

        <TabsContent value="monthly" className="mt-0">
          {renderReportContent(monthlyData)}
        </TabsContent>

        <TabsContent value="all_time" className="mt-0">
          {renderReportContent(allTimeData)}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
