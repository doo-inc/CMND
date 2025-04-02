
import React from "react";
import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CustomerCard } from "@/components/customers/CustomerCard";
import { LifecycleTracker } from "@/components/lifecycle/LifecycleTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCustomerId } from "@/utils/customerUtils";
import { CustomerTeamMembers } from "@/components/customers/CustomerTeamMembers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const getDbCustomerId = () => {
    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
    return id ? `00000000-0000-0000-0000-${id.replace(/\D/g, '').padStart(12, '0')}` : null;
  };

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

  // Mock customer data for demonstration with proper typing
  const customer = {
    id: id || "customer-001",
    name: "Acme Corp",
    logo: "https://www.svgrepo.com/show/509642/acme.svg",
    segment: "Enterprise",
    region: "North America",
    stage: "Onboarding",
    status: "in-progress" as "not-started" | "in-progress" | "done" | "blocked",
    contractSize: 50000,
    owner: {
      id: "user-001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  };

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
        
        <CustomerCard customer={customer} isDetailed={true} />
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
            <Button variant="outline" size="sm" onClick={() => navigate(`/contracts?customerId=${id}`)}>
              View All Contracts
            </Button>
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
                      <Badge variant={contract.status === 'active' ? 'success' : 'outline'}>
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
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No contract details available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDetails;
