
import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LifecycleTracker } from "@/components/lifecycle/LifecycleTracker";
import { lifecycleStages } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { customers } from "@/data/mockData";
import { toast } from "sonner";

const Lifecycle = () => {
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0].id);
  const [customerStages, setCustomerStages] = useState(lifecycleStages);

  const handleCustomerChange = (value: string) => {
    setSelectedCustomer(value);
    // In a real app, you would fetch stages for the selected customer
    // For now, we'll just reset to the default stages
    setCustomerStages(lifecycleStages);
  };

  const handleStagesUpdate = (updatedStages: any) => {
    setCustomerStages(updatedStages);
    // In a real app, you would save these changes to your backend
    console.log("Updated stages:", updatedStages);
    toast.success("Lifecycle stages updated successfully");
  };

  const selectedCustomerData = customers.find(
    (customer) => customer.id === selectedCustomer
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Customer Lifecycle</h1>
          <div className="flex items-center space-x-4">
            <Select value={selectedCustomer} onValueChange={handleCustomerChange}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedCustomerData && (
          <LifecycleTracker
            customerId={selectedCustomerData.id}
            customerName={selectedCustomerData.name}
            stages={customerStages}
            onStagesUpdate={handleStagesUpdate}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Lifecycle;
