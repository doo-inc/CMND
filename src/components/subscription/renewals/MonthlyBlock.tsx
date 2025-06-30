
import React from "react";
import { MonthlyRenewal } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, DollarSign, Users } from "lucide-react";

interface MonthlyBlockProps {
  monthData: MonthlyRenewal;
  onClick: () => void;
}

export const MonthlyBlock: React.FC<MonthlyBlockProps> = ({ monthData, onClick }) => {
  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 100 / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 100 / 1000).toFixed(0)}K`;
    }
    return `$${(value / 100).toLocaleString()}`;
  };

  const maxAvatars = 6;
  const visibleCustomers = monthData.customers.slice(0, maxAvatars);
  const overflowCount = Math.max(0, monthData.customers.length - maxAvatars);

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-6">
        {/* Month Header */}
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon className="h-5 w-5 text-doo-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {monthData.month}
          </h3>
        </div>

        {/* Metrics */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Users className="h-3 w-3" />
              Renewals
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {monthData.renewalCount}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Total Value
            </span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              {formatValue(monthData.totalValue)}
            </span>
          </div>
        </div>

        {/* Customer Avatars */}
        <div className="space-y-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Customers
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {visibleCustomers.map((customer, index) => (
              <div key={customer.id} className="relative group">
                {customer.logo ? (
                  <img
                    src={customer.logo}
                    alt={customer.name}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-white dark:ring-gray-800"
                    title={customer.name}
                  />
                ) : (
                  <div 
                    className="h-8 w-8 rounded-full bg-gradient-to-br from-doo-purple-500 to-doo-purple-600 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white dark:ring-gray-800"
                    title={customer.name}
                  >
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {overflowCount > 0 && (
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                +{overflowCount}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
