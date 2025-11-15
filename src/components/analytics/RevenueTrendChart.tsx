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
}

export const RevenueTrendChart = ({ isRefreshing }: RevenueTrendChartProps) => {
  const [data, setData] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRevenueTrend = async () => {
    setLoading(true);
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('created_at, setup_fee, annual_rate')
        .gte('created_at', sixMonthsAgo.toISOString())
        .in('status', ['active', 'pending']);

      if (error) throw error;

      // Group by month
      const monthlyData = new Map<string, number>();
      
      contracts?.forEach(contract => {
        const date = new Date(contract.created_at);
        const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        const revenue = (contract.setup_fee || 0) + (contract.annual_rate || 0);
        
        monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + revenue);
      });

      // Convert to array and sort by date
      const sortedData = Array.from(monthlyData.entries())
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
  }, [isRefreshing]);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Trend (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length < 2) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Trend (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <TrendingUp className="h-12 w-12 mb-2 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">Insufficient data to display revenue trend</p>
            <p className="text-sm text-muted-foreground">At least 2 months of data required</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Revenue Trend (Last 6 Months)
        </CardTitle>
      </CardHeader>
      <CardContent>
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
              formatter={(value: number) => formatCurrency(value)}
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
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
