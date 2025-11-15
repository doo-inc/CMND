import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Loader2, TrendingUp, Users, Target, AlertCircle, HandHeart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateWeeklyReport, generateMonthlyReport } from "@/utils/reportGeneration";
import { toast } from "sonner";
import { format } from "date-fns";

interface ActivityItem {
  id: string;
  type: 'lifecycle' | 'customer' | 'lead' | 'churn' | 'partnership';
  customerName: string;
  details: string;
  date: string;
}

interface DetailedData {
  lifecycleChanges: ActivityItem[];
  newCustomers: ActivityItem[];
  newLeads: ActivityItem[];
  churns: ActivityItem[];
  newPartnerships: ActivityItem[];
}

export const UpdatesPanel = () => {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [weeklyData, setWeeklyData] = useState<DetailedData | null>(null);
  const [monthlyData, setMonthlyData] = useState<DetailedData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDetailedData = async (days: number): Promise<DetailedData> => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    // Fetch lifecycle changes with customer names
    const { data: lifecycleData } = await supabase
      .from('lifecycle_stages')
      .select('customer_id, name, status_changed_at, customers(name)')
      .gte('status_changed_at', daysAgo.toISOString())
      .order('status_changed_at', { ascending: false });

    // Get unique customers with latest stage only
    const customerStagesMap = new Map();
    lifecycleData?.forEach((stage: any) => {
      const existing = customerStagesMap.get(stage.customer_id);
      if (!existing || new Date(stage.status_changed_at) > new Date(existing.status_changed_at)) {
        customerStagesMap.set(stage.customer_id, stage);
      }
    });

    const lifecycleChanges: ActivityItem[] = Array.from(customerStagesMap.values()).map((stage: any) => ({
      id: stage.customer_id,
      type: 'lifecycle' as const,
      customerName: stage.customers?.name || 'Unknown',
      details: stage.name,
      date: format(new Date(stage.status_changed_at), 'MMM dd')
    }));

    // Fetch new customers (contracts created)
    const { data: contractsData } = await supabase
      .from('contracts')
      .select('id, name, created_at, customers(name)')
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    const newCustomers: ActivityItem[] = contractsData?.map((contract: any) => ({
      id: contract.id,
      type: 'customer' as const,
      customerName: contract.customers?.name || 'Unknown',
      details: contract.name,
      date: format(new Date(contract.created_at), 'MMM dd')
    })) || [];

    // Fetch new leads (customers added)
    const { data: leadsData } = await supabase
      .from('customers')
      .select('id, name, created_at')
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    const newLeads: ActivityItem[] = leadsData?.map((lead: any) => ({
      id: lead.id,
      type: 'lead' as const,
      customerName: lead.name,
      details: 'New lead',
      date: format(new Date(lead.created_at), 'MMM dd')
    })) || [];

    // Fetch churns
    const { data: churnsData } = await supabase
      .from('customers')
      .select('id, name, churn_date')
      .eq('status', 'churned')
      .gte('churn_date', daysAgo.toISOString())
      .order('churn_date', { ascending: false })
      .limit(10);

    const churns: ActivityItem[] = churnsData?.map((customer: any) => ({
      id: customer.id,
      type: 'churn' as const,
      customerName: customer.name,
      details: 'Churned',
      date: format(new Date(customer.churn_date), 'MMM dd')
    })) || [];

    // Fetch new partnerships
    const { data: partnershipsData } = await supabase
      .from('partnerships')
      .select('id, name, created_at, status, partnership_type')
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    const newPartnerships: ActivityItem[] = partnershipsData?.map((partnership: any) => ({
      id: partnership.id,
      type: 'partnership' as const,
      customerName: partnership.name,
      details: partnership.partnership_type.replace('_', ' '),
      date: format(new Date(partnership.created_at), 'MMM dd')
    })) || [];

    return { lifecycleChanges, newCustomers, newLeads, churns, newPartnerships };
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [weekly, monthly] = await Promise.all([
          fetchDetailedData(7),
          fetchDetailedData(30)
        ]);
        setWeeklyData(weekly);
        setMonthlyData(monthly);
      } catch (error) {
        console.error("Error fetching activity data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      if (period === 'weekly') {
        await generateWeeklyReport();
        toast.success("Weekly report downloaded");
      } else {
        await generateMonthlyReport();
        toast.success("Monthly report downloaded");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const currentData = period === 'weekly' ? weeklyData : monthlyData;

  const ActivitySection = ({ title, items, icon }: { title: string; items: ActivityItem[]; icon: React.ReactNode }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{title} ({items.length})</span>
      </div>
      {items.length > 0 ? (
        <div className="space-y-1 pl-6">
          {items.slice(0, 5).map((item) => (
            <div key={item.id} className="text-xs text-muted-foreground flex justify-between">
              <span className="truncate flex-1">{item.customerName} → {item.details}</span>
              <span className="text-[10px] ml-2 whitespace-nowrap">{item.date}</span>
            </div>
          ))}
          {items.length > 5 && (
            <div className="text-xs text-muted-foreground italic">
              +{items.length - 5} more
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground pl-6">No activity</div>
      )}
    </div>
  );

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 h-[500px] flex flex-col overflow-hidden">
      <CardHeader className="border-b border-border/50 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold">Activity Updates</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-6 flex-1 overflow-hidden flex flex-col">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as 'weekly' | 'monthly')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value={period} className="mt-4 flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : currentData ? (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  <div className="text-xs text-muted-foreground">
                    Last {period === 'weekly' ? '7' : '30'} days
                  </div>

                  <ActivitySection
                    title="Lifecycle Changes"
                    items={currentData.lifecycleChanges}
                    icon={<TrendingUp className="h-4 w-4" />}
                  />

                  <ActivitySection
                    title="New Customers"
                    items={currentData.newCustomers}
                    icon={<Users className="h-4 w-4" />}
                  />

                  <ActivitySection
                    title="New Leads"
                    items={currentData.newLeads}
                    icon={<Target className="h-4 w-4" />}
                  />

                  <ActivitySection
                    title="Churns"
                    items={currentData.churns}
                    icon={<AlertCircle className="h-4 w-4" />}
                  />

                  <ActivitySection
                    title="New Partnerships"
                    items={currentData.newPartnerships}
                    icon={<HandHeart className="h-4 w-4" />}
                  />
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No data available
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Button 
          onClick={handleGenerateReport} 
          disabled={generating}
          className="w-full"
          size="sm"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
