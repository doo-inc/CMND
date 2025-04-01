
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
});

const AddEditCustomer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  
  const customer = isEditing ? customers.find(c => c.id === id) : null;
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: customer?.name || "",
      segment: customer?.segment || "Enterprise",
      region: customer?.region || "",
      stage: customer?.stage || "Onboarding",
      status: customer?.status || "not-started",
      contractSize: customer?.contractSize || 0,
      ownerId: customer?.owner.id || "user-001",
    },
  });
  
  React.useEffect(() => {
    if (customer?.logo) {
      setLogoPreview(customer.logo);
    }
  }, [customer]);
  
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
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    // In a real app, you would save this data to your backend
    console.log(values);
    
    // Simulate an API call
    setTimeout(() => {
      toast.success(isEditing ? "Customer updated successfully" : "Customer added successfully");
      navigate("/customers");
    }, 500);
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
                        <FormControl>
                          <Input placeholder="Current stage" {...field} />
                        </FormControl>
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
                
                <div className="flex justify-end">
                  <Button type="submit">{isEditing ? "Update Customer" : "Add Customer"}</Button>
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
