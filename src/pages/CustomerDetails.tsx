
import React from "react";
import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CustomerCard } from "@/components/customers/CustomerCard";
import { LifecycleTracker } from "@/components/lifecycle/LifecycleTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCustomerId } from "@/utils/customerUtils";
import { CustomerTeamMembers } from "@/components/customers/CustomerTeamMembers";

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const getDbCustomerId = () => {
    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
    return id ? `00000000-0000-0000-0000-${id.replace(/\D/g, '').padStart(12, '0')}` : null;
  };

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
          <Button variant="outline" onClick={() => navigate(`/customers/edit/${id}`)}>
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
          <CardHeader>
            <CardTitle>Contract Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No contract details available.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDetails;
