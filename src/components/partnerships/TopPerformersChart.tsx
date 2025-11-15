import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { getTopPartnershipsByRevenue } from "@/utils/partnershipRevenue";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";

export const TopPerformersChart = () => {
  const { data: topPartnerships = [], isLoading } = useQuery({
    queryKey: ['top-partnerships-by-revenue'],
    queryFn: async () => await getTopPartnershipsByRevenue(5)
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Performing Partnerships
          </CardTitle>
          <CardDescription>Partnerships generating the most revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (topPartnerships.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Performing Partnerships
          </CardTitle>
          <CardDescription>Partnerships generating the most revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No partnership revenue data yet. Link contracts to partnerships to see top performers.
          </div>
        </CardContent>
      </Card>
    );
  }

  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--primary) / 0.8)',
    'hsl(var(--primary) / 0.6)',
    'hsl(var(--primary) / 0.4)',
    'hsl(var(--primary) / 0.2)',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Top Performing Partnerships
        </CardTitle>
        <CardDescription>Partnerships generating the most revenue from linked contracts</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topPartnerships} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              type="number" 
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              className="text-xs"
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={150}
              className="text-xs"
              tick={(props) => {
                const { x, y, payload } = props;
                const partnership = topPartnerships.find(p => p.name === payload.value);
                return (
                  <Link to={`/partnerships/${partnership?.id}`}>
                    <text 
                      x={x} 
                      y={y} 
                      dy={4} 
                      textAnchor="end" 
                      fill="hsl(var(--foreground))"
                      className="text-xs hover:fill-primary cursor-pointer"
                    >
                      {payload.value.length > 20 ? `${payload.value.substring(0, 20)}...` : payload.value}
                    </text>
                  </Link>
                );
              }}
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar 
              dataKey="revenue" 
              radius={[0, 4, 4, 0]}
            >
              {topPartnerships.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
