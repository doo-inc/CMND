import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Plus, Users, HandHeart, Kanban, BarChart3, TrendingUp, Activity, Clock, Briefcase, LifeBuoy, Calendar, DollarSign, Target, AlertTriangle, Percent, FileText, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CustomerData } from "@/types/customers";
import { syncCustomersToDatabase, checkForDuplicateStages } from "@/utils/customerDataSync";
import { syncCustomerPipelineStages } from "@/utils/pipelineSync";
import { useRealtimeAnalytics } from "@/hooks/useRealtimeAnalytics";
import { toast } from "sonner";
import { usePerformanceMonitoring } from "@/hooks/usePerformanceMonitoring";
import { 
  getLiveCustomers, 
  getCustomerARRData, 
  getDealsPipeline, 
  getTotalPipelineValue,
  getActiveContractsValue,
  getConversionRate,
  getAverageDealSize,
  getMRR,
  calculatePitchToPayTime,
  calculatePayToLiveTime,
  calculateAverageGoLiveTime,
  calculateChurnRate,
  calculateSalesLifecycle,
  formatCurrency,
  getCustomersAtRisk
} from "@/utils/customerUtils";
import { RevenueTrendChart } from "@/components/analytics/RevenueTrendChart";
import { UpdatesPanel } from "@/components/analytics/UpdatesPanel";
import { PendingContracts } from "@/components/analytics/PendingContracts";

