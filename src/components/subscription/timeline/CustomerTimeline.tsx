
import React from "react";
import { ProcessedCustomer } from "../types";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar } from "lucide-react";

interface CustomerTimelineProps {
  customer: ProcessedCustomer;
}

export const CustomerTimeline: React.FC<CustomerTimelineProps> = ({ customer }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'from-green-500 to-green-400';
      case 'expiring_soon':
        return 'from-orange-500 to-orange-400';
      case 'expired':
        return 'from-red-500 to-red-400';
      default:
        return 'from-gray-400 to-gray-300';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'expiring_soon':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 100 / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 100 / 1000).toFixed(0)}K`;
    }
    return `$${(value / 100).toLocaleString()}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 hover:shadow-md transition-shadow">
      {/* Customer Info Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {customer.logo && (
            <img src={customer.logo} alt={customer.name} className="h-10 w-10 rounded-lg object-cover" />
          )}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{customer.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>{customer.country || 'Global'}</span>
              {customer.segment && <span>• {customer.segment}</span>}
            </div>
          </div>
        </div>
        <Badge className={getStatusBadgeColor(customer.status)}>
          {customer.timeLeft}
        </Badge>
      </div>

      {/* Timeline Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {customer.go_live_date ? new Date(customer.go_live_date).toLocaleDateString() : 'No start date'}
          </span>
          <span>
            {customer.subscription_end_date ? new Date(customer.subscription_end_date).toLocaleDateString() : 'No end date'}
          </span>
        </div>
        
        {customer.subscription_end_date && customer.go_live_date ? (
          <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${getStatusColor(customer.status)} transition-all duration-300`}
              style={{ width: `${Math.min(100, Math.max(0, customer.progressPercentage))}%` }}
            />
            {/* Current day marker */}
            <div 
              className="absolute top-0 w-0.5 h-full bg-gray-800 dark:bg-white"
              style={{ left: `${Math.min(100, Math.max(0, customer.progressPercentage))}%` }}
            />
          </div>
        ) : (
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-xs text-gray-500">Missing date information</span>
          </div>
        )}
      </div>

      {/* Financial Info */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          {customer.annual_rate && customer.annual_rate > 0 && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <DollarSign className="h-3 w-3" />
              <span className="font-medium">{formatValue(customer.annual_rate)}/year</span>
            </div>
          )}
        </div>
        <div className="text-gray-600 dark:text-gray-400">
          {customer.delta > 0 ? (
            <span className="font-medium">{customer.delta} days left</span>
          ) : customer.delta === 0 ? (
            <span className="font-medium text-orange-600">Renews today</span>
          ) : customer.status !== 'missing_date' ? (
            <span className="font-medium text-red-600">Overdue</span>
          ) : (
            <span>No end date</span>
          )}
        </div>
      </div>
    </div>
  );
};
