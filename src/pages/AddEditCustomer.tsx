
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { customers } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { CustomerInsert } from "@/types/customers";
import { useQuery } from "@tanstack/react-query";
import { CustomerForm, CustomerFormData } from "@/components/customers/CustomerForm";

const AddEditCustomer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const getDbCustomerId = () => {
    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
    return id ? `00000000-0000-0000-0000-${id.replace(/\D/g, '').padStart(12, '0')}` : null;
  };
  
  const [customer, setCustomer] = React.useState<any>(null);
  
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
            // Convert database dates to Date objects
            const customerData = {
              ...data,
              contractSize: data.contract_size,
              contract_size: data.contract_size,
              setup_fee: data.setup_fee || 0,
              annual_rate: data.annual_rate || 0,
              go_live_date: data.go_live_date ? new Date(data.go_live_date) : undefined,
              subscription_end_date: data.subscription_end_date ? new Date(data.subscription_end_date) : undefined,
              owner: {
                id: data.owner_id,
                name: "Unknown",
                role: "Unknown"
              }
            };
            setCustomer(customerData);
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
  
  async function onSubmit(values: CustomerFormData) {
    setIsSubmitting(true);
    
    try {
      const customerData: CustomerInsert = {
        name: values.name,
        segment: values.segment,
        country: values.country,
        stage: "New",
        status: "not-started",
        contract_size: values.contract_size || 0,
        setup_fee: values.setup_fee || 0,
        annual_rate: values.annual_rate || 0,
        go_live_date: values.go_live_date ? values.go_live_date.toISOString().split('T')[0] : null,
        subscription_end_date: values.subscription_end_date ? values.subscription_end_date.toISOString().split('T')[0] : null,
        owner_id: "user-001", // Default owner
        industry: values.industry || null,
        logo: values.logo || null,
        contact_name: values.contact_name || null,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        description: values.description || null,
      };
      
      if (isEditing) {
        const dbCustomerId = getDbCustomerId();
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', dbCustomerId);
        
        if (error) throw error;
        
        toast.success("Customer updated successfully");
      } else {
        const { data, error } = await supabase
          .from('customers')
          .insert(customerData)
          .select('id')
          .single();
        
        if (error) throw error;
        
        toast.success("Customer added successfully");
      }
      
      navigate("/customers");
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error(isEditing ? "Failed to update customer" : "Failed to add customer");
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Prepare initial data for the form
  const initialData: Partial<CustomerFormData> = customer ? {
    name: customer.name || "",
    segment: customer.segment || "Enterprise",
    country: customer.country || "",
    industry: customer.industry || "",
    contract_size: customer.contract_size || 0,
    setup_fee: customer.setup_fee || 0,
    annual_rate: customer.annual_rate || 0,
    go_live_date: customer.go_live_date,
    subscription_end_date: customer.subscription_end_date,
    description: customer.description || "",
    logo: customer.logo || "",
    contact_name: customer.contact_name || "",
    contact_email: customer.contact_email || "",
    contact_phone: customer.contact_phone || "",
  } : {};
  
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
            <CustomerForm
              initialData={initialData}
              onSubmit={onSubmit}
              isSubmitting={isSubmitting}
              submitLabel={isEditing ? "Update Customer" : "Add Customer"}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AddEditCustomer;
