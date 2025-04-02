
import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { CustomerCard } from "@/components/customers/CustomerCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Calendar, FileText, Link, BarChart3, TrendingUp } from "lucide-react";
import { customers as mockCustomers } from "@/data/mockData";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CustomerData } from "@/components/customers/CustomerCard";

const Index = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('contract_size', { ascending: false })
          .limit(4);

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          const formattedCustomers: CustomerData[] = data.map(customer => ({
            id: customer.id,
            name: customer.name,
            logo: customer.logo || undefined,
            segment: customer.segment || "Unknown Segment",
            region: customer.region || "Unknown Region",
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
          setCustomers(mockCustomers);
        }
      } catch (error) {
        console.error("Error fetching customers:", error);
        setCustomers(mockCustomers);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Calculate total ARR from customers in database or mock data
  const calculateTotalARR = () => {
    const total = customers.reduce((sum, customer) => sum + (customer.contractSize || 0), 0);
    return total > 0 ? `$${(total / 1000).toFixed(0)}k` : "$0";
  };

  // Dashboard stats data with real metrics based on customers
  const dashboardStats = [
    {
      title: "Total ARR",
      value: calculateTotalARR(),
      change: { value: 14, type: "increase" as const },
      icon: <BarChart3 className="h-6 w-6" />
    },
    {
      title: "Active Customers",
      value: `${customers.filter(c => c.status === "in-progress" || c.status === "done").length}`,
      change: { value: 5, type: "increase" as const },
      icon: <Users className="h-6 w-6" />
    },
    {
      title: "Deals Pipeline",
      value: `$${(customers.filter(c => c.stage === "Proposal Sent" || c.stage === "Invoice Sent").reduce((sum, c) => sum + (c.contractSize || 0), 0) / 1000).toFixed(0)}k`,
      description: `${customers.filter(c => c.stage === "Proposal Sent" || c.stage === "Invoice Sent").length} active deals`,
      icon: <TrendingUp className="h-6 w-6" />
    },
    {
      title: "Growth Rate",
      value: "23%",
      change: { value: 7, type: "increase" as const },
      description: "Year-over-year",
      icon: <TrendingUp className="h-6 w-6" />
    }
  ];
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button onClick={() => navigate("/customers/new")}>
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboardStats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Customers */}
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
                  customers.slice(0, 4).map((customer) => (
                    <CustomerCard key={customer.id} customer={customer} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
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
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/contracts")}>
                <FileText className="mr-2 h-4 w-4" />
                Contracts & Documents
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/integrations")}>
                <Link className="mr-2 h-4 w-4" />
                Integration Center
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
