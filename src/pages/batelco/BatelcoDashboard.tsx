import React, { useEffect, useState } from "react";
import { BatelcoLayout } from "@/components/batelco/BatelcoLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Users,
  BarChart3,
  TrendingUp,
  DollarSign,
  FileText,
  RefreshCw,
  Kanban,
  Briefcase,
  Target,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { BatelcoGoalTracker } from "@/components/batelco/BatelcoGoalTracker";
import { useProfile } from "@/hooks/useProfile";

interface BatelcoMetrics {
  totalCustomers: number;
  liveCustomers: number;
  totalContracts: number;
  totalRevenue: number;
  totalARR: number;
  mrr: number;
  pipelineValue: number;
  pipelineCount: number;
  averageDealSize: number;
}

const BatelcoDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<BatelcoMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const firstName =
    profile?.full_name?.split(" ")[0] || profile?.email?.split("@")[0] || "there";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const fetchBatelcoMetrics = async () => {
    try {
      setIsRefreshing(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Batelco portal only shows customers added through the Batelco portal (partner_label = 'batelco').
      const { data: allCustomers, error: custErr } = await supabase
        .from("customers")
        .select("*")
        .eq("partner_label", "batelco");

      if (custErr) throw custErr;

      const customers = allCustomers || [];

      const validCustomers = customers.filter(
        (c: any) => c.status !== "churned" && c.stage !== "Lost"
      );

      const batelcoCustomerIds = customers.map((c: any) => c.id);

      let batelcoContracts: any[] = [];
      if (batelcoCustomerIds.length > 0) {
        const { data: contractsData, error: contrErr } = await supabase
          .from("contracts")
          .select("id, value, annual_rate, setup_fee, status, start_date, customer_id")
          .in("customer_id", batelcoCustomerIds);

        if (!contrErr) {
          batelcoContracts = contractsData || [];
        }
      }

      const activeContracts = batelcoContracts.filter(
        (c: any) => c.status === "active" || c.status === "pending" || !c.status
      );

      const customerIdsWithActiveContracts = new Set(
        activeContracts
          .filter((c: any) => c.status === "active")
          .map((c: any) => c.customer_id)
      );

      const liveCustomers = customerIdsWithActiveContracts.size;

      const totalRevenue = activeContracts.reduce((sum: number, c: any) => {
        const v = (c.setup_fee || 0) + (c.annual_rate || 0);
        return sum + (v > 0 ? v : c.value || 0);
      }, 0);

      const totalARR = activeContracts.reduce((sum: number, c: any) => {
        const start = c.start_date ? new Date(c.start_date) : null;
        if (start && start > today) return sum;
        const amount = (c.annual_rate || 0) > 0 ? c.annual_rate : (c.value || 0);
        return sum + amount;
      }, 0);

      const pipelineCustomers = validCustomers.filter(
        (c: any) => !customerIdsWithActiveContracts.has(c.id)
      );
      const pipelineValue = pipelineCustomers.reduce(
        (sum: number, c: any) => sum + (c.estimated_deal_value || c.contract_size || 0),
        0
      );
      const pipelineCount = pipelineCustomers.length;

      const totalCustomers = validCustomers.length;

      setMetrics({
        totalCustomers,
        liveCustomers,
        totalContracts: activeContracts.length,
        totalRevenue,
        totalARR,
        mrr: totalARR / 12,
        pipelineValue,
        pipelineCount,
        averageDealSize: pipelineCount > 0 ? pipelineValue / pipelineCount : 0,
      });
    } catch (error) {
      console.error("Error fetching Batelco metrics:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBatelcoMetrics();
  }, []);

  const d = metrics;
  const dashboardStats = [
    {
      title: "Total Customers",
      value: `${d?.totalCustomers || 0}`,
      description: "Batelco partner customers",
      icon: <Users className="h-6 w-6" />,
    },
    {
      title: "Live Customers",
      value: `${d?.liveCustomers || 0}`,
      description: "Active contracts",
      icon: <Target className="h-6 w-6" />,
    },
    {
      title: "Total Contracts",
      value: `${d?.totalContracts || 0}`,
      description: "Active & pending",
      icon: <FileText className="h-6 w-6" />,
    },
    {
      title: "Total Revenue",
      value: formatCurrency(d?.totalRevenue || 0, false),
      description: "Contract value",
      icon: <DollarSign className="h-6 w-6" />,
    },
    {
      title: "Total ARR",
      value: formatCurrency(d?.totalARR || 0, false),
      description: "Annual recurring",
      icon: <BarChart3 className="h-6 w-6" />,
    },
    {
      title: "MRR",
      value: formatCurrency(d?.mrr || 0, false),
      description: "Monthly recurring",
      icon: <TrendingUp className="h-6 w-6" />,
    },
    {
      title: "Pipeline Value",
      value: formatCurrency(d?.pipelineValue || 0, false),
      description: `${d?.pipelineCount || 0} active deals`,
      icon: <Kanban className="h-6 w-6" />,
    },
    {
      title: "Avg Deal Size",
      value: formatCurrency(d?.averageDealSize || 0, false),
      description: "Per pipeline deal",
      icon: <Briefcase className="h-6 w-6" />,
    },
  ];

  return (
    <BatelcoLayout>
      <div className="space-y-12">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500/10 via-red-400/10 to-orange-500/10 border border-red-500/20 p-6 mb-2 animate-welcome-slide">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-4 -right-4 w-32 h-32 bg-red-500/20 rounded-full blur-3xl animate-float" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-orange-500/20 rounded-full blur-2xl animate-float" style={{ animationDelay: "0.5s" }} />
          </div>
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/25 animate-float">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <h2 className="text-2xl sm:text-3xl font-bold">
                <span className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                  {getGreeting()}, {firstName}!
                </span>
              </h2>
              <p className="text-muted-foreground mt-1 opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
                Welcome to the DOO Partner Portal
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Your Batelco partnership performance
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={fetchBatelcoMetrics}
                disabled={isRefreshing}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                onClick={() => navigate("/batelco/customers/new")}
                className="bg-gradient-to-r from-red-600 to-red-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </div>
          </div>
        </div>

        {/* Goals */}
        <section className="mb-8">
          <BatelcoGoalTracker />
        </section>

        {/* KPIs */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Key Performance Indicators</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dashboardStats.map((stat, index) => (
              <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 30}ms` }}>
                <StatCard {...stat} isLoading={loading} />
              </div>
            ))}
          </div>
        </section>

      </div>
    </BatelcoLayout>
  );
};

export default BatelcoDashboard;
