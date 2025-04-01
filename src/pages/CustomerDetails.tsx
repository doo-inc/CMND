
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  User, 
  Building, 
  MapPin,
  DollarSign,
  Activity,
  Edit
} from "lucide-react";
import { customers } from "@/data/mockData";
import { CustomerOwner, CustomerData } from "@/components/customers/CustomerCard";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Customer name must be at least 2 characters.",
  }),
  segment: z.string(),
  region: z.string(),
  stage: z.string(),
  status: z.enum(["not-started", "in-progress", "done", "blocked"]),
  contractSize: z.coerce.number().min(0),
  ownerId: z.string(),
});

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const customer = customers.find(c => c.id === id);
  
  if (!customer) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <h2 className="text-2xl font-bold mb-4">Customer Not Found</h2>
          <Button onClick={() => navigate("/customers")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/customers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
        </div>
        
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Customer Information</CardTitle>
                    <CardDescription>View and manage customer details</CardDescription>
                  </div>
                  <Button onClick={() => navigate(`/customers/${id}/edit`)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Details
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={customer.logo} alt={customer.name} />
                      <AvatarFallback className="text-xl bg-primary/10">
                        {getInitials(customer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-xl font-bold">{customer.name}</h2>
                      <p className="text-muted-foreground">{customer.segment} · {customer.region}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Segment</h3>
                        <p className="text-base">{customer.segment}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Region</h3>
                        <p className="text-base">{customer.region}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Current Stage</h3>
                        <p className="text-base">{customer.stage}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                        <div className="mt-1">
                          <span className={`status-badge status-${customer.status}`}>
                            {customer.status.replace("-", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Contract Size</h3>
                        <p className="text-base">${customer.contractSize.toLocaleString()}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Owner</h3>
                        <div className="flex items-center mt-1">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          <p className="text-base">{customer.owner.name} ({customer.owner.role})</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm font-medium">Customer Since</span>
                        </div>
                        <span>Jan 2023</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm font-medium">Annual Value</span>
                        </div>
                        <span>${(customer.contractSize / 12).toLocaleString()} / mo</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm font-medium">Health Score</span>
                        </div>
                        <span className="text-green-600 font-medium">Good</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="border-l-2 border-primary pl-4 py-2">
                        <p className="text-sm font-medium">Demo Completed</p>
                        <p className="text-xs text-muted-foreground">2 days ago</p>
                      </div>
                      
                      <div className="border-l-2 border-primary pl-4 py-2">
                        <p className="text-sm font-medium">Proposal Sent</p>
                        <p className="text-xs text-muted-foreground">1 week ago</p>
                      </div>
                      
                      <div className="border-l-2 border-primary pl-4 py-2">
                        <p className="text-sm font-medium">Initial Contact</p>
                        <p className="text-xs text-muted-foreground">2 weeks ago</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Customer Activity</CardTitle>
                <CardDescription>View all customer interactions and events</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center py-8 text-muted-foreground">Activity timeline for this customer will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Documents & Contracts</CardTitle>
                <CardDescription>View and manage customer documents</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center py-8 text-muted-foreground">Document management for this customer will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDetails;
