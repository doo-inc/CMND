
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CustomerForm, type CustomerFormData } from "@/components/customers/CustomerForm";
import { Contract } from "@/components/customers/ContractsList";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AddEditCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [initialData, setInitialData] = useState<Partial<CustomerFormData> | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const loadCustomer = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error loading customer:', error);
          toast({
            title: "Error",
            description: "Failed to load customer data.",
            variant: "destructive"
          });
          return;
        }

        if (data) {
          setInitialData({
            name: data.name,
            segment: data.segment || "",
            country: data.country || "",
            industry: data.industry || "",
            go_live_date: data.go_live_date ? new Date(data.go_live_date) : undefined,
            subscription_end_date: data.subscription_end_date ? new Date(data.subscription_end_date) : undefined,
            description: data.description || "",
            logo: data.logo || "",
            contact_name: data.contact_name || "",
            contact_email: data.contact_email || "",
            contact_phone: data.contact_phone || "",
          });
        }
      } catch (error) {
        console.error('Error loading customer:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomer();
  }, [id, toast]);

  const handleSubmit = async (data: CustomerFormData, contracts: Contract[]) => {
    setIsSubmitting(true);
    try {
      const customerData = {
        name: data.name,
        segment: data.segment,
        country: data.country,
        industry: data.industry,
        go_live_date: data.go_live_date ? data.go_live_date.toISOString().split('T')[0] : null,
        subscription_end_date: data.subscription_end_date ? data.subscription_end_date.toISOString().split('T')[0] : null,
        description: data.description,
        logo: data.logo,
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
      };

      let customerId = id;

      if (id) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', id);

        if (error) throw error;
      } else {
        // Create new customer
        const { data: newCustomer, error } = await supabase
          .from('customers')
          .insert([customerData])
          .select()
          .single();

        if (error) throw error;
        customerId = newCustomer.id;
      }

      // Save contracts
      if (customerId && contracts.length > 0) {
        // Delete existing contracts first (for updates)
        if (id) {
          await supabase
            .from('contracts')
            .delete()
            .eq('customer_id', id);
        }

        // Insert new contracts
        const contractsToInsert = contracts.map(contract => ({
          customer_id: customerId,
          name: contract.name,
          value: contract.value,
          setup_fee: contract.setup_fee || 0,
          annual_rate: contract.annual_rate || 0,
          start_date: contract.start_date,
          end_date: contract.end_date,
          status: contract.status,
          terms: contract.terms,
        }));

        const { error: contractError } = await supabase
          .from('contracts')
          .insert(contractsToInsert);

        if (contractError) {
          console.error('Error saving contracts:', contractError);
        }
      }

      toast({
        title: "Success",
        description: `Customer ${id ? 'updated' : 'created'} successfully!`,
      });

      navigate('/customers');
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        title: "Error",
        description: `Failed to ${id ? 'update' : 'create'} customer.`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/customers')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
          <h1 className="text-2xl font-bold">
            {id ? 'Edit Customer' : 'Add New Customer'}
          </h1>
        </div>

        <CustomerForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel={id ? "Update Customer" : "Create Customer"}
          customerId={id}
        />
      </div>
    </DashboardLayout>
  );
}
