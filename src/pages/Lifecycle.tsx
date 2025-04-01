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
import { customers as mockCustomers } from "@/data/mockData";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types/customers";
import { LifecycleStageProps } from "@/components/lifecycle/LifecycleStage";
import { MessageSquare, Instagram, Globe, Mail, Smartphone } from "lucide-react";

// Helper function to convert mock customer to DB Customer type
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

const Lifecycle = () => {
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [customerStages, setCustomerStages] = useState<LifecycleStageProps[]>([]);
  const [loading, setLoading] = useState(true);

  // Convert customerId to UUID format for database operations
  const getDbCustomerId = (customerId: string) => {
    // If it's already a UUID, return it
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      return customerId;
    }
    
    // For our mock customers with format like "cust-001", we'll create a deterministic UUID
    // This approach ensures the same mock ID always maps to the same UUID
    return `00000000-0000-0000-0000-${customerId.replace(/\D/g, '').padStart(12, '0')}`;
  };

  // Fetch customers from Supabase
  useEffect(() => {
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
          // We're getting back proper customers from the database
          setCustomerList(data);
          setSelectedCustomer(data[0].id);
        } else {
          console.log("No customers found, using mock data");
          // If no customers exist in the database, use mock data
          const convertedCustomers = mockCustomers.map(convertMockToCustomer);
          setCustomerList(convertedCustomers);
          setSelectedCustomer(convertedCustomers[0].id);
        }
      } catch (error) {
        console.error("Error in fetchCustomers:", error);
        toast.error("Failed to load customers, using mock data");
        
        // Fall back to mock data but convert to Customer type
        const convertedCustomers = mockCustomers.map(convertMockToCustomer);
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
      
      if (data) {
        // Convert Supabase data to LifecycleStageProps format
        const formattedStages: LifecycleStageProps[] = data.map((stage: any) => ({
          id: stage.id,
          name: stage.name,
          status: stage.status as "not-started" | "in-progress" | "done" | "blocked",
          owner: stage.staff ? {
            id: stage.staff.id,
            name: stage.staff.name,
            role: stage.staff.role
          } : {
            id: "user-001",
            name: "Ahmed Abdullah",
            role: "Account Executive"
          },
          deadline: stage.deadline,
          notes: stage.notes,
        }));

        setCustomerStages(formattedStages);
        
        // If no stages are found, automatically add default stages
        if (formattedStages.length === 0) {
          console.log("No stages found, adding default stages");
          await handleAddDefaultIntegrations(customerId);
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

  const handleAddDefaultIntegrations = async (customerId = selectedCustomer) => {
    if (!customerId) {
      console.log("No customer ID provided, can't add default integrations");
      return;
    }
    
    try {
      setLoading(true);
      const dbCustomerId = getDbCustomerId(customerId);
      console.log("Adding default stages for customer ID:", customerId, "DB ID:", dbCustomerId);
      
      // Check if integrations already exist for this customer
      const { data: existingStages } = await supabase
        .from('lifecycle_stages')
        .select('name')
        .eq('customer_id', dbCustomerId);
      
      const existingStageNames = existingStages?.map(stage => stage.name) || [];
      
      // Filter out integration stages that already exist
      const stagesToAdd = defaultIntegrationStages.filter(
        stage => !existingStageNames.includes(stage.name)
      );
      
      if (stagesToAdd.length === 0) {
        toast.info("Integration stages already exist for this customer");
        return;
      }
      
      // Prepare stages for insertion
      const stagesToInsert = stagesToAdd.map(stage => ({
        customer_id: dbCustomerId,
        name: stage.name,
        status: stage.status,
        owner_id: stage.owner.id,
        notes: stage.notes
      }));
      
      console.log("Inserting stages:", stagesToInsert);
      
      // Insert stages
      const { error } = await supabase
        .from('lifecycle_stages')
        .insert(stagesToInsert);
      
      if (error) {
        console.error("Error details:", error);
        throw error;
      }
      
      toast.success("Integration stages added successfully");
      
      // Refresh stages
      await fetchCustomerStages(customerId);
      
    } catch (error) {
      console.error("Error adding integration stages:", error);
      toast.error("Failed to add integration stages");
    } finally {
      setLoading(false);
    }
  };

  const handleStagesUpdate = (updatedStages: LifecycleStageProps[]) => {
    setCustomerStages(updatedStages);
    console.log("Updated stages:", updatedStages);
    toast.success("Lifecycle stages updated successfully");
  };

  const selectedCustomerData = customerList.find(
    (customer) => customer.id === selectedCustomer
  ) || (selectedCustomer ? convertMockToCustomer(mockCustomers.find((c) => c.id === selectedCustomer)) : null);

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
          <div className="flex items-center space-x-4">
            <Select value={selectedCustomer} onValueChange={handleCustomerChange}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                ) : (
                  (customerList.length > 0 ? customerList : mockCustomers.map(convertMockToCustomer)).map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => handleAddDefaultIntegrations()}
              disabled={loading || !selectedCustomer}
            >
              Add Integration Stages
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
