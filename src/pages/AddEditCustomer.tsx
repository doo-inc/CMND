import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Form,
  FormControl,
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
import { ArrowLeft, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { customers } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { CustomerInsert } from "@/types/customers";
import { useQuery } from "@tanstack/react-query";

const STAGE_OPTIONS = [
  "New",
  "Onboarding",
  "Integration",
  "Training",
  "Went Live",
  "Signed",
  "Invoice Sent",
  "Paid",
  "WhatsApp Integration",
  "Instagram Integration",
  "Facebook Integration",
  "Website Integration",
  "Agent Setup",
  "Account Setup",
  "Training Completed"
];

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
  logo: z.any().optional(),
  teamMembers: z.array(z.string()).optional(),
});

const AddEditCustomer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedTeamMembers, setSelectedTeamMembers] = React.useState<string[]>([]);
  
  const getDbCustomerId = () => {
    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
    return id ? `00000000-0000-0000-0000-${id.replace(/\D/g, '').padStart(12, '0')}` : null;
  };
  
  const [customer, setCustomer] = React.useState<any>(null);
  
  const { data: staffMembers = [] } = useQuery({
    queryKey: ['staff-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name');
        
      if (error) {
        console.error("Error fetching staff:", error);
        throw new Error(error.message);
      }
      return data || [];
    }
  });

  // Fetch team members assigned to this customer
  const { data: customerTeamMembers = [] } = useQuery({
    queryKey: ['customer-team-members-ids', id],
    queryFn: async () => {
      if (!id) return [];
      
      const dbCustomerId = getDbCustomerId();
      const { data, error } = await supabase
        .from('customer_team_members')
        .select('staff_id')
        .eq('customer_id', dbCustomerId);
        
      if (error) {
        console.error("Error fetching customer team members:", error);
        return [];
      }
      
      return data?.map(item => item.staff_id) || [];
    },
    enabled: !!id
  });
  
  React.useEffect(() => {
    if (customerTeamMembers.length > 0) {
      setSelectedTeamMembers(customerTeamMembers);
    }
  }, [customerTeamMembers]);
  
  React.useEffect(() => {
    const fetchCustomer = async () => {
      if (isEditing) {
        const dbCustomerId = getDbCustomerId();
        
        try {
          const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', dbCustomerId)
            .single();
          
          if (error) {
            console.error("Error fetching customer:", error);
            const mockCustomer = customers.find(c => c.id === id);
            setCustomer(mockCustomer);
          } else {
            setCustomer({
              ...data,
              contractSize: data.contract_size,
              owner: {
                id: data.owner_id,
                name: "Unknown",
                role: "Unknown"
              }
            });
          }
        } catch (error) {
          console.error("Error in fetch operation:", error);
          const mockCustomer = customers.find(c => c.id === id);
          setCustomer(mockCustomer);
        }
      }
    };
    
    fetchCustomer();
  }, [id, isEditing]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: customer?.name || "",
      segment: customer?.segment || "Enterprise",
      region: customer?.region || "",
      stage: customer?.stage || "Onboarding",
      status: customer?.status || "not-started",
      contractSize: customer?.contractSize || 0,
      ownerId: customer?.owner?.id || "user-001",
      teamMembers: [],
    },
  });
  
  React.useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name || "",
        segment: customer.segment || "Enterprise",
        region: customer.region || "",
        stage: customer.stage || "Onboarding",
        status: customer.status || "not-started",
        contractSize: customer.contractSize || customer.contract_size || 0,
        ownerId: customer.owner?.id || customer.owner_id || "user-001",
        teamMembers: selectedTeamMembers,
      });
      
      if (customer.logo) {
        setLogoPreview(customer.logo);
      }
    }
  }, [customer, form, selectedTeamMembers]);
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        form.setValue("logo", result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleTeamMemberToggle = (staffId: string) => {
    setSelectedTeamMembers(prev => {
      if (prev.includes(staffId)) {
        return prev.filter(id => id !== staffId);
      } else {
        return [...prev, staffId];
      }
    });
    
    form.setValue("teamMembers", selectedTeamMembers);
  };
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
      const customerData: CustomerInsert = {
        name: values.name,
        segment: values.segment,
        region: values.region,
        stage: values.stage,
        status: values.status,
        contract_size: values.contractSize,
        owner_id: values.ownerId,
        logo: values.logo || null
      };
      
      let customerId = id;
      
      if (isEditing) {
        const dbCustomerId = getDbCustomerId();
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', dbCustomerId);
        
        if (error) throw error;
        
        customerId = dbCustomerId;
        
        toast.success("Customer updated successfully");
      } else {
        const { data, error } = await supabase
          .from('customers')
          .insert(customerData)
          .select('id')
          .single();
        
        if (error) throw error;
        
        customerId = data.id;
        
        toast.success("Customer added successfully");
      }
      
      if (customerId) {
        const { error: deleteError } = await supabase
          .from('customer_team_members')
          .delete()
          .eq('customer_id', customerId);
        
        if (deleteError) {
          console.error("Error deleting existing team assignments:", deleteError);
        }
        
        if (selectedTeamMembers.length > 0) {
          const teamAssignments = selectedTeamMembers.map(staffId => ({
            customer_id: customerId,
            staff_id: staffId
          }));
          
          const { error: insertError } = await supabase
            .from('customer_team_members')
            .insert(teamAssignments);
          
          if (insertError) {
            console.error("Error assigning team members:", insertError);
            toast.error("Failed to assign team members");
          }
        }
      }
      
      navigate("/customers");
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error(isEditing ? "Failed to update customer" : "Failed to add customer");
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(isEditing ? `/customers/${id}` : "/customers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{isEditing ? "Edit Customer" : "Add New Customer"}</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Customer Details" : "Enter Customer Details"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex flex-col items-center mb-6">
                  <Avatar className="h-32 w-32 mb-4">
                    <AvatarImage src={logoPreview || ""} alt="Customer logo" />
                    <AvatarFallback className="text-2xl bg-primary/10">
                      {customer?.name ? customer.name.substring(0, 2).toUpperCase() : "CL"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex items-center gap-2">
                    <label htmlFor="logo-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium">
                        <Upload className="h-4 w-4" />
                        Upload Logo
                      </div>
                      <input 
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoChange}
                      />
                    </label>
                    {logoPreview && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setLogoPreview(null);
                          form.setValue("logo", undefined);
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Customer name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="segment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Segment</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select segment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Enterprise">Enterprise</SelectItem>
                            <SelectItem value="Mid-Market">Mid-Market</SelectItem>
                            <SelectItem value="SMB">SMB</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <FormControl>
                          <Input placeholder="Region" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="stage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Stage</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STAGE_OPTIONS.map(stage => (
                              <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="not-started">Not Started</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contractSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Size ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Contract size" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="ownerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select owner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user-001">Ahmed Abdullah (Account Executive)</SelectItem>
                          <SelectItem value="user-002">Fatima Hassan (Customer Success Manager)</SelectItem>
                          <SelectItem value="user-003">Khalid Al-Farsi (Finance Manager)</SelectItem>
                          <SelectItem value="user-004">Mohammed Rahman (Integration Engineer)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4">
                  <FormLabel>Team Members</FormLabel>
                  <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {staffMembers.map(staff => (
                        <div key={staff.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`staff-${staff.id}`}
                            checked={selectedTeamMembers.includes(staff.id)}
                            onChange={() => handleTeamMemberToggle(staff.id)}
                            className="h-4 w-4 rounded"
                          />
                          <label htmlFor={`staff-${staff.id}`} className="flex items-center gap-2 cursor-pointer">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={staff.avatar || `https://avatar.vercel.sh/${staff.name}.png`} alt={staff.name} />
                              <AvatarFallback className="text-xs">{staff.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{staff.name} ({staff.role})</span>
                          </label>
                        </div>
                      ))}
                      
                      {staffMembers.length === 0 && (
                        <p className="text-sm text-muted-foreground">No team members available</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : isEditing ? "Update Customer" : "Add Customer"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AddEditCustomer;
