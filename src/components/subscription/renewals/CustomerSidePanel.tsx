
import React from "react";
import { MonthlyRenewal } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CalendarIcon, DollarSign, Mail, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CustomerSidePanelProps {
  monthData: MonthlyRenewal | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerSidePanel: React.FC<CustomerSidePanelProps> = ({
  monthData,
  isOpen,
  onClose
}) => {
  if (!monthData) return null;

  const formatValue = (value: number) => {
    return `$${(value / 100).toLocaleString()}`;
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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-doo-purple-600" />
            {monthData.month} Renewals
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {monthData.renewalCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Customers
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatValue(monthData.totalValue)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Value
                </div>
              </div>
            </div>
          </div>

          {/* Customer List */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Customer Details</h4>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {monthData.customers.map((customer) => (
                  <div key={customer.id} className="border rounded-lg p-4 space-y-3">
                    {/* Customer Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {customer.logo && (
                          <img src={customer.logo} alt={customer.name} className="h-8 w-8 rounded-lg object-cover" />
                        )}
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">
                            {customer.name}
                          </h5>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {customer.country} • {customer.segment}
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusBadgeColor(customer.status)}>
                        {customer.delta > 0 ? `${customer.delta} days` : 'Overdue'}
                      </Badge>
                    </div>

                    {/* Financial Info */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Renewal Date:</span>
                        <div className="font-medium">
                          {customer.subscription_end_date ? 
                            new Date(customer.subscription_end_date).toLocaleDateString() : 
                            'Not set'
                          }
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Annual Rate:</span>
                        <div className="font-medium text-green-600 dark:text-green-400">
                          {customer.annual_rate ? formatValue(customer.annual_rate) : 'Not set'}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Mark Paid
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Mail className="h-3 w-3 mr-1" />
                        Remind
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
