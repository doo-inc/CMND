
import React from "react";
import { ProcessedCustomer } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, DollarSign, CheckCircle } from "lucide-react";
import { UpdateDateDialog } from "./UpdateDateDialog";

interface CustomerRenewalCardProps {
  customer: ProcessedCustomer;
  onRemind: (customerId: string, customerName: string) => void;
  onUpdateDate: (customerId: string, newDate: string, customerName: string) => void;
  onMarkAsPaid: (customerId: string, customerName: string) => void;
}

export const CustomerRenewalCard: React.FC<CustomerRenewalCardProps> = ({ 
  customer, 
  onRemind,
  onUpdateDate,
  onMarkAsPaid
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "expired":
        return "bg-red-100 text-red-800 border-red-200";
      case "expiring_soon":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={customer.logo || ""} alt={customer.name} />
              <AvatarFallback className="bg-doo-purple-100 text-doo-purple-700">
                {customer.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{customer.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {customer.segment && (
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                    {customer.segment}
                  </span>
                )}
                {customer.country && (
                  <span className="text-xs">{customer.country}</span>
                )}
              </div>
            </div>
          </div>
          <Badge className={`${getStatusColor(customer.status)} font-medium`}>
            {customer.timeLeft}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Renewal Date</p>
              <p className="font-medium">{formatDate(customer.subscription_end_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Annual Rate</p>
              <p className="font-medium">{formatCurrency(customer.annual_rate)}</p>
            </div>
          </div>
        </div>

        {customer.setup_fee && customer.setup_fee > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Setup Fee: <span className="font-medium">{formatCurrency(customer.setup_fee)}</span>
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRemind(customer.id, customer.name)}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <Mail className="h-4 w-4" />
            Send Reminder
          </Button>
          <div className="flex-1 min-w-0">
            <UpdateDateDialog
              customerId={customer.id}
              customerName={customer.name}
              currentDate={customer.subscription_end_date}
              onUpdateDate={onUpdateDate}
            />
          </div>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => onMarkAsPaid(customer.id, customer.name)}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <CheckCircle className="h-4 w-4" />
            Mark as Paid
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
