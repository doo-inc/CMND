import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types/customers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function ProjectManager() {
  const [ongoingCustomers, setOngoingCustomers] = useState<Customer[]>([]);
  const [completedCustomers, setCompletedCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch customers in Implementation stage
  useEffect(() => {
    fetchImplementationCustomers();
  }, [activeTab]);

  const fetchImplementationCustomers = async () => {
    try {
      setLoading(true);

      // Fetch all lifecycle stages
      const { data: allStages, error: stagesError } = await supabase
        .from("lifecycle_stages")
        .select("customer_id, category, status, name");

      if (stagesError) throw stagesError;

      // Group stages by customer
      const customerStages = new Map<string, { category: string; status: string; name: string }[]>();
      (allStages || []).forEach((stage) => {
        if (!customerStages.has(stage.customer_id)) {
          customerStages.set(stage.customer_id, []);
        }
        customerStages.get(stage.customer_id)!.push({
          category: stage.category,
          status: stage.status,
          name: stage.name,
        });
      });

      // Filter customers: completed Pre-Sales & Sales, but NOT completed all Implementation
      const eligibleCustomerIds: string[] = [];
      
      customerStages.forEach((stages, customerId) => {
        const preSalesStages = stages.filter((s) => s.category === "Pre-Sales");
        const salesStages = stages.filter((s) => s.category === "Sales");
        const implementationStages = stages.filter((s) => s.category === "Implementation");
        const goLiveStage = stages.find((s) => s.name === "Go Live");

        const allPreSalesComplete = preSalesStages.length > 0 && 
          preSalesStages.every((s) => s.status === "done" || s.status === "completed");
        
        const allSalesComplete = salesStages.length > 0 && 
          salesStages.every((s) => s.status === "done" || s.status === "completed");
        
        // Check if Go Live is completed - if yes, exclude from Project Manager
        const goLiveCompleted = goLiveStage && 
          (goLiveStage.status === "done" || goLiveStage.status === "completed");
        
        // Has at least one incomplete Implementation stage
        const hasIncompleteImplementation = implementationStages.length > 0 && 
          implementationStages.some((s) => s.status !== "done" && s.status !== "completed");

        if (allPreSalesComplete && allSalesComplete && hasIncompleteImplementation && !goLiveCompleted) {
          eligibleCustomerIds.push(customerId);
        }
      });

      if (eligibleCustomerIds.length === 0) {
        setOngoingCustomers([]);
        setCompletedCustomers([]);
        setSelectedCustomer(null);
        return;
      }

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .in("id", eligibleCustomerIds)
        .order("name");

      if (error) throw error;

      // Split customers into ongoing and completed based on checklist completion
      const ongoing: Customer[] = [];
      const completed: Customer[] = [];

      (data || []).forEach((customer) => {
        const allChecklistsComplete = 
          customer.checklist_platform_integration &&
          customer.checklist_ai_integration &&
          customer.checklist_agent_creation;

        if (allChecklistsComplete) {
          completed.push(customer as Customer);
        } else {
          ongoing.push(customer as Customer);
        }
      });

      setOngoingCustomers(ongoing);
      setCompletedCustomers(completed);
      
      // Set selected customer based on active tab
      if (activeTab === 'ongoing' && ongoing.length > 0) {
        setSelectedCustomer(ongoing[0]);
      } else if (activeTab === 'completed' && completed.length > 0) {
        setSelectedCustomer(completed[0]);
      } else {
        setSelectedCustomer(null);
      }
    } catch (error) {
      console.error("Error fetching implementation customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  // Auto-save field updates with debouncing for text fields
  const updateCustomerField = async (field: string, value: any) => {
    if (!selectedCustomer) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("customers")
        .update({ [field]: value })
        .eq("id", selectedCustomer.id);

      if (error) throw error;

      // Update local state
      const updatedCustomer = { ...selectedCustomer, [field]: value };
      setSelectedCustomer(updatedCustomer);
      setOngoingCustomers(
        ongoingCustomers.map((c) =>
          c.id === selectedCustomer.id ? updatedCustomer : c
        )
      );
      setCompletedCustomers(
        completedCustomers.map((c) =>
          c.id === selectedCustomer.id ? updatedCustomer : c
        )
      );

      toast.success("Updated successfully");
      
      // Re-fetch to move customer between tabs if needed
      await fetchImplementationCustomers();
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  // Debounced update for text fields
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const debouncedUpdate = (field: string, value: string) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    
    const timer = setTimeout(() => {
      updateCustomerField(field, value);
    }, 500);
    
    setDebounceTimer(timer);
  };

  const currentCustomers = activeTab === 'ongoing' ? ongoingCustomers : completedCustomers;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[600px]" />
            <Skeleton className="h-[600px] lg:col-span-2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Project Manager
          </h1>
          <p className="text-muted-foreground mt-2">Manage Implementation Stage Customers</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ongoing' | 'completed')}>
          <TabsList>
            <TabsTrigger value="ongoing" className="gap-2">
              Ongoing
              <Badge variant="secondary">{ongoingCustomers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              Completed
              <Badge variant="secondary">{completedCustomers.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Ongoing Tab */}
          <TabsContent value="ongoing" className="mt-6">
            {ongoingCustomers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <ClipboardCheck className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Implementations</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Customers will appear here when they reach the Implementation stage
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel - Customer List */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-lg">Implementation Customers</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-2 p-4">
                        {ongoingCustomers.map((customer) => (
                          <Card
                            key={customer.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              selectedCustomer?.id === customer.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <CardContent className="p-4 flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={customer.logo || undefined} alt={customer.name} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {customer.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">{customer.name}</h4>
                                <p className="text-xs text-muted-foreground truncate">
                                  {customer.project_manager || "No PM assigned"}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Right Panel - Customer Details */}
                {selectedCustomer && (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={selectedCustomer.logo || undefined} alt={selectedCustomer.name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-lg">
                            {selectedCustomer.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-xl">{selectedCustomer.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">Implementation Details</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Project Manager Field */}
                      <div className="space-y-2">
                        <Label htmlFor="project-manager">Project Manager</Label>
                        <Input
                          id="project-manager"
                          placeholder="Enter project manager name"
                          defaultValue={selectedCustomer.project_manager || ""}
                          onBlur={(e) => updateCustomerField("project_manager", e.target.value)}
                          onChange={(e) => {
                            const updatedCustomer = { ...selectedCustomer, project_manager: e.target.value };
                            setSelectedCustomer(updatedCustomer);
                          }}
                          maxLength={100}
                          disabled={saving}
                          className="max-w-md"
                        />
                      </div>

                      {/* Implementation Checklists */}
                      <div className="space-y-4">
                        <Label className="text-base font-semibold">Implementation Checklist</Label>
                        <div className="space-y-3 pl-2">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id="platform-integration"
                              checked={selectedCustomer.checklist_platform_integration || false}
                              onCheckedChange={(checked) =>
                                updateCustomerField("checklist_platform_integration", checked)
                              }
                              disabled={saving}
                            />
                            <Label
                              htmlFor="platform-integration"
                              className="text-sm font-normal cursor-pointer"
                            >
                              Platform Integration
                            </Label>
                          </div>

                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id="ai-integration"
                              checked={selectedCustomer.checklist_ai_integration || false}
                              onCheckedChange={(checked) =>
                                updateCustomerField("checklist_ai_integration", checked)
                              }
                              disabled={saving}
                            />
                            <Label
                              htmlFor="ai-integration"
                              className="text-sm font-normal cursor-pointer"
                            >
                              AI Integration
                            </Label>
                          </div>

                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id="agent-creation"
                              checked={selectedCustomer.checklist_agent_creation || false}
                              onCheckedChange={(checked) =>
                                updateCustomerField("checklist_agent_creation", checked)
                              }
                              disabled={saving}
                            />
                            <Label
                              htmlFor="agent-creation"
                              className="text-sm font-normal cursor-pointer"
                            >
                              AI Agent Creation
                            </Label>
                          </div>
                        </div>
                      </div>

                      {/* Implementation Notes */}
                      <div className="space-y-2">
                        <Label htmlFor="implementation-notes">Implementation Notes</Label>
                        <Textarea
                          id="implementation-notes"
                          placeholder="Add notes about the implementation process..."
                          defaultValue={selectedCustomer.implementation_notes || ""}
                          onChange={(e) => {
                            const updatedCustomer = { ...selectedCustomer, implementation_notes: e.target.value };
                            setSelectedCustomer(updatedCustomer);
                            debouncedUpdate("implementation_notes", e.target.value);
                          }}
                          rows={6}
                          maxLength={5000}
                          disabled={saving}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          {selectedCustomer.implementation_notes?.length || 0} / 5000 characters
                        </p>
                      </div>

                      {saving && (
                        <p className="text-xs text-muted-foreground animate-pulse">Saving...</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Completed Tab */}
          <TabsContent value="completed" className="mt-6">
            {completedCustomers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <ClipboardCheck className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Completed Implementations</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Customers will appear here when all implementation checklists are completed
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel - Customer List */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-lg">Completed Implementations</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-2 p-4">
                        {completedCustomers.map((customer) => (
                          <Card
                            key={customer.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              selectedCustomer?.id === customer.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <CardContent className="p-4 flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={customer.logo || undefined} alt={customer.name} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {customer.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">{customer.name}</h4>
                                <p className="text-xs text-muted-foreground truncate">
                                  {customer.project_manager || "No PM assigned"}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Right Panel - Customer Details */}
                {selectedCustomer && (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={selectedCustomer.logo || undefined} alt={selectedCustomer.name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-lg">
                            {selectedCustomer.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-xl">{selectedCustomer.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">Implementation Details</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Project Manager Field */}
                      <div className="space-y-2">
                        <Label htmlFor="project-manager-completed">Project Manager</Label>
                        <Input
                          id="project-manager-completed"
                          placeholder="Enter project manager name"
                          defaultValue={selectedCustomer.project_manager || ""}
                          onBlur={(e) => updateCustomerField("project_manager", e.target.value)}
                          onChange={(e) => {
                            const updatedCustomer = { ...selectedCustomer, project_manager: e.target.value };
                            setSelectedCustomer(updatedCustomer);
                          }}
                          maxLength={100}
                          disabled={saving}
                          className="max-w-md"
                        />
                      </div>

                      {/* Implementation Checklists */}
                      <div className="space-y-4">
                        <Label className="text-base font-semibold">Implementation Checklist</Label>
                        <div className="space-y-3 pl-2">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id="platform-integration-completed"
                              checked={selectedCustomer.checklist_platform_integration || false}
                              onCheckedChange={(checked) =>
                                updateCustomerField("checklist_platform_integration", checked)
                              }
                              disabled={saving}
                            />
                            <Label
                              htmlFor="platform-integration-completed"
                              className="text-sm font-normal cursor-pointer"
                            >
                              Platform Integration
                            </Label>
                          </div>

                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id="ai-integration-completed"
                              checked={selectedCustomer.checklist_ai_integration || false}
                              onCheckedChange={(checked) =>
                                updateCustomerField("checklist_ai_integration", checked)
                              }
                              disabled={saving}
                            />
                            <Label
                              htmlFor="ai-integration-completed"
                              className="text-sm font-normal cursor-pointer"
                            >
                              AI Integration
                            </Label>
                          </div>

                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id="agent-creation-completed"
                              checked={selectedCustomer.checklist_agent_creation || false}
                              onCheckedChange={(checked) =>
                                updateCustomerField("checklist_agent_creation", checked)
                              }
                              disabled={saving}
                            />
                            <Label
                              htmlFor="agent-creation-completed"
                              className="text-sm font-normal cursor-pointer"
                            >
                              AI Agent Creation
                            </Label>
                          </div>
                        </div>
                      </div>

                      {/* Implementation Notes */}
                      <div className="space-y-2">
                        <Label htmlFor="implementation-notes-completed">Implementation Notes</Label>
                        <Textarea
                          id="implementation-notes-completed"
                          placeholder="Add notes about the implementation process..."
                          defaultValue={selectedCustomer.implementation_notes || ""}
                          onChange={(e) => {
                            const updatedCustomer = { ...selectedCustomer, implementation_notes: e.target.value };
                            setSelectedCustomer(updatedCustomer);
                            debouncedUpdate("implementation_notes", e.target.value);
                          }}
                          rows={6}
                          maxLength={5000}
                          disabled={saving}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          {selectedCustomer.implementation_notes?.length || 0} / 5000 characters
                        </p>
                      </div>

                      {saving && (
                        <p className="text-xs text-muted-foreground animate-pulse">Saving...</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
