import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CustomerForm, type CustomerFormData } from "@/components/customers/CustomerForm";
import { Contract } from "@/components/customers/ContractsList";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

export default function AddEditCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [initialData, setInitialData] = useState<Partial<CustomerFormData> | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [customerName, setCustomerName] = useState("");

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
          setCustomerName(data.name);
          setInitialData({
            name: data.name,
            segment: data.segment || "",
            country: data.country || "",
            industry: data.industry || "",
            estimated_deal_value: data.estimated_deal_value ?? null,
            go_live_date: data.go_live_date ? new Date(data.go_live_date) : undefined,
            subscription_end_date: data.subscription_end_date ? new Date(data.subscription_end_date) : undefined,
            description: data.description || "",
            logo: data.logo || "",
            owner_id: data.owner_id || "",
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

  const handleDelete = async () => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      // Check authentication status first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to delete customers.",
          variant: "destructive"
        });
        return;
      }

      // Delete related records in correct order to avoid foreign key constraints
      const deleteOperations = [
        // Delete contracts first
        supabase.from('contracts').delete().eq('customer_id', id),
        // Delete customer feedback
        supabase.from('customer_feedback').delete().eq('customer_id', id),
        // Delete customer team members
        supabase.from('customer_team_members').delete().eq('customer_id', id),
        // Delete customer timeline
        supabase.from('customer_timeline').delete().eq('customer_id', id),
        // Delete documents
        supabase.from('documents').delete().eq('customer_id', id),
        // Delete lifecycle stages
        supabase.from('lifecycle_stages').delete().eq('customer_id', id),
        // Delete referrals
        supabase.from('referrals').delete().eq('customer_id', id),
        // Delete tasks
        supabase.from('tasks').delete().eq('customer_id', id),
      ];

      // Execute all delete operations
      for (const operation of deleteOperations) {
        const { error } = await operation;
        if (error) {
          console.error('Error deleting related records:', error);
          // Continue with other deletions even if one fails
        }
      }

      // Finally delete the customer
      const { error: customerError } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (customerError) {
        console.error('Customer deletion error:', customerError);
        throw customerError;
      }

      toast({
        title: "Success",
        description: "Customer deleted successfully!",
      });

      // Navigate back with refresh state to trigger data reload
      navigate('/customers', { state: { refresh: true } });
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      
      let errorMessage = "Failed to delete customer.";
      if (error?.message?.includes('row-level security')) {
        errorMessage = "You don't have permission to delete this customer.";
      } else if (error?.message?.includes('authentication')) {
        errorMessage = "Authentication required. Please log in and try again.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSubmit = async (data: CustomerFormData, contracts: Contract[]) => {
    setIsSubmitting(true);
    try {
      const customerData = {
        name: data.name,
        segment: data.segment,
        country: data.country,
        industry: data.industry,
        estimated_deal_value: data.estimated_deal_value ?? null,
        go_live_date: data.go_live_date ? data.go_live_date.toISOString().split('T')[0] : null,
        subscription_end_date: data.subscription_end_date ? data.subscription_end_date.toISOString().split('T')[0] : null,
        description: data.description,
        logo: data.logo,
        owner_id: data.owner_id,
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

      // Navigate back with refresh state to trigger data reload
      navigate('/customers', { state: { refresh: true } });
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
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
          
          {id && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Customer
            </Button>
          )}
        </div>

        <CustomerForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel={id ? "Update Customer" : "Create Customer"}
          customerId={id}
        />

        <DeleteConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          title="Delete Customer"
          description="Are you sure you want to delete this customer?"
          itemName={customerName}
          isDeleting={isDeleting}
        />
      </div>
    </DashboardLayout>
  );
}
