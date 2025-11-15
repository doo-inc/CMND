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
  // Group contracts by customer and calculate revenue
  const revenueByCustomer = new Map<string, { name: string; revenue: number }>();
  
  contracts.forEach((contract) => {
    const customerName = contract.customer?.name || "Unknown Customer";
    const customerId = contract.customer_id;
    const key = `${customerId}-${customerName}`;
    
    const current = revenueByCustomer.get(key) || { name: customerName, revenue: 0 };
    current.revenue += calculateContractValue(contract);
    revenueByCustomer.set(key, current);
  });

  const chartData = Array.from(revenueByCustomer.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10); // Show top 10 customers

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Customer</CardTitle>
          <CardDescription>Revenue generated from each customer through this partnership</CardDescription>
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
        <CardTitle>Revenue by Customer</CardTitle>
        <CardDescription>Top customers generating revenue through this partnership</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              type="number" 
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              className="text-xs"
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={150}
              className="text-xs"
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
              fill="hsl(var(--primary))" 
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
