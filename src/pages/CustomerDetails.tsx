
import React from "react";
import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CustomerCard } from "@/components/customers/CustomerCard";
import { LifecycleTracker } from "@/components/lifecycle/LifecycleTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCustomerId, findCustomerById } from "@/utils/customerUtils";
import { CustomerTeamMembers } from "@/components/customers/CustomerTeamMembers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Customer } from "@/types/customers";

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const getDbCustomerId = () => {
    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
    return id ? `00000000-0000-0000-0000-${id.replace(/\D/g, '').padStart(12, '0')}` : null;
  };

  // Query to fetch real customer data
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer-details', getDbCustomerId()],
    queryFn: async () => {
      const dbCustomerId = getDbCustomerId();
      if (!dbCustomerId) {
        toast.error("Invalid customer ID");
        return null;
      }
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', dbCustomerId)
        .single();
        
      if (error) {
        console.error("Error fetching customer:", error);
        if (error.code === 'PGRST116') {
          // Try to find customer by ID using the utility function
          return await findCustomerById(id || '');
        }
        toast.error("Error loading customer details");
        return null;
      }
      
      return data;
    },
    enabled: !!id
  });

  // Query to fetch contracts for this customer
  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['customer-contracts', getDbCustomerId()],
    queryFn: async () => {
      const dbCustomerId = getDbCustomerId();
      if (!dbCustomerId) return [];
      
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('customer_id', dbCustomerId);
        
      if (error) {
        console.error("Error fetching contracts:", error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!getDbCustomerId()
  });

  // Convert Supabase customer data to CustomerData format for CustomerCard
  const customerCardData = React.useMemo(() => {
    if (!customer) return null;
    
    return {
      id: customer.id,
      name: customer.name,
      logo: customer.logo || undefined,
      segment: customer.segment || "Unknown Segment",
      region: customer.region || "Unknown Region",
      stage: customer.stage || "New",
      status: (customer.status as "not-started" | "in-progress" | "done" | "blocked") || "not-started",
      contractSize: customer.contract_size || 0,
      owner: {
        id: customer.owner_id || "unknown",
        name: "Account Manager", // We'll fetch real owner data in a separate query in a future update
        role: "Sales"
      }
    };
  }, [customer]);

  const handleAddContract = () => {
    navigate(`/contracts?customerId=${id}&action=new`);
  };

  if (customerLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-60 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-60 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer || !customerCardData) {
    return (
      <DashboardLayout>
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold mb-2">Customer Not Found</h2>
          <p className="text-muted-foreground mb-6">The customer you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/customers')}>
            Back to Customers
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Customer Details</h1>
          <Button variant="outline" onClick={() => navigate(`/customers/${id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Customer
          </Button>
        </div>
        
        <CustomerCard customer={customerCardData} isDetailed={true} />
        <CustomerTeamMembers customerId={getDbCustomerId()} />
        
        <LifecycleTracker 
          customerId={getDbCustomerId()}
          customerName={customer.name}
          stages={[]}
        />
        
        <Card className="w-full glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Contract Details
            </CardTitle>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/contracts?customerId=${id}`)}>
                View All
              </Button>
              <Button size="sm" onClick={handleAddContract}>
                <Plus className="h-4 w-4 mr-1" /> Add Contract
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {contractsLoading ? (
              <div className="animate-pulse text-center py-4">Loading contracts...</div>
            ) : contracts.length > 0 ? (
              <div className="divide-y">
                {contracts.map((contract) => (
                  <div key={contract.id} className="py-3">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-medium">{contract.name}</h3>
                      <Badge variant={contract.status === 'active' ? 'default' : 'outline'} 
                             className={contract.status === 'active' ? "bg-green-500 hover:bg-green-600" : ""}>
                        {contract.status || 'Draft'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Value:</span>{" "}
                        ${contract.value?.toLocaleString()}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Start:</span>{" "}
                        {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : 'N/A'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">End:</span>{" "}
                        {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate(`/contracts?customerId=${id}&contractId=${contract.id}&action=edit`)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No contracts available for this customer.</p>
                <Button onClick={handleAddContract} variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Add First Contract
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDetails;
