
import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LifecycleTracker } from "@/components/lifecycle/LifecycleTracker";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { customers as realCustomers } from "@/data/realCustomers";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types/customers";
import { LifecycleStageProps } from "@/components/lifecycle/LifecycleStage";
import { defaultCustomerLifecycleStages, icons } from "@/data/realCustomers";

const convertMockToCustomer = (mockCustomer: any): Customer => {
  return {
    id: mockCustomer.id,
    name: mockCustomer.name,
    logo: mockCustomer.logo || null,
    segment: mockCustomer.segment || null,
    region: mockCustomer.region || null,
    stage: mockCustomer.stage || null,
    status: mockCustomer.status || null,
    contract_size: mockCustomer.contractSize || null,
    owner_id: mockCustomer.owner?.id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

const convertDefaultStageToProps = (defaultStage: any): LifecycleStageProps => {
  const IconComponent = icons[defaultStage.iconName];
  return {
    ...defaultStage,
    icon: IconComponent ? <IconComponent className="h-5 w-5" /> : undefined
  };
};

const Lifecycle = () => {
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [customerStages, setCustomerStages] = useState<LifecycleStageProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [validStaffIds, setValidStaffIds] = useState<string[]>([]);

  const getDbCustomerId = (customerId: string) => {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      return customerId;
    }
    
    return `00000000-0000-0000-0000-${customerId.replace(/\D/g, '').padStart(12, '0')}`;
  };

  const fetchValidStaffIds = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id');
      
      if (error) {
        console.error("Error fetching staff IDs:", error);
        return [];
      }
      
      return data?.map(staff => staff.id) || [];
    } catch (error) {
      console.error("Error in fetchValidStaffIds:", error);
      return [];
    }
  };

  useEffect(() => {
    const loadStaffIds = async () => {
      const ids = await fetchValidStaffIds();
      console.log("Valid staff IDs:", ids);
      setValidStaffIds(ids);
    };
    
    loadStaffIds();
    
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        
        console.log("Fetching customers for lifecycle...");
        const { data, error } = await supabase
          .from('customers')
          .select('*');

        if (error) {
          console.error("Error fetching customers:", error);
          throw error;
        }

        console.log("Lifecycle - fetched customers:", data);

        if (data && data.length > 0) {
          setCustomerList(data);
          setSelectedCustomer(data[0].id);
        } else {
          console.log("No customers found, using real customer data");
          const convertedCustomers = realCustomers.map(convertMockToCustomer);
          setCustomerList(convertedCustomers);
          setSelectedCustomer(convertedCustomers[0].id);
        }
      } catch (error) {
        console.error("Error in fetchCustomers:", error);
        toast.error("Failed to load customers, using real customer data");
        
        const convertedCustomers = realCustomers.map(convertMockToCustomer);
        setCustomerList(convertedCustomers);
        setSelectedCustomer(convertedCustomers[0].id);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const handleCustomerChange = async (value: string) => {
    console.log("Selected customer changed to:", value);
    setSelectedCustomer(value);
    await fetchCustomerStages(value);
  };

  const fetchCustomerStages = async (customerId: string) => {
    if (!customerId) {
      console.log("No customer ID provided, can't fetch stages");
      return;
    }
    
    try {
      setLoading(true);
      const dbCustomerId = getDbCustomerId(customerId);
      console.log("Fetching stages for customer ID:", customerId, "DB ID:", dbCustomerId);
      
      const { data, error } = await supabase
        .from('lifecycle_stages')
        .select(`
          *,
          staff:owner_id (id, name, role)
        `)
        .eq('customer_id', dbCustomerId);

      if (error) {
        console.error("Error fetching lifecycle stages:", error);
        throw error;
      }

      console.log("Fetched stages:", data);
      
      if (data && Array.isArray(data)) {
        const formattedStages: LifecycleStageProps[] = data.map((stage: any) => {
          const defaultStage = defaultCustomerLifecycleStages.find(
            ds => ds.name === stage.name && (stage.category ? ds.category === stage.category : true)
          );
          
          const IconComponent = defaultStage ? icons[defaultStage.iconName] : undefined;
          
          return {
            id: stage.id,
            name: stage.name,
            status: stage.status as LifecycleStageProps["status"],
            category: stage.category || defaultStage?.category || "",
            owner: stage.staff ? {
              id: stage.staff.id,
              name: stage.staff.name,
              role: stage.staff.role
            } : {
              id: "00000000-0000-0000-0000-000000000001",
              name: "Ahmed Abdullah",
              role: "Account Executive"
            },
            deadline: stage.deadline,
            notes: stage.notes,
            icon: IconComponent ? <IconComponent className="h-5 w-5" /> : undefined
          };
        });

        setCustomerStages(formattedStages);
        
        if (formattedStages.length === 0) {
          console.log("No stages found, default stages will be added by the lifecycle tracker");
        }
      }
    } catch (error) {
      console.error("Error in fetchCustomerStages:", error);
      toast.error("Failed to load lifecycle stages");
      setCustomerStages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStagesUpdate = (stages: LifecycleStageProps[]) => {
    setCustomerStages(stages);
  };

  const handleMarkAllNotApplicable = async (customerId = selectedCustomer) => {
    if (!customerId) return;
    
    try {
      setLoading(true);
      const dbCustomerId = getDbCustomerId(customerId);
      
      const { error } = await supabase
        .from('lifecycle_stages')
        .update({ status: 'not-applicable' })
        .eq('customer_id', dbCustomerId)
        .eq('status', 'not-started');
      
      if (error) {
        console.error("Error updating stages:", error);
        throw error;
      }
      
      const updatedStages = customerStages.map(stage => {
        if (stage.status === 'not-started') {
          return { ...stage, status: 'not-applicable' as const };
        }
        return stage;
      });
      
      setCustomerStages(updatedStages);
      toast.success("All not-started stages marked as Not Applicable");
    } catch (error) {
      console.error("Error marking stages as not applicable:", error);
      toast.error("Failed to update stages");
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomerData = customerList.find(
    (customer) => customer.id === selectedCustomer
  ) || (selectedCustomer ? convertMockToCustomer(realCustomers.find((c) => c.id === selectedCustomer)) : null);

  useEffect(() => {
    if (selectedCustomer) {
      console.log("Selected customer useEffect:", selectedCustomer);
      fetchCustomerStages(selectedCustomer);
    }
  }, [selectedCustomer]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Customer Lifecycle</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedCustomer} onValueChange={handleCustomerChange}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                ) : (
                  (customerList.length > 0 ? customerList : realCustomers.map(convertMockToCustomer)).map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => handleMarkAllNotApplicable()}
              disabled={loading || !selectedCustomer}
            >
              Mark Not Started as N/A
            </Button>
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
        
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-pulse text-center">
              <p className="text-muted-foreground">Loading lifecycle data...</p>
            </div>
          </div>
        )}
        
        {!loading && !selectedCustomerData && (
          <div className="flex justify-center py-8">
            <div className="text-center">
              <p className="text-muted-foreground">No customer selected or available. Please select a customer.</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Lifecycle;
