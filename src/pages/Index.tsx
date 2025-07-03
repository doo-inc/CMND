import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { CustomerCard } from "@/components/customers/CustomerCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, HandHeart, Kanban, BarChart3, TrendingUp, Activity, Clock, Briefcase, LifeBuoy, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CustomerData } from "@/types/customers";
import { syncCustomersToDatabase, checkForDuplicateStages } from "@/utils/customerDataSync";
import { toast } from "sonner";
import { 
  getLiveCustomers, 
  getCustomerARRData, 
  getDealsPipeline, 
  calculateAverageGoLiveTime,
  calculateChurnRate,
  calculateSalesLifecycle,
  formatCurrency
} from "@/utils/customerUtils";

const Index = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const initialSync = async () => {
      // Sync customers automatically on first load
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

  // Calculate dashboard metrics
  const { totalARR, liveCustomers, growthRate } = getCustomerARRData(customers);
  const formattedARR = formatCurrency(totalARR);
  const dealsPipeline = getDealsPipeline(customers);
  const formattedDealsPipeline = formatCurrency(dealsPipeline.value);
  
  const getTotalCustomersCount = () => {
    return customers.length;
  };
  
  const dashboardStats = [
    {
      title: "Total ARR",
      value: formattedARR,
      change: { value: 14, type: "increase" as const },
      icon: <BarChart3 className="h-6 w-6" />
    },
    {
      title: "Live Customers",
      value: `${liveCustomers.length}`,
      change: { value: 5, type: "increase" as const },
      icon: <LifeBuoy className="h-6 w-6" />
    },
    {
      title: "Total Customers",
      value: `${getTotalCustomersCount()}`,
      icon: <Briefcase className="h-6 w-6" />
    },
    {
      title: "Deals Pipeline",
      value: formattedDealsPipeline,
      description: `${dealsPipeline.count} active deals`,
      icon: <TrendingUp className="h-6 w-6" />
    },
    {
      title: "Sales Lifecycle",
      value: calculateSalesLifecycle(),
      description: "Average sales cycle",
      icon: <Kanban className="h-6 w-6" />
    },
    {
      title: "Growth Rate",
      value: `${growthRate}%`,
      description: "Last quarter",
      change: { value: 8, type: "increase" as const },
      icon: <TrendingUp className="h-6 w-6" />
    },
    {
      title: "Avg. Go Live Time",
      value: calculateAverageGoLiveTime(),
      description: "From contract to live",
      icon: <Clock className="h-6 w-6" />
    },
    {
      title: "Churn Rate",
      value: calculateChurnRate(customers),
      description: "Last 12 months",
      icon: <Activity className="h-6 w-6" />
    }
  ];
  
  // Get unique customers for the Recent Customers section to avoid duplicates
  const recentCustomers = customers.filter((customer, index, self) => 
    index === self.findIndex((c) => c.name === customer.name)
  ).slice(0, 4);
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/customers/new")}>
              <Plus className="mr-2 h-4 w-4" /> Add Customer
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dashboardStats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="col-span-2 bg-card dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">
                Recent Customers
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/customers")}>
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-md"></div>
                  ))
                ) : (
                  recentCustomers.map((customer) => (
                    <CustomerCard key={customer.id} customer={customer} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/customers")}>
                <Users className="mr-2 h-4 w-4" />
                Manage Customers
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/lifecycle")}>
                <Calendar className="mr-2 h-4 w-4" />
                Customer Lifecycle
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/partnerships")}>
                <HandHeart className="mr-2 h-4 w-4" />
                Manage Partnerships
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/tasks")}>
                <Kanban className="mr-2 h-4 w-4" />
                Manage Tasks
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
