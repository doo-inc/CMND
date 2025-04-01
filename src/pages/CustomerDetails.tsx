
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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  User, 
  Building, 
  MapPin,
  DollarSign,
  Activity,
  Edit,
  Plus,
  Info,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare
} from "lucide-react";
import { customers } from "@/data/mockData";
import { CustomerOwner, CustomerData } from "@/components/customers/CustomerCard";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type CustomerAgent = {
  id: string;
  name: string;
  role: string;
  email: string;
  instructions?: string;
}

type RenewalActivity = {
  id: string;
  date: string;
  action: string;
  paymentStatus: 'invoice-issued' | 'paid' | 'not-paid' | 'disputed';
  amount: number;
  notes?: string;
}

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

const agentFormSchema = z.object({
  name: z.string().min(2, {
    message: "Agent name must be at least 2 characters.",
  }),
  role: z.string().min(2, {
    message: "Agent role must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  instructions: z.string().optional(),
});

const renewalFormSchema = z.object({
  date: z.string(),
  action: z.string().min(2, {
    message: "Action must be at least 2 characters.",
  }),
  paymentStatus: z.enum(["invoice-issued", "paid", "not-paid", "disputed"]),
  amount: z.coerce.number().min(0),
  notes: z.string().optional(),
});

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const customer = customers.find(c => c.id === id);
  
  // Sample customer agents and renewal activities
  const [agents, setAgents] = useState<CustomerAgent[]>([
    { id: "agent-1", name: "Sarah Johnson", role: "Technical Account Manager", email: "sarah.j@example.com", instructions: "Weekly check-ins, prioritize API integration issues" },
    { id: "agent-2", name: "Mohammed Al-Farsi", role: "Customer Success Specialist", email: "m.alfarsi@example.com" }
  ]);
  
  const [renewalActivities, setRenewalActivities] = useState<RenewalActivity[]>([
    { id: "renewal-1", date: "2023-08-15", action: "Annual Renewal", paymentStatus: "paid", amount: 15000 },
    { id: "renewal-2", date: "2024-08-15", action: "Upcoming Renewal", paymentStatus: "invoice-issued", amount: 16500, notes: "10% increase applied per contract terms" }
  ]);
  
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [isRenewalDialogOpen, setIsRenewalDialogOpen] = useState(false);
  
  const agentForm = useForm<z.infer<typeof agentFormSchema>>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      role: "",
      email: "",
      instructions: "",
    },
  });
  
  const renewalForm = useForm<z.infer<typeof renewalFormSchema>>({
    resolver: zodResolver(renewalFormSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      action: "",
      paymentStatus: "invoice-issued",
      amount: 0,
      notes: "",
    },
  });
  
  const handleAddAgent = (data: z.infer<typeof agentFormSchema>) => {
    const newAgent: CustomerAgent = {
      id: `agent-${Date.now()}`,
      name: data.name,
      role: data.role,
      email: data.email,
      instructions: data.instructions,
    };
    
    setAgents([...agents, newAgent]);
    agentForm.reset();
    setIsAgentDialogOpen(false);
    toast.success("Customer agent added successfully");
  };
  
  const handleAddRenewal = (data: z.infer<typeof renewalFormSchema>) => {
    const newRenewal: RenewalActivity = {
      id: `renewal-${Date.now()}`,
      date: data.date,
      action: data.action,
      paymentStatus: data.paymentStatus as RenewalActivity['paymentStatus'],
      amount: data.amount,
      notes: data.notes,
    };
    
    setRenewalActivities([...renewalActivities, newRenewal]);
    renewalForm.reset();
    setIsRenewalDialogOpen(false);
    toast.success("Renewal activity added successfully");
  };
  
  const handleUpdatePaymentStatus = (renewalId: string, status: RenewalActivity['paymentStatus']) => {
    const updatedRenewals = renewalActivities.map(renewal => {
      if (renewal.id === renewalId) {
        return {
          ...renewal,
          paymentStatus: status
        };
      }
      return renewal;
    });
    
    setRenewalActivities(updatedRenewals);
    toast.success(`Payment status updated to ${status.replace('-', ' ')}`);
  };
  
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
  
  const getPaymentStatusBadge = (status: RenewalActivity['paymentStatus']) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Paid</Badge>;
      case 'invoice-issued':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 flex items-center gap-1"><CreditCard className="h-3 w-3" /> Invoice Issued</Badge>;
      case 'not-paid':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1"><XCircle className="h-3 w-3" /> Not Paid</Badge>;
      case 'disputed':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Disputed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
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
            <TabsTrigger value="agents">Customer Agents</TabsTrigger>
            <TabsTrigger value="renewals">Renewal Activity</TabsTrigger>
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
          
          <TabsContent value="agents">
            <Card className="glass-card animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Customer Agents</CardTitle>
                  <CardDescription>Manage agents assigned to this customer</CardDescription>
                </div>
                <Dialog open={isAgentDialogOpen} onOpenChange={setIsAgentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="glass-button">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Agent
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-dialog">
                    <DialogHeader>
                      <DialogTitle>Add Customer Agent</DialogTitle>
                      <DialogDescription>
                        Add a new agent to manage this customer.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...agentForm}>
                      <form onSubmit={agentForm.handleSubmit(handleAddAgent)} className="space-y-4">
                        <FormField
                          control={agentForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Agent Name</FormLabel>
                              <FormControl>
                                <Input {...field} className="glass-input" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={agentForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <FormControl>
                                <Input {...field} className="glass-input" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={agentForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input {...field} className="glass-input" type="email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={agentForm.control}
                          name="instructions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>System Instructions (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  className="glass-input min-h-[100px]" 
                                  placeholder="Add any specific instructions for this agent"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit">Add Agent</Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {agents.length > 0 ? (
                  <div className="space-y-6">
                    {agents.map((agent, index) => (
                      <div 
                        key={agent.id} 
                        className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-all duration-300 animate-slide-in bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-secondary/10 text-secondary">
                                {getInitials(agent.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium">{agent.name}</h3>
                              <p className="text-sm text-muted-foreground">{agent.role}</p>
                              <p className="text-sm text-muted-foreground">{agent.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Contact
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                        
                        {agent.instructions && (
                          <div className="mt-4 p-3 bg-muted rounded-md flex items-start gap-2">
                            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <p className="text-sm">{agent.instructions}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <User className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Agents Assigned</h3>
                    <p className="text-muted-foreground mb-6">This customer doesn't have any agents assigned yet.</p>
                    <Button 
                      onClick={() => setIsAgentDialogOpen(true)}
                      className="glass-button"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Agent
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="renewals">
            <Card className="glass-card animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Renewal Activity</CardTitle>
                  <CardDescription>Track renewal activities and payment status</CardDescription>
                </div>
                <Dialog open={isRenewalDialogOpen} onOpenChange={setIsRenewalDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="glass-button">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Activity
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-dialog">
                    <DialogHeader>
                      <DialogTitle>Add Renewal Activity</DialogTitle>
                      <DialogDescription>
                        Record a renewal activity for this customer.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...renewalForm}>
                      <form onSubmit={renewalForm.handleSubmit(handleAddRenewal)} className="space-y-4">
                        <FormField
                          control={renewalForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input {...field} className="glass-input" type="date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={renewalForm.control}
                          name="action"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Action</FormLabel>
                              <FormControl>
                                <Input {...field} className="glass-input" placeholder="e.g., Annual Renewal, Quarterly Review" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={renewalForm.control}
                          name="paymentStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Status</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(value as RenewalActivity['paymentStatus'])} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="glass-input">
                                    <SelectValue placeholder="Select payment status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="glass-dropdown">
                                  <SelectItem value="invoice-issued">Invoice Issued</SelectItem>
                                  <SelectItem value="paid">Paid</SelectItem>
                                  <SelectItem value="not-paid">Not Paid</SelectItem>
                                  <SelectItem value="disputed">Disputed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={renewalForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    {...field} 
                                    className="glass-input pl-9" 
                                    type="number"
                                    min="0"
                                    step="0.01" 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={renewalForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  className="glass-input" 
                                  placeholder="Additional notes"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit">Add Activity</Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {renewalActivities.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payment Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {renewalActivities.map((renewal) => (
                          <TableRow key={renewal.id} className="animate-fade-in">
                            <TableCell>{new Date(renewal.date).toLocaleDateString()}</TableCell>
                            <TableCell>{renewal.action}</TableCell>
                            <TableCell>${renewal.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              {getPaymentStatusBadge(renewal.paymentStatus)}
                            </TableCell>
                            <TableCell>
                              <Select 
                                onValueChange={(value) => 
                                  handleUpdatePaymentStatus(renewal.id, value as RenewalActivity['paymentStatus'])
                                }
                                defaultValue={renewal.paymentStatus}
                              >
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue placeholder="Update status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="invoice-issued">Invoice Issued</SelectItem>
                                  <SelectItem value="paid">Paid</SelectItem>
                                  <SelectItem value="not-paid">Not Paid</SelectItem>
                                  <SelectItem value="disputed">Disputed</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Renewal Activities</h3>
                    <p className="text-muted-foreground mb-6">No renewal activities have been recorded yet.</p>
                    <Button 
                      onClick={() => setIsRenewalDialogOpen(true)}
                      className="glass-button"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Activity
                    </Button>
                  </div>
                )}
                
                {renewalActivities.length > 0 && renewalActivities.some(r => r.notes) && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-3">Activity Notes</h3>
                    <div className="space-y-3">
                      {renewalActivities.filter(r => r.notes).map((renewal) => (
                        <div key={`note-${renewal.id}`} className="p-3 bg-muted rounded-md">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">{renewal.action}</span>
                            <span className="text-xs text-muted-foreground">{new Date(renewal.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm">{renewal.notes}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
