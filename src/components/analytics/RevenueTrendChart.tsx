import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { TrendingUp, Loader2, DollarSign } from "lucide-react";

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
  const [totalRevenue, setTotalRevenue] = useState(0);

  const fetchRevenueTrend = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('contracts')
        .select('created_at, setup_fee, annual_rate, value, status, customers!inner(country)')
        .or('status.eq.active,status.eq.pending,status.is.null')
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

      // Get last 3 months
      const now = new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const last3Months: string[] = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last3Months.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
      }

      // Calculate cumulative revenue
      let cumulativeRevenue = 0;
      const monthlyData = new Map<string, number>();

      contracts?.forEach(contract => {
        const contractValue = (contract.setup_fee > 0 || contract.annual_rate > 0) 
          ? (contract.setup_fee || 0) + (contract.annual_rate || 0)
          : (contract.value || 0);
        cumulativeRevenue += contractValue;
        
        const date = new Date(contract.created_at);
        const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        
        // Store cumulative value at each month
        monthlyData.set(monthKey, cumulativeRevenue);
      });

      // Build chart data for last 3 months with cumulative values
      let lastKnownValue = 0;
      const chartData: MonthlyRevenue[] = last3Months.map(monthKey => {
        const value = monthlyData.get(monthKey);
        if (value !== undefined) {
          lastKnownValue = value;
        }
        return {
          month: monthKey.split(' ')[0], // Just month name
          revenue: lastKnownValue
        };
      });

      console.log('[RevenueTrendChart] Last 3 months cumulative:', chartData);

      setData(chartData);
      setTotalRevenue(cumulativeRevenue);
    } catch (error) {
      console.error("Error fetching revenue trend:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueTrend();
  }, [isRefreshing, countries, dateFrom, dateTo]);

    return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-card/90 min-h-[500px] flex flex-col">
      <CardHeader className="border-b border-border/50 pb-4 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <DollarSign className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Revenue Growth</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Cumulative revenue trend</p>
            </div>
          </div>
        </CardHeader>
      <CardContent className="p-4 flex-1 flex flex-col gap-4">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading revenue data...</p>
          </div>
        ) : data.length < 1 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <TrendingUp className="h-12 w-12 mb-3 opacity-30 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">No revenue data</p>
            <p className="text-sm text-muted-foreground">Add contracts to see revenue trends</p>
            </div>
        ) : (
          <>
            {/* Total Revenue */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-200/50">
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>

            {/* Chart */}
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
            <XAxis 
              dataKey="month" 
              className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value, false)}
              className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
            />
            <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Cumulative Revenue']}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
                  <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
                    fill="url(#revenueGradient)"
            />
                </AreaChart>
        </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
