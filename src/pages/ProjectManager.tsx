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
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function ProjectManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch customers in Implementation stage
  useEffect(() => {
    fetchImplementationCustomers();
  }, []);

  const fetchImplementationCustomers = async () => {
    try {
      setLoading(true);

      // Fetch all lifecycle stages
      const { data: allStages, error: stagesError } = await supabase
        .from("lifecycle_stages")
        .select("customer_id, category, status");

      if (stagesError) throw stagesError;

      // Group stages by customer
      const customerStages = new Map<string, { category: string; status: string }[]>();
      (allStages || []).forEach((stage) => {
        if (!customerStages.has(stage.customer_id)) {
          customerStages.set(stage.customer_id, []);
        }
        customerStages.get(stage.customer_id)!.push({
          category: stage.category,
          status: stage.status,
        });
      });

      // Filter customers: completed Pre-Sales & Sales, incomplete Implementation
      const eligibleCustomerIds: string[] = [];
      
      customerStages.forEach((stages, customerId) => {
        const preSalesStages = stages.filter((s) => s.category === "Pre-Sales");
        const salesStages = stages.filter((s) => s.category === "Sales");
        const implementationStages = stages.filter((s) => s.category === "Implementation");

        const allPreSalesComplete = preSalesStages.length > 0 && 
          preSalesStages.every((s) => s.status === "done" || s.status === "completed");
        
        const allSalesComplete = salesStages.length > 0 && 
          salesStages.every((s) => s.status === "done" || s.status === "completed");
        
        const hasIncompleteImplementation = implementationStages.length > 0 && 
          implementationStages.some((s) => s.status !== "done" && s.status !== "completed");

        if (allPreSalesComplete && allSalesComplete && hasIncompleteImplementation) {
          eligibleCustomerIds.push(customerId);
        }
      });

      if (eligibleCustomerIds.length === 0) {
        setCustomers([]);
        setSelectedCustomer(null);
        return;
      }

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .in("id", eligibleCustomerIds)
        .order("name");

      if (error) throw error;

      setCustomers((data || []) as Customer[]);
      if (data && data.length > 0 && !selectedCustomer) {
        setSelectedCustomer(data[0] as Customer);
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
      setSelectedCustomer({ ...selectedCustomer, [field]: value });
      setCustomers(
        customers.map((c) =>
          c.id === selectedCustomer.id ? { ...c, [field]: value } : c
        )
      );

      toast.success("Updated successfully");
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

  if (customers.length === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Project Manager
            </h1>
            <p className="text-muted-foreground mt-2">Manage Implementation Stage Customers</p>
          </div>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ClipboardCheck className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Implementations</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Customers will appear here when they reach the Implementation stage
              </p>
            </CardContent>
          </Card>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Customer List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Implementation Customers</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="space-y-2 p-4">
                  {customers.map((customer) => (
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
      </div>
    </DashboardLayout>
  );
}
