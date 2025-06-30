
import React, { useState } from "react";
import { ProcessedCustomer } from "../types";
import { CustomerRenewalCard } from "./CustomerRenewalCard";
import { MonthlyRenewalsView } from "./MonthlyRenewalsView";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Grid3X3, Calendar } from "lucide-react";

interface RenewalsViewProps {
  customers: ProcessedCustomer[];
  isLoading: boolean;
  onRemind: (customerId: string, customerName: string) => void;
  onUpdateDate: (customerId: string, newDate: string, customerName: string) => void;
  onMarkAsPaid: (customerId: string, customerName: string) => void;
}

export const RenewalsView: React.FC<RenewalsViewProps> = ({ 
  customers, 
  isLoading, 
  onRemind,
  onUpdateDate,
  onMarkAsPaid
}) => {
  const [viewMode, setViewMode] = useState<'monthly' | 'cards'>('cards');

  if (isLoading) {
    return viewMode === 'monthly' ? (
      <MonthlyRenewalsView 
        customers={[]} 
        isLoading={true} 
        onUpdateDate={onUpdateDate}
      />
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No subscription renewals found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No customers have completed their "Go Live" stage or match your current filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'monthly' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('monthly')}
          className="flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          Monthly View
        </Button>
        <Button
          variant={viewMode === 'cards' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('cards')}
          className="flex items-center gap-2"
        >
          <Grid3X3 className="h-4 w-4" />
          Card View
        </Button>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'monthly' ? (
        <MonthlyRenewalsView 
          customers={customers} 
          isLoading={isLoading} 
          onUpdateDate={onUpdateDate}
        />
      ) : (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              All Customers
            </h2>
            <p className="text-sm text-gray-500">
              {customers.length} customer{customers.length !== 1 ? 's' : ''} with active contracts
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map((customer) => (
              <CustomerRenewalCard
                key={customer.id}
                customer={customer}
                onUpdateDate={onUpdateDate}
                onMarkAsPaid={onMarkAsPaid}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
