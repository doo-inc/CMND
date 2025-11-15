import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { calculateContractValue } from "@/utils/partnershipRevenue";

interface ContractWithCustomer {
  id: string;
  customer_id: string;
  customer?: {
    id: string;
    name: string;
  };
  [key: string]: any;
}

interface PartnershipRevenueChartProps {
  contracts: ContractWithCustomer[];
}

export const PartnershipRevenueChart = ({ contracts }: PartnershipRevenueChartProps) => {
  // Sort contracts by value for visualization
  const chartData = contracts
    .map((contract) => ({
      name: `${contract.customer?.name || "Unknown"} - ${contract.name}`,
      revenue: calculateContractValue(contract),
      customer: contract.customer?.name || "Unknown Customer"
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10); // Show top 10 contracts

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Linked Contracts by Value</CardTitle>
          <CardDescription>Top contracts this partnership helped close</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data to display. Link contracts to see revenue breakdown.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked Contracts by Value</CardTitle>
        <CardDescription>Top contracts this partnership helped close</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              type="number" 
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              className="text-xs"
            />
            <YAxis 
              type="category" 
              dataKey="customer" 
              width={120}
              className="text-xs"
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Contract Value"]}
              labelFormatter={(label) => `Customer: ${label}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar 
              dataKey="revenue" 
              fill="hsl(var(--primary))" 
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