const Index = () => {
  // Enable performance monitoring
  usePerformanceMonitoring();
  
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    dealsPipeline: { value: 0, count: 0 },
    totalPipelineValue: 0,
    activeContractsValue: 0,
    conversionRate: 0,
    averageDealSize: 0,
    mrr: 0,
    pitchToPayDays: 0,
    payToLiveDays: 0
  });
  const [arrData, setArrData] = useState({ totalARR: 0, liveCustomers: [], growthRate: 0 });
  const [churnRate, setChurnRate] = useState("0.0%");
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalContracts, setTotalContracts] = useState(0);
  const [customersAtRisk, setCustomersAtRisk] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    try {
      const [
        dealsPipeline,
        totalPipelineValue,
        activeContractsValue,
        conversionRate,
        averageDealSize,
        mrr,
        pitchToPayDays,
        payToLiveDays,
        arrDataResult,
        churnRateResult,
        customersCountResult,
        contractsCountResult,
        customersAtRiskResult
      ] = await Promise.all([
        getDealsPipeline(),
        getTotalPipelineValue(),
        getActiveContractsValue(),
        getConversionRate(),
        getAverageDealSize(),
        getMRR(),
        calculatePitchToPayTime(),
        calculatePayToLiveTime(),
        getCustomerARRData(customers),
        calculateChurnRate(180), // 6 months = ~180 days
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('contracts').select('*', { count: 'exact', head: true }).or('status.eq.active,status.eq.pending'),
        getCustomersAtRisk()
      ]);

      setMetrics({
        dealsPipeline,
        totalPipelineValue,
        activeContractsValue,
        conversionRate,
        averageDealSize,
        mrr,
        pitchToPayDays,
        payToLiveDays
      });
      
      setArrData(arrDataResult);
      setChurnRate(churnRateResult);
      setTotalCustomers(customersCountResult.count || 0);
      setTotalContracts(contractsCountResult.count || 0);
      setCustomersAtRisk(customersAtRiskResult);
      setLastRefreshedAt(new Date());
    } catch (error) {
      console.error("Error refreshing metrics:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Enable real-time analytics updates
  useRealtimeAnalytics(refreshMetrics);
  
  useEffect(() => {
    const initialSync = async () => {
      // Sync customer pipeline stages first
      await syncCustomerPipelineStages();
      // Then sync customers from real data if needed
      await syncCustomersToDatabase();
      // Check for duplicates after loading
      await Promise.all(customers.map(customer => checkForDuplicateStages(customer.id)));
    };
    
    initialSync();
  }, []);
  
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        
        // First sync pipeline stages to ensure data is up to date
        await syncCustomerPipelineStages();
        
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('contract_size', { ascending: false });

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          console.log("Customers data fetched from database:", data);
          const formattedCustomers: CustomerData[] = data.map(customer => ({
            id: customer.id,
            name: customer.name,
            logo: customer.logo || undefined,
            segment: customer.segment || "Unknown Segment",
            country: customer.country || "Unknown Country",
            stage: customer.stage || "Lead", // Use synced stage or default
            status: (customer.status as "not-started" | "in-progress" | "done" | "blocked") || "not-started",
            contractSize: customer.contract_size || 0,
            owner: {
              id: customer.owner_id || "unknown",
              name: "Account Manager",
              role: "Sales"
            }
          }));
          setCustomers(formattedCustomers);
          
          // After loading customers, check for duplicates in lifecycle stages
          await Promise.all(formattedCustomers.map(customer => checkForDuplicateStages(customer.id)));
        } else {
          console.log("No customers found in database, checking again");
          // If no customers in DB, try to sync them again
          await syncCustomersToDatabase();
          // Try one more fetch
          const { data: retryData, error: retryError } = await supabase
            .from('customers')
            .select('*')
            .order('contract_size', { ascending: false });
            
          if (retryError) {
            throw retryError;
          }
          
          if (retryData && retryData.length > 0) {
            const formattedCustomers: CustomerData[] = retryData.map(customer => ({
              id: customer.id,
              name: customer.name,
              logo: customer.logo || undefined,
              segment: customer.segment || "Unknown Segment",
              country: customer.country || "Unknown Country",
              stage: customer.stage || "New",
              status: (customer.status as "not-started" | "in-progress" | "done" | "blocked") || "not-started",
              contractSize: customer.contract_size || 0,
              owner: {
                id: customer.owner_id || "unknown",
                name: "Account Manager",
                role: "Sales"
              }
            }));
            setCustomers(formattedCustomers);
          } else {
            setCustomers([]);
          }
        }
      } catch (error) {
        console.error("Error fetching customers:", error);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  useEffect(() => {
    refreshMetrics();
  }, [customers]);

  // Calculate dashboard metrics  
  const formattedARR = formatCurrency(arrData.totalARR, false);
  const formattedDealsPipeline = formatCurrency(metrics.dealsPipeline.value, false);
  const formattedActiveContracts = formatCurrency(metrics.activeContractsValue, false);
  const formattedAverageDeal = formatCurrency(metrics.averageDealSize, false);
  const formattedMRR = formatCurrency(metrics.mrr, false);
  
  const getTotalCustomersCount = () => {
    return customers.length;
  };
  
  const dashboardStats = [
    {
      title: "Total Customers",
      value: `${totalCustomers}`,
      description: "All customers",
      icon: <Users className="h-6 w-6" />,
      onClick: () => navigate('/analytics/total-customers')
    },
    {
      title: "Total Contracts",
      value: `${totalContracts}`,
      description: "Active & pending contracts",
      icon: <FileText className="h-6 w-6" />,
      onClick: () => navigate('/analytics/total-contracts')
    },
    {
      title: "Total Revenue",
      value: formattedActiveContracts,
      description: "All active contracts",
      icon: <DollarSign className="h-6 w-6" />,
      onClick: () => navigate('/analytics/total-revenue')
    },
    {
      title: "Total ARR",
      value: formattedARR,
      change: { value: 14, type: "increase" as const },
      icon: <BarChart3 className="h-6 w-6" />,
      onClick: () => navigate('/analytics/total-arr')
    },
    {
      title: "Live Customers",
      value: `${arrData.liveCustomers.length}`,
      change: { value: 5, type: "increase" as const },
      icon: <LifeBuoy className="h-6 w-6" />,
      onClick: () => navigate('/analytics/live-customers')
    },
    {
      title: "Pitch to Pay",
      value: metrics.pitchToPayDays > 0 ? `${metrics.pitchToPayDays} days` : "N/A",
      description: "Discovery to Payment",
      icon: <Clock className="h-6 w-6" />,
      onClick: () => navigate('/analytics/pitch-to-pay')
    },
    {
      title: "Deals Pipeline",
      value: formattedDealsPipeline,
      description: `${metrics.dealsPipeline.count} active deals`,
      icon: <TrendingUp className="h-6 w-6" />,
      onClick: () => navigate('/analytics/deals-pipeline')
    },
    {
      title: "Conversion Rate",
      value: `${metrics.conversionRate.toFixed(1)}%`,
      description: "Lead to customer",
      icon: <Target className="h-6 w-6" />,
      onClick: () => navigate('/analytics/conversion-rate')
    },
    {
      title: "Average Deal Size",
      value: formattedAverageDeal,
      description: "Pipeline average",
      icon: <BarChart3 className="h-6 w-6" />,
      onClick: () => navigate('/analytics/average-deal-size')
    },
    {
      title: "Monthly Recurring Revenue",
      value: formattedMRR,
      description: "Current MRR",
      change: { value: 8, type: "increase" as const },
      icon: <TrendingUp className="h-6 w-6" />,
      onClick: () => navigate('/analytics/mrr')
    },
    {
      title: "Pay to Live",
      value: metrics.payToLiveDays > 0 ? `${metrics.payToLiveDays} days` : "N/A",
      description: "Payment to Go Live",
      icon: <Activity className="h-6 w-6" />,
      onClick: () => navigate('/analytics/pay-to-live')
    },
    {
      title: "Churn Rate",
      value: churnRate,
      description: "Last 6 months",
      icon: <Percent className="h-6 w-6" />,
      onClick: () => navigate('/analytics/churn-rate')
    }
  ];
  
  
  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row gap-8 dashboard-background">
        {/* Main Content */}
        <div className="flex-1 space-y-12">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between mb-12 pb-6 border-b border-border/50">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
                Dashboard
              </h1>
              <p className="text-base text-muted-foreground font-light">
                Real-time business analytics and insights
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-3">
                <Button 
                  onClick={refreshMetrics} 
                  disabled={isRefreshing}
                  variant="outline"
                  size="lg"
                  className="min-w-[180px] h-11 font-medium"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh Analytics
                </Button>
                <Button 
                  onClick={() => navigate("/customers/new")}
                  size="lg"
                  className="min-w-[180px] h-11 font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
              </div>
              {lastRefreshedAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Last refreshed at {lastRefreshedAt.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* KPI Cards Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-primary to-purple-500 rounded-full" />
              <h2 className="text-2xl font-bold tracking-tight">
                Key Performance Indicators
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
              {dashboardStats.map((stat, index) => (
                <div 
                  key={index}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <StatCard {...stat} />
                </div>
              ))}
            </div>
          </section>

          {/* Charts Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-primary to-purple-500 rounded-full" />
              <h2 className="text-2xl font-bold tracking-tight">
                Analytics Overview
              </h2>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="xl:col-span-1">
                <RevenueTrendChart isRefreshing={isRefreshing} />
              </div>
              <div className="xl:col-span-1">
                <PendingContracts isRefreshing={isRefreshing} />
              </div>
            </div>
          </section>
        </div>

        {/* Right Sidebar Panel */}
        <div className="w-full lg:w-80 xl:w-96 lg:sticky lg:top-6 lg:self-start">
          <UpdatesPanel />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
