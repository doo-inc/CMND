
import React from "react";
import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CustomerCard } from "@/components/customers/CustomerCard";
import { LifecycleTracker } from "@/components/lifecycle/LifecycleTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, FileText, Plus, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCustomerId, findCustomerById } from "@/utils/customerUtils";
import { CustomerTeamMembers } from "@/components/customers/CustomerTeamMembers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Customer } from "@/types/customers";
import { CustomerReferrals } from "@/components/customers/CustomerReferrals";
import { AddContractDialog } from "@/components/contracts/AddContractDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerFeedback } from "@/components/customers/CustomerFeedback";

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const getDbCustomerId = () => {
    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
    return id ? `00000000-0000-0000-0000-${id.replace(/\D/g, '').padStart(12, '0')}` : null;
  };

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
          return await findCustomerById(id || '');
        }
        toast.error("Error loading customer details");
        return null;
      }
      
      return data;
    },
    enabled: !!id
  });

  const { data: contracts = [], isLoading: contractsLoading, refetch: refetchContracts } = useQuery({
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
      contractSize: (customer as Customer).contract_size || 0,
      owner: {
        id: (customer as Customer).owner_id || "unknown",
        name: "Account Manager",
        role: "Sales"
      },
      lifecyclePercentage: 65 // Example percentage, will be calculated dynamically
    };
  }, [customer]);

  const handleContractSuccess = () => {
    refetchContracts();
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
        
        <Tabs defaultValue="team" className="w-full">
          <TabsList className="mb-4 w-full justify-start">
            <TabsTrigger value="team">Team Members</TabsTrigger>
            <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>
          
          <TabsContent value="team" className="space-y-4">
            <CustomerTeamMembers customerId={getDbCustomerId()} />
          </TabsContent>
          
          <TabsContent value="lifecycle" className="space-y-4">
            <LifecycleTracker 
              customerId={getDbCustomerId()}
              customerName={customer?.name}
              stages={[]}
            />
          </TabsContent>
          
          <TabsContent value="referrals" className="space-y-4">
            <CustomerReferrals customerId={getDbCustomerId()} />
          </TabsContent>
          
          <TabsContent value="contracts" className="space-y-4">
            <Card className="w-full glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-doo-purple-500" />
                  Contracts
                </CardTitle>
                <div className="space-x-2">
                  <AddContractDialog 
                    customerId={getDbCustomerId()} 
                    onSuccess={handleContractSuccess} 
                  />
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
                          <AddContractDialog
                            customerId={getDbCustomerId()}
                            contract={contract}
                            isEditing={true}
                            onSuccess={handleContractSuccess}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No contracts available for this customer.</p>
                    <AddContractDialog 
                      customerId={getDbCustomerId()} 
                      onSuccess={handleContractSuccess}
                      trigger={
                        <Button variant="outline">
                          <Plus className="h-4 w-4 mr-1" /> Add First Contract
                        </Button>
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="feedback" className="space-y-4">
            <CustomerFeedback customerId={getDbCustomerId()} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDetails;
