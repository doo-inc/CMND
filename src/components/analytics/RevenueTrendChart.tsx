import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { TrendingUp } from "lucide-react";

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface RevenueTrendChartProps {
  isRefreshing?: boolean;
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const RevenueTrendChart = ({ isRefreshing, countries, dateFrom, dateTo }: RevenueTrendChartProps) => {
  const [data, setData] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRevenueTrend = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('contracts')
        .select('created_at, setup_fee, annual_rate, status, customers!inner(country)')
        .in('status', ['active', 'pending', 'expired'])
        .order('created_at', { ascending: true });

      if (countries && countries.length > 0) {
        query = query.in('customers.country', countries);
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      const { data: contracts, error } = await query;

      if (error) throw error;

      // Calculate cumulative revenue
      let cumulativeRevenue = 0;
      const cumulativeData: { date: Date; revenue: number; month: string }[] = [];

      contracts?.forEach(contract => {
        cumulativeRevenue += (contract.setup_fee || 0) + (contract.annual_rate || 0);
        const date = new Date(contract.created_at);
        cumulativeData.push({
          date,
          revenue: cumulativeRevenue,
          month: date.toLocaleString('default', { month: 'short', year: 'numeric' })
        });
      });

      // Group by month (keep only last value per month for cleaner chart)
      const monthlyGrouped = new Map<string, number>();
      cumulativeData.forEach(item => {
        const existing = monthlyGrouped.get(item.month);
        if (!existing || item.revenue > existing) {
          monthlyGrouped.set(item.month, item.revenue);
        }
      });

      // Convert to array format for chart
      const sortedData = Array.from(monthlyGrouped.entries())
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => {
          const dateA = new Date(a.month);
          const dateB = new Date(b.month);
          return dateA.getTime() - dateB.getTime();
        });

      setData(sortedData);
    } catch (error) {
      console.error("Error fetching revenue trend:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueTrend();
  }, [isRefreshing, countries, dateFrom, dateTo]);

  if (loading) {
    return (
    <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80 h-[500px]">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Total Revenue Growth</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Cumulative revenue over time</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length < 2) {
    return (
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80 h-[500px]">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Total Revenue Growth</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Cumulative revenue over time</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <TrendingUp className="h-12 w-12 mb-2 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">Insufficient data to display revenue growth</p>
            <p className="text-sm text-muted-foreground">At least 2 data points required</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80 h-[500px] flex flex-col">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Total Revenue Growth</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Cumulative revenue over time</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value, false)}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              formatter={(value: number) => [`Total Revenue: ${formatCurrency(value)}`, '']}
              labelFormatter={(label) => `Month: ${label}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              name="Total Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
