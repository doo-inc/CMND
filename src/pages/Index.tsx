import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ContractCard } from "@/components/contracts/ContractCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const Index = () => {
  // Enable performance monitoring
  usePerformanceMonitoring();
  
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [pendingContracts, setPendingContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractsLoading, setContractsLoading] = useState(true);
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

  // Fetch pending contracts
  useEffect(() => {
    const fetchPendingContracts = async () => {
      try {
        setContractsLoading(true);
        const { data, error } = await supabase
          .from('contracts')
          .select(`
            id,
            name,
            value,
            start_date,
            end_date,
            status,
            customers!inner(id, name)
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(4);

        if (error) {
          console.error('Error fetching pending contracts:', error);
          return;
        }

        const formattedContracts = data?.map(contract => ({
          id: contract.id,
          name: contract.name,
          value: contract.value,
          start_date: contract.start_date,
          end_date: contract.end_date,
          status: contract.status,
          customer_name: contract.customers.name,
          customer_id: contract.customers.id
        })) || [];

        setPendingContracts(formattedContracts);
      } catch (error) {
        console.error('Error fetching pending contracts:', error);
      } finally {
        setContractsLoading(false);
      }
    };

    fetchPendingContracts();
  }, []);

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
      icon: <Users className="h-6 w-6" />
    },
    {
      title: "Total Contracts",
      value: `${totalContracts}`,
      description: "Active & pending contracts",
      icon: <FileText className="h-6 w-6" />
    },
    {
      title: "Total Revenue",
      value: formattedActiveContracts,
      description: "All active contracts",
      icon: <DollarSign className="h-6 w-6" />
    },
    {
      title: "Total ARR",
      value: formattedARR,
      change: { value: 14, type: "increase" as const },
      icon: <BarChart3 className="h-6 w-6" />
    },
    {
      title: "Live Customers",
      value: `${arrData.liveCustomers.length}`,
      change: { value: 5, type: "increase" as const },
      icon: <LifeBuoy className="h-6 w-6" />
    },
    {
      title: "Pitch to Pay",
      value: metrics.pitchToPayDays > 0 ? `${metrics.pitchToPayDays} days` : "N/A",
      description: "Discovery to Payment",
      icon: <Clock className="h-6 w-6" />
    },
    {
      title: "Deals Pipeline",
      value: formattedDealsPipeline,
      description: `${metrics.dealsPipeline.count} active deals`,
      icon: <TrendingUp className="h-6 w-6" />
    },
    {
      title: "Conversion Rate",
      value: `${metrics.conversionRate.toFixed(1)}%`,
      description: "Lead to customer",
      icon: <Target className="h-6 w-6" />
    },
    {
      title: "Average Deal Size",
      value: formattedAverageDeal,
      description: "Pipeline average",
      icon: <BarChart3 className="h-6 w-6" />
    },
    {
      title: "Monthly Recurring Revenue",
      value: formattedMRR,
      description: "Current MRR",
      change: { value: 8, type: "increase" as const },
      icon: <TrendingUp className="h-6 w-6" />
    },
    {
      title: "Pay to Live",
      value: metrics.payToLiveDays > 0 ? `${metrics.payToLiveDays} days` : "N/A",
      description: "Payment to Go Live",
      icon: <Activity className="h-6 w-6" />
    },
    {
      title: "Churn Rate",
      value: churnRate,
      description: "Last 6 months",
      icon: <Percent className="h-6 w-6" />,
      onClick: () => navigate('/analytics/churn-rate')
    },
    {
      title: "Customers At Risk",
      value: `${customersAtRisk}`,
      description: "Renewals in next 30 days",
      icon: <AlertTriangle className="h-6 w-6" />,
      onClick: () => navigate('/analytics/customers-at-risk')
    }
  ];
  
  
  return (
    <DashboardLayout>
      <div className="flex gap-6">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <Button 
                  onClick={refreshMetrics} 
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh Analytics
                </Button>
                {lastRefreshedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last refreshed at {lastRefreshedAt.toLocaleTimeString()}
                  </p>
                )}
              </div>
              <Button onClick={() => navigate("/customers/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboardStats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>

          {/* Revenue Trend Chart */}
          <RevenueTrendChart isRefreshing={isRefreshing} />

          {/* Pending Contracts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">
                Pending Contracts
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/contracts")}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contractsLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-md"></div>
                  ))
                ) : pendingContracts.length > 0 ? (
                  pendingContracts.map((contract) => (
                    <ContractCard key={contract.id} contract={contract} />
                  ))
                ) : (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    No pending contracts found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="flex flex-col h-auto py-4" onClick={() => navigate("/customers")}>
                  <Users className="h-6 w-6 mb-2" />
                  <span>Manage Customers</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-auto py-4" onClick={() => navigate("/lifecycle")}>
                  <Kanban className="h-6 w-6 mb-2" />
                  <span>Lifecycle Tracking</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-auto py-4" onClick={() => navigate("/partnerships")}>
                  <HandHeart className="h-6 w-6 mb-2" />
                  <span>Partnerships</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-auto py-4" onClick={() => navigate("/tasks")}>
                  <BarChart3 className="h-6 w-6 mb-2" />
                  <span>Tasks Board</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar Panel */}
        <div className="w-80">
          <UpdatesPanel />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
