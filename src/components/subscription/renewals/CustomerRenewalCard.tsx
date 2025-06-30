
import React from "react";
import { ProcessedCustomer } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText } from "lucide-react";
import { ViewContractsDialog } from "./ViewContractsDialog";

interface CustomerRenewalCardProps {
  customer: ProcessedCustomer;
  onUpdateDate: (customerId: string, newDate: string, customerName: string) => void;
  onMarkAsPaid: (customerId: string, customerName: string) => void;
}

export const CustomerRenewalCard: React.FC<CustomerRenewalCardProps> = ({ 
  customer, 
  onUpdateDate,
  onMarkAsPaid
}) => {
  const formatCurrency = (amount: number | null) => {
    if (!amount) return "$0";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-14 w-14">
            <AvatarImage src={customer.logo || ""} alt={customer.name} />
            <AvatarFallback className="bg-doo-purple-100 text-doo-purple-700 text-lg font-semibold">
              {customer.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-xl mb-1">{customer.name}</h3>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              {customer.segment && (
                <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                  {customer.segment}
                </span>
              )}
              {customer.country && (
                <span className="text-xs">{customer.country}</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Number of Contracts</span>
            <span className="font-semibold text-lg">
              {customer.contractCount} {customer.contractCount === 1 ? 'Contract' : 'Contracts'}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Total Lifetime Value</span>
            <span className="font-bold text-xl text-green-600">
              {formatCurrency(customer.lifetimeValue)}
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <ViewContractsDialog
            customerId={customer.id}
            customerName={customer.name}
          />
        </div>
      </CardContent>
    </Card>
  );
};
