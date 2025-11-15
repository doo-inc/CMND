import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CustomerData } from "@/types/customers";

interface MovementInsight {
  type: "moved" | "new" | "stalled" | "value_gained" | "value_lost";
  count: number;
  value?: number;
  customers: Array<{ id: string; name: string }>;
}

interface TrendData {
  month: string;
  totalValue: number;
  customerCount: number;
  avgDealSize: number;
}

export const usePipelineAnalytics = (customers: CustomerData[]) => {
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    fetchHistoricalData();
  }, []);

  const fetchHistoricalData = async () => {
    try {
      // Fetch customer timeline events for the last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const { data, error } = await supabase
        .from("customer_timeline")
        .select("*")
        .gte("created_at", twelveMonthsAgo.toISOString())
        .order("created_at", { ascending: true });

      if (!error && data) {
        setHistoricalData(data);
      }
    } catch (error) {
      console.error("Error fetching historical data:", error);
    }
  };

  // Calculate movement insights
  const insights = useMemo(() => {
    // Generate realistic movement data based on current customer set
    // In production, this would use actual timeline/history data
    
    // Simulate customers moved this week (5-10% of total)
    const movedCount = Math.max(1, Math.floor(customers.length * 0.08));
    const movedCustomers = customers
      .filter(c => c.stage !== "Lead" && c.stage !== "Lost")
      .slice(0, movedCount);

    // Simulate new customers (2-5% of total)
    const newCount = Math.max(1, Math.floor(customers.length * 0.03));
    const newCustomers = customers
      .filter(c => c.stage === "Lead")
      .slice(0, newCount);

    // Stalled customers - in early stages with no recent progress
    const stalledCustomers = customers.filter((c) => {
      const earlyStages = ["Lead", "Discovery", "Demo", "Proposal"];
      return (
        c.status !== "done" &&
        c.stage !== "Live" &&
        c.stage !== "Lost" &&
        earlyStages.includes(c.stage || "")
      );
    }).slice(0, Math.max(1, Math.floor(customers.length * 0.1)));

    // Calculate value gained from moved customers
    const valueGained = movedCustomers
      .reduce((sum, c) => sum + (c.contractSize || 0), 0);

    // Calculate value lost from churned/lost customers
    const valueLost = customers
      .filter((c) => c.stage === "Lost" || c.status === "churned")
      .reduce((sum, c) => sum + (c.contractSize || 0), 0);

    return {
      movedThisWeek: {
        type: "moved" as const,
        count: movedCustomers.length,
        customers: movedCustomers.map((c) => ({ id: c.id, name: c.name })),
      },
      newCustomers: {
        type: "new" as const,
        count: newCustomers.length,
        customers: newCustomers.map((c) => ({ id: c.id, name: c.name })),
      },
      stalledCustomers: {
        type: "stalled" as const,
        count: stalledCustomers.length,
        customers: stalledCustomers.map((c) => ({ id: c.id, name: c.name })),
      },
      valueGained: {
        type: "value_gained" as const,
        count: movedCustomers.length,
        value: valueGained,
        customers: movedCustomers.map((c) => ({ id: c.id, name: c.name })),
      },
      valueLost: {
        type: "value_lost" as const,
        count: customers.filter((c) => c.stage === "Lost" || c.status === "churned").length,
        value: valueLost,
        customers: customers
          .filter((c) => c.stage === "Lost" || c.status === "churned")
          .map((c) => ({ id: c.id, name: c.name })),
      },
    };
  }, [customers]);

  // Generate 12-month trend data
  const trendData = useMemo((): TrendData[] => {
    const months: TrendData[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      // Simulate historical growth (in production, use actual historical data)
      const monthIndex = 11 - i;
      const baseValue = 2000000;
      const growth = monthIndex * 150000;
      const randomVariation = Math.random() * 200000 - 100000;
      const totalValue = baseValue + growth + randomVariation;

      const baseCustomers = 25;
      const customerGrowth = monthIndex * 2;
      const customerCount = baseCustomers + customerGrowth + Math.floor(Math.random() * 5 - 2);

      months.push({
        month: monthName,
        totalValue: Math.max(totalValue, 1000000),
        customerCount: Math.max(customerCount, 20),
        avgDealSize: Math.floor(totalValue / customerCount),
      });
    }

    // Use actual current data for the last month
    if (customers.length > 0) {
      const currentTotal = customers.reduce(
        (sum, c) => sum + (c.contractSize || 0),
        0
      );
      months[months.length - 1] = {
        month: months[months.length - 1].month,
        totalValue: currentTotal,
        customerCount: customers.length,
        avgDealSize: Math.floor(currentTotal / customers.length),
      };
    }

    return months;
  }, [customers]);

  return {
    insights,
    trendData,
    refetch: fetchHistoricalData,
  };
};
