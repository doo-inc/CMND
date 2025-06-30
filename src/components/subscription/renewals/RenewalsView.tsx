
import React from "react";
import { ProcessedCustomer } from "../types";
import { CustomerRenewalCard } from "./CustomerRenewalCard";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";

interface RenewalsViewProps {
  customers: ProcessedCustomer[];
  isLoading: boolean;
  onRemind: (customerId: string, customerName: string) => void;
}

export const RenewalsView: React.FC<RenewalsViewProps> = ({ 
  customers, 
  isLoading, 
  onRemind 
}) => {
  if (isLoading) {
    return (
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
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
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
            No customers with subscription data match your current filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group customers by urgency for better organization
  const urgentCustomers = customers.filter(c => c.delta < 30 && c.delta >= 0);
  const expiringSoonCustomers = customers.filter(c => c.delta >= 30 && c.delta <= 60);
  const activeCustomers = customers.filter(c => c.delta > 60);
  const expiredCustomers = customers.filter(c => c.delta < 0);

  const sections = [
    { title: "Urgent (< 30 days)", customers: urgentCustomers, color: "text-red-600" },
    { title: "Expiring Soon (30-60 days)", customers: expiringSoonCustomers, color: "text-orange-600" },
    { title: "Overdue", customers: expiredCustomers, color: "text-red-800" },
    { title: "Active (> 60 days)", customers: activeCustomers, color: "text-green-600" }
  ].filter(section => section.customers.length > 0);

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.title}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className={`text-lg font-semibold ${section.color}`}>
              {section.title}
            </h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {section.customers.length} customer{section.customers.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {section.customers.map((customer) => (
              <CustomerRenewalCard
                key={customer.id}
                customer={customer}
                onRemind={onRemind}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
