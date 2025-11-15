import React from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { CustomerData } from "@/types/customers";

interface StalledCustomersSectionProps {
  customers: CustomerData[];
}

export const StalledCustomersSection: React.FC<StalledCustomersSectionProps> = ({ customers }) => {
  // Show customers in non-active stages (potential stalled deals)
  const stalledCustomers = React.useMemo(() => {
    const stalledStages = ["Lead", "Qualified", "Demo", "Proposal"]; // Early stages that might stall
    
    return customers
      .filter((c) => {
        // Include customers in early stages (not yet in contract/implementation/live)
        return stalledStages.includes(c.stage || "") && c.stage !== "Lost" && c.stage !== "Churned";
      })
      .sort((a, b) => b.contractSize - a.contractSize) // Sort by value (highest first)
      .slice(0, 10);
  }, [customers]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  if (stalledCustomers.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="h-5 w-5 text-orange-600" />
        <h3 className="text-lg font-semibold">At-Risk Deals ({stalledCustomers.length})</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        High-value customers in early pipeline stages requiring attention
      </p>
      <div className="space-y-2">
        {stalledCustomers.map((customer, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-muted-foreground">{customer.stage || "Unknown"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-primary">
                {formatCurrency(customer.contractSize)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
