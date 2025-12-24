import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Loader2, 
  TrendingUp, 
  Users, 
  FileText, 
  AlertCircle, 
  HandHeart,
  ChevronDown,
  ChevronUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Maximize2,
  X,
  CheckCircle2,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateWeeklyReport, generateMonthlyReport } from "@/utils/reportGeneration";
import { toast } from "sonner";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ActivityItem {
  id: string;
  type: 'lifecycle' | 'customer' | 'contract' | 'churn' | 'partnership';
  customerName: string;
  details: string;
  date: string;
  fullDate: Date;
}

interface DetailedData {
  lifecycleChanges: ActivityItem[];
  newCustomers: ActivityItem[];
  newContracts: ActivityItem[];
  churns: ActivityItem[];
  newPartnerships: ActivityItem[];
}

interface UpdatesPanelProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const UpdatesPanel = ({ countries, dateFrom, dateTo }: UpdatesPanelProps) => {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [weeklyData, setWeeklyData] = useState<DetailedData | null>(null);
  const [monthlyData, setMonthlyData] = useState<DetailedData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showFullView, setShowFullView] = useState(false);

  const fetchDetailedData = async (days: number): Promise<DetailedData> => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const startDate = dateFrom || daysAgo;
    const endDate = dateTo || new Date();

    console.log(`[UpdatesPanel] Fetching data for last ${days} days:`, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // Fetch lifecycle changes with customer names - use left join to not fail if no match
    const { data: lifecycleData, error: lifecycleError } = await supabase
      .from('lifecycle_stages')
      .select('customer_id, name, status_changed_at, customers(name, country)')
      .gte('status_changed_at', startDate.toISOString())
      .lte('status_changed_at', endDate.toISOString())
      .order('status_changed_at', { ascending: false });

    if (lifecycleError) console.error('[UpdatesPanel] Lifecycle query error:', lifecycleError);
    console.log(`[UpdatesPanel] Lifecycle changes found: ${lifecycleData?.length || 0}`);

    const customerStagesMap = new Map();
    lifecycleData?.forEach((stage: any) => {
      // Apply country filter manually if needed
      if (countries && countries.length > 0 && stage.customers?.country) {
        if (!countries.includes(stage.customers.country)) return;
      }
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
      date: format(new Date(stage.status_changed_at), 'MMM dd'),
      fullDate: new Date(stage.status_changed_at)
    }));

    // Fetch ALL customers and filter by created_at in JS (to handle null/missing dates)
    const { data: allCustomersData, error: customersError } = await supabase
      .from('customers')
      .select('*');

    if (customersError) {
      console.error('[UpdatesPanel] Customers query error:', customersError);
    }
    
    console.log(`[UpdatesPanel] Raw customers data:`, allCustomersData?.slice(0, 3));
    console.log(`[UpdatesPanel] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Filter customers by date range - use start of day for comparison
    const startOfPeriod = new Date(startDate);
    startOfPeriod.setHours(0, 0, 0, 0);
    
    const endOfPeriod = new Date(endDate);
    endOfPeriod.setHours(23, 59, 59, 999);
    
    const customersData = allCustomersData?.filter((customer: any) => {
      if (!customer.created_at) return false;
      const createdAt = new Date(customer.created_at);
      const isInRange = createdAt >= startOfPeriod && createdAt <= endOfPeriod;
      return isInRange;
    }) || [];

    // Apply country filter
    const filteredCustomers = countries && countries.length > 0 
      ? customersData.filter((c: any) => countries.includes(c.country))
      : customersData;

    console.log(`[UpdatesPanel] New customers found: ${filteredCustomers.length} (total: ${allCustomersData?.length || 0})`);

    const newCustomers: ActivityItem[] = filteredCustomers.map((customer: any) => ({
      id: customer.id,
      type: 'customer' as const,
      customerName: customer.name,
      details: customer.stage || 'New',
      date: format(new Date(customer.created_at), 'MMM dd'),
      fullDate: new Date(customer.created_at)
    }));

    // Fetch ALL contracts and filter by date
    const { data: allContractsData, error: contractsError } = await supabase
      .from('contracts')
      .select('id, name, created_at, value, customer_id, customers(name, country)')
      .order('created_at', { ascending: false });

    if (contractsError) console.error('[UpdatesPanel] Contracts query error:', contractsError);

    // Filter contracts by date range
    const contractsData = allContractsData?.filter((contract: any) => {
      if (!contract.created_at) return false;
      const createdAt = new Date(contract.created_at);
      return createdAt >= startDate && createdAt <= endDate;
    }) || [];

    // Apply country filter
    const filteredContracts = countries && countries.length > 0 
      ? contractsData.filter((c: any) => c.customers && countries.includes(c.customers.country))
      : contractsData;

    console.log(`[UpdatesPanel] New contracts found: ${filteredContracts.length} (total: ${allContractsData?.length || 0})`);

    const newContracts: ActivityItem[] = filteredContracts.map((contract: any) => ({
      id: contract.id,
      type: 'contract' as const,
      customerName: contract.customers?.name || 'Unknown',
      details: contract.name || `Contract #${contract.id.slice(0, 8)}`,
      date: format(new Date(contract.created_at), 'MMM dd'),
      fullDate: new Date(contract.created_at)
    }));

    // Fetch churns - customers with churn_date in range
    const { data: churnsData, error: churnsError } = await supabase
      .from('customers')
      .select('id, name, churn_date, country, status')
      .not('churn_date', 'is', null)
      .gte('churn_date', startDate.toISOString())
      .lte('churn_date', endDate.toISOString())
      .order('churn_date', { ascending: false });

    if (churnsError) console.error('[UpdatesPanel] Churns query error:', churnsError);

    const filteredChurns = countries && countries.length > 0 
      ? churnsData?.filter((c: any) => countries.includes(c.country)) || []
      : churnsData || [];

    console.log(`[UpdatesPanel] Churns found: ${filteredChurns.length}`);

    const churns: ActivityItem[] = filteredChurns.map((customer: any) => ({
      id: customer.id,
      type: 'churn' as const,
      customerName: customer.name,
      details: 'Churned',
      date: format(new Date(customer.churn_date), 'MMM dd'),
      fullDate: new Date(customer.churn_date)
    }));

    // Fetch ALL partnerships and filter by date
    const { data: allPartnershipsData, error: partnershipsError } = await supabase
      .from('partnerships')
      .select('id, name, created_at, status, partnership_type, country')
      .order('created_at', { ascending: false });

    if (partnershipsError) console.error('[UpdatesPanel] Partnerships query error:', partnershipsError);

    // Filter partnerships by date range
    const partnershipsData = allPartnershipsData?.filter((partnership: any) => {
      if (!partnership.created_at) return false;
      const createdAt = new Date(partnership.created_at);
      return createdAt >= startDate && createdAt <= endDate;
    }) || [];

    // Apply country filter
    const filteredPartnerships = countries && countries.length > 0 
      ? partnershipsData.filter((p: any) => countries.includes(p.country))
      : partnershipsData;

    console.log(`[UpdatesPanel] New partnerships found: ${filteredPartnerships.length} (total: ${allPartnershipsData?.length || 0})`);

    const newPartnerships: ActivityItem[] = filteredPartnerships.map((partnership: any) => ({
      id: partnership.id,
      type: 'partnership' as const,
      customerName: partnership.name,
      details: partnership.partnership_type?.replace('_', ' ') || 'Partner',
      date: format(new Date(partnership.created_at), 'MMM dd'),
      fullDate: new Date(partnership.created_at)
    }));

    console.log('[UpdatesPanel] Summary:', {
      lifecycleChanges: lifecycleChanges.length,
      newCustomers: newCustomers.length,
      newContracts: newContracts.length,
      churns: churns.length,
      newPartnerships: newPartnerships.length
    });

    return { lifecycleChanges, newCustomers, newContracts, churns, newPartnerships };
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        console.log('[UpdatesPanel] Starting data fetch...');
        const weekly = await fetchDetailedData(7);
        console.log('[UpdatesPanel] Weekly data:', weekly);
        setWeeklyData(weekly);
        
        const monthly = await fetchDetailedData(30);
        console.log('[UpdatesPanel] Monthly data:', monthly);
        setMonthlyData(monthly);
      } catch (error) {
        console.error("[UpdatesPanel] Error fetching activity data:", error);
        // Set empty data so UI still renders
        const emptyData: DetailedData = {
          lifecycleChanges: [],
          newCustomers: [],
          newContracts: [],
          churns: [],
          newPartnerships: []
        };
        setWeeklyData(emptyData);
        setMonthlyData(emptyData);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [countries, dateFrom, dateTo]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      if (period === 'weekly') {
        await generateWeeklyReport();
        toast.success("Weekly report downloaded successfully!");
      } else {
        await generateMonthlyReport();
        toast.success("Monthly report downloaded successfully!");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const currentData = period === 'weekly' ? weeklyData : monthlyData;

  // Calculate summary stats
  const getStats = (data: DetailedData | null) => {
    if (!data) return { lifecycle: 0, customers: 0, contracts: 0, partnerships: 0, churns: 0, total: 0 };
    return {
      lifecycle: data.lifecycleChanges.length,
      customers: data.newCustomers.length,
      contracts: data.newContracts.length,
      partnerships: data.newPartnerships.length,
      churns: data.churns.length,
      total: data.lifecycleChanges.length + data.newCustomers.length + data.newContracts.length + data.newPartnerships.length
    };
  };

  const stats = getStats(currentData);
  const prevStats = getStats(period === 'weekly' ? monthlyData : weeklyData);

  const StatCard = ({ 
    label, 
    value, 
    icon: Icon, 
    color,
    trend
  }: { 
    label: string; 
    value: number; 
    icon: any; 
    color: string;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <div className={cn(
      "relative overflow-hidden rounded-xl p-3 transition-all hover:scale-105",
      "bg-gradient-to-br shadow-lg",
      color
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-white/80 font-medium">{label}</p>
        </div>
        <div className="rounded-full bg-white/20 p-2">
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      {trend && trend !== 'neutral' && (
        <div className="absolute top-2 right-2">
          {trend === 'up' ? (
            <ArrowUpRight className="h-3 w-3 text-white/70" />
          ) : (
            <ArrowDownRight className="h-3 w-3 text-white/70" />
          )}
        </div>
      )}
    </div>
  );

  const ActivitySection = ({ 
    id,
    title, 
    items, 
    icon: Icon, 
    color,
    isExpanded,
    onToggle,
    showAll = false
  }: { 
    id: string;
    title: string; 
    items: ActivityItem[]; 
    icon: any;
    color: string;
    isExpanded: boolean;
    onToggle: () => void;
    showAll?: boolean;
  }) => {
    const displayItems = showAll ? items : items.slice(0, 8);
    
    return (
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger className="w-full">
          <div className={cn(
            "flex items-center justify-between p-3 rounded-lg transition-all hover:bg-accent/50",
            isExpanded && "bg-accent/30"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn("rounded-lg p-2", color)}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-xs text-muted-foreground">{items.length} activities</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-bold">
                {items.length}
              </Badge>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pl-12 pr-3 pb-3 space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2">No activity in this period</p>
            ) : (
              <>
                {displayItems.map((item, index) => (
                  <div 
                    key={`${item.id}-${index}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-accent/20 hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.customerName}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.details}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{item.date}</span>
                    </div>
                  </div>
                ))}
                {!showAll && items.length > 8 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFullView(true);
                    }}
                    className="text-xs text-primary hover:underline py-2 font-medium"
                  >
                    View all {items.length} items →
                  </button>
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const FullViewContent = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard 
          label="Stage Changes" 
          value={stats.lifecycle} 
          icon={TrendingUp} 
          color="from-violet-500 to-purple-600"
        />
        <StatCard 
          label="New Customers" 
          value={stats.customers} 
          icon={Users} 
          color="from-emerald-500 to-green-600"
        />
        <StatCard 
          label="New Contracts" 
          value={stats.contracts} 
          icon={FileText} 
          color="from-blue-500 to-cyan-600"
        />
        <StatCard 
          label="Partnerships" 
          value={stats.partnerships} 
          icon={HandHeart} 
          color="from-amber-500 to-orange-600"
        />
        <StatCard 
          label="Churns" 
          value={stats.churns} 
          icon={AlertCircle} 
          color="from-red-500 to-rose-600"
        />
      </div>

      {/* All Sections Expanded */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-4 pr-4">
          <ActivitySection 
            id="lifecycle"
            title="Lifecycle Stage Changes" 
            items={currentData?.lifecycleChanges || []} 
            icon={TrendingUp}
            color="bg-violet-500"
            isExpanded={true}
            onToggle={() => {}}
            showAll={true}
          />
          <ActivitySection 
            id="customers"
            title="New Customers Added" 
            items={currentData?.newCustomers || []} 
            icon={Users}
            color="bg-emerald-500"
            isExpanded={true}
            onToggle={() => {}}
            showAll={true}
          />
          <ActivitySection 
            id="contracts"
            title="New Contracts Signed" 
            items={currentData?.newContracts || []} 
            icon={FileText}
            color="bg-blue-500"
            isExpanded={true}
            onToggle={() => {}}
            showAll={true}
          />
          <ActivitySection 
            id="partnerships"
            title="New Partnerships" 
            items={currentData?.newPartnerships || []} 
            icon={HandHeart}
            color="bg-amber-500"
            isExpanded={true}
            onToggle={() => {}}
            showAll={true}
          />
          <ActivitySection 
            id="churns"
            title="Customer Churns" 
            items={currentData?.churns || []} 
            icon={AlertCircle}
            color="bg-red-500"
            isExpanded={true}
            onToggle={() => {}}
            showAll={true}
          />
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-card/90 min-h-[500px] flex flex-col">
        <CardHeader className="border-b border-border/50 pb-4 flex-shrink-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                <Calendar className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Activity Updates</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {period === 'weekly' ? 'Last 7 days' : 'Last 30 days'} • {stats.total} total activities
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowFullView(true)}
              className="hover:bg-primary/10"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>

        <CardContent className="p-4 flex-1 flex flex-col gap-4">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as 'weekly' | 'monthly')} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0 bg-muted/50">
              <TabsTrigger value="weekly" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Weekly
              </TabsTrigger>
              <TabsTrigger value="monthly" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Monthly
              </TabsTrigger>
          </TabsList>

            <TabsContent value={period} className="mt-4 flex-1">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading activity data...</p>
              </div>
            ) : currentData ? (
                <div className="flex flex-col h-full gap-4">
                  {/* Mini Stats Row */}
                  <div className="grid grid-cols-5 gap-2">
                    <div className="text-center p-2 rounded-lg bg-violet-500/10">
                      <p className="text-lg font-bold text-violet-600">{stats.lifecycle}</p>
                      <p className="text-[10px] text-muted-foreground">Stages</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-emerald-500/10">
                      <p className="text-lg font-bold text-emerald-600">{stats.customers}</p>
                      <p className="text-[10px] text-muted-foreground">Customers</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-blue-500/10">
                      <p className="text-lg font-bold text-blue-600">{stats.contracts}</p>
                      <p className="text-[10px] text-muted-foreground">Contracts</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-amber-500/10">
                      <p className="text-lg font-bold text-amber-600">{stats.partnerships}</p>
                      <p className="text-[10px] text-muted-foreground">Partners</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-red-500/10">
                      <p className="text-lg font-bold text-red-600">{stats.churns}</p>
                      <p className="text-[10px] text-muted-foreground">Churns</p>
                    </div>
                  </div>

                  {/* Activity Sections */}
                  <ScrollArea className="flex-1">
                    <div className="space-y-2 pr-2">
                  <ActivitySection
                        id="lifecycle"
                        title="Stage Changes" 
                    items={currentData.lifecycleChanges}
                        icon={TrendingUp}
                        color="bg-violet-500"
                        isExpanded={expandedSections.has('lifecycle')}
                        onToggle={() => toggleSection('lifecycle')}
                  />
                  <ActivitySection
                        id="customers"
                        title="New Customers" 
                    items={currentData.newCustomers}
                        icon={Users}
                        color="bg-emerald-500"
                        isExpanded={expandedSections.has('customers')}
                        onToggle={() => toggleSection('customers')}
                  />
                  <ActivitySection
                        id="contracts"
                    title="New Contracts"
                    items={currentData.newContracts}
                        icon={FileText}
                        color="bg-blue-500"
                        isExpanded={expandedSections.has('contracts')}
                        onToggle={() => toggleSection('contracts')}
                  />
                  <ActivitySection
                        id="partnerships"
                        title="Partnerships" 
                    items={currentData.newPartnerships}
                        icon={HandHeart}
                        color="bg-amber-500"
                        isExpanded={expandedSections.has('partnerships')}
                        onToggle={() => toggleSection('partnerships')}
                  />
                  <ActivitySection
                        id="churns"
                    title="Churns"
                    items={currentData.churns}
                        icon={AlertCircle}
                        color="bg-red-500"
                        isExpanded={expandedSections.has('churns')}
                        onToggle={() => toggleSection('churns')}
                  />
                </div>
              </ScrollArea>
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No data available
              </div>
            )}
          </TabsContent>
        </Tabs>

          {/* Download Button */}
        <Button 
          onClick={handleGenerateReport} 
            disabled={generating || loading}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
          size="sm"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Report...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
                Download {period === 'weekly' ? 'Weekly' : 'Monthly'} Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>

      {/* Full View Dialog */}
      <Dialog open={showFullView} onOpenChange={setShowFullView}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    {period === 'weekly' ? 'Weekly' : 'Monthly'} Activity Report
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {period === 'weekly' 
                      ? `${format(subDays(new Date(), 7), 'MMM dd')} - ${format(new Date(), 'MMM dd, yyyy')}`
                      : `${format(subDays(new Date(), 30), 'MMM dd')} - ${format(new Date(), 'MMM dd, yyyy')}`
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleGenerateReport} 
                  disabled={generating}
                  size="sm"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1.5" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <FullViewContent />
        </DialogContent>
      </Dialog>
    </>
  );
};
