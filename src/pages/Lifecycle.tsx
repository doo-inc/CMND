import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LifecycleTracker } from "@/components/lifecycle/LifecycleTracker";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types/customers";
import { LifecycleStageProps } from "@/components/lifecycle/LifecycleStage";
import { defaultLifecycleStages } from "@/data/defaultLifecycleStages";
import { removeDuplicateCustomers } from "@/utils/customerDataSync";
import { 
  FileCheck, Users, Briefcase, DollarSign, Calendar,
  BookOpen, HeartHandshake, Medal, Zap, CheckSquare, Monitor
} from "lucide-react";

// Icon mapping for stages
const stageIcons: Record<string, React.ReactNode> = {
  "Prospect": <Users className="h-5 w-5" />,
  "Qualified Lead": <CheckSquare className="h-5 w-5" />,
  "Meeting Set": <Calendar className="h-5 w-5" />,
  "Discovery Call": <Calendar className="h-5 w-5" />,
  "Demo": <Monitor className="h-5 w-5" />,
  "Proposal Sent": <FileCheck className="h-5 w-5" />,
  "Proposal Approved": <CheckSquare className="h-5 w-5" />,
  "Contract Sent": <FileCheck className="h-5 w-5" />,
  "Contract Signed": <CheckSquare className="h-5 w-5" />,
  "Onboarding": <Users className="h-5 w-5" />,
  "Technical Setup": <Zap className="h-5 w-5" />,
  "Training": <BookOpen className="h-5 w-5" />,
  "Go Live": <Zap className="h-5 w-5" />,
  "Payment Processed": <DollarSign className="h-5 w-5" />
};

const convertDefaultStageToProps = (defaultStage: any): LifecycleStageProps => {
  return {
    ...defaultStage,
    icon: stageIcons[defaultStage.name] || <FileCheck className="h-5 w-5" />
  };
};

const Lifecycle = () => {
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [customerStages, setCustomerStages] = useState<LifecycleStageProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [validStaffIds, setValidStaffIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  
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
        
        // First, remove any duplicate customers that might be in the database
        await removeDuplicateCustomers();
        
        console.log("Fetching customers for lifecycle...");
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error("Error fetching customers:", error);
          throw error;
        }

        console.log("Lifecycle - fetched customers:", data);

        if (data && data.length > 0) {
          setCustomerList(data);
          setSelectedCustomer(data[0].id);
        } else {
          console.log("No customers found in the database");
          setCustomerList([]);
        }
      } catch (error) {
        console.error("Error in fetchCustomers:", error);
        toast.error("Failed to load customers");
        setCustomerList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Effect to filter customers when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customerList);
    } else {
      const filtered = customerList.filter(customer => 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customerList]);

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
          return {
            id: stage.id,
            name: stage.name,
            status: stage.status as LifecycleStageProps["status"],
            category: stage.category || "",
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
            icon: stageIcons[stage.name] || <FileCheck className="h-5 w-5" />
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const selectedCustomerData = customerList.find(
    (customer) => customer.id === selectedCustomer
  );

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
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search customers..."
                className="pl-8 pr-4 py-2 w-full"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedCustomer} onValueChange={handleCustomerChange}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {loading ? (
                <SelectItem value="loading" disabled>Loading customers...</SelectItem>
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-results" disabled>No customers found</SelectItem>
              )}
            </SelectContent>
          </Select>
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
