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
import { defaultLifecycleStages } from "@/data/defaultLifecycleStages";
import { logCustomerCreated, logCustomerUpdated } from "@/utils/activityLogger";

// Helper function to save documents to database
const saveDocumentsToDatabase = async (customerId: string, documents: any[]) => {
  // Get current user ID for uploaded_by field
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  // Get existing documents in database to avoid duplicates
  const { data: existingDocs } = await supabase
    .from('documents')
    .select('id, file_path')
    .eq('customer_id', customerId);

  const existingFilePaths = new Set(existingDocs?.map(doc => doc.file_path) || []);
  const newDocuments = documents.filter(doc => !doc.id && !existingFilePaths.has(doc.file_path));

      console.log('saveDocumentsToDatabase: Processing documents:', {
        totalDocuments: documents.length,
        newDocuments: newDocuments.length,
        existingDocuments: documents.filter(doc => doc.id).length,
        currentUserId,
        documentsStructure: documents.map(doc => ({ 
          name: doc.name, 
          file_path: doc.file_path, 
          hasId: !!doc.id,
          document_type: doc.document_type
        })),
        existingFilePaths: Array.from(existingFilePaths)
      });

  // Insert new documents
  if (newDocuments.length > 0) {
    const documentsToInsert = newDocuments.map(doc => ({
      customer_id: customerId,
      name: doc.name,
      file_path: doc.file_path,
      document_type: doc.document_type,
      file_size: doc.file_size || 0,
      uploaded_by: currentUserId
    }));

    console.log('saveDocumentsToDatabase: Inserting documents:', documentsToInsert);

    const { error } = await supabase
      .from('documents')
      .insert(documentsToInsert);

    if (error) {
      console.error('Error saving documents to database:', error);
      throw error;
    }
    
    console.log('saveDocumentsToDatabase: Successfully inserted new documents');
  }

  // Update existing documents (for document type changes)
  const existingDocsToUpdate = documents.filter(doc => doc.id);
  for (const doc of existingDocsToUpdate) {
    console.log('saveDocumentsToDatabase: Updating document:', doc.id);
    
    const { error } = await supabase
      .from('documents')
      .update({
        document_type: doc.document_type,
        name: doc.name
      })
      .eq('id', doc.id);

    if (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }
};

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
            description: data.description || "",
            logo: data.logo || "",
            owner_id: data.owner_id || "",
            contact_name: data.contact_name || "",
            contact_email: data.contact_email || "",
            contact_phone: data.contact_phone || "",
            // Service plan fields
            service_type: data.service_type || null,
            project_owner: (data as any).project_owner || null,
            text_plan: data.text_plan || null,
            text_ai_responses: data.text_ai_responses ?? null,
            voice_tier: data.voice_tier || null,
            voice_hours: data.voice_hours ?? null,
            voice_price_per_hour: data.voice_price_per_hour ?? null,
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

  const handleSubmit = async (data: CustomerFormData, contracts: Contract[], documents: any[] = []) => {
    setIsSubmitting(true);
    try {
      console.log('AddEditCustomer: Starting submission with:', { 
        customerId: id, 
        contractCount: contracts.length, 
        documentCount: documents.length,
        documents: documents.map(doc => ({ name: doc.name, file_path: doc.file_path, hasId: !!doc.id }))
      });
      // Helper to convert empty strings to null (important for UUID and enum fields)
      const nullIfEmpty = (val: any) => (val === '' || val === undefined) ? null : val;
      
      const customerData = {
        name: data.name,
        segment: nullIfEmpty(data.segment),
        country: nullIfEmpty(data.country),
        industry: nullIfEmpty(data.industry),
        estimated_deal_value: data.estimated_deal_value ?? null,
        description: nullIfEmpty(data.description),
        logo: nullIfEmpty(data.logo),
        owner_id: nullIfEmpty(data.owner_id), // Must be valid UUID or null
        contact_name: nullIfEmpty(data.contact_name),
        contact_email: nullIfEmpty(data.contact_email),
        contact_phone: nullIfEmpty(data.contact_phone),
        // Service plan fields - must match database enum values or be null
        service_type: nullIfEmpty(data.service_type),
        project_owner: nullIfEmpty(data.project_owner),
        text_plan: nullIfEmpty(data.text_plan),
        text_ai_responses: data.text_ai_responses ?? null,
        voice_tier: nullIfEmpty(data.voice_tier),
        voice_hours: data.voice_hours ?? null,
        voice_price_per_hour: data.voice_price_per_hour ?? null,
      };

      console.log('Saving customer data:', JSON.stringify(customerData, null, 2));

      let customerId = id;

      if (id) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', id);

        if (error) {
          console.error('Supabase update error:', JSON.stringify(error, null, 2));
          console.error('Error message:', error.message);
          console.error('Error code:', error.code);
          console.error('Error details:', error.details);
          throw error;
        }
        
        // Log the update activity
        await logCustomerUpdated(id, customerData.name);
      } else {
        // Create new customer
        const { data: newCustomer, error } = await supabase
          .from('customers')
          .insert([customerData])
          .select()
          .single();

        if (error) throw error;
        customerId = newCustomer.id;

        // Create default lifecycle stages for the new customer
        console.log(`Creating default lifecycle stages for new customer ${customerId}`);
        
        // Get first staff member to assign as owner
        const { data: staffData } = await supabase
          .from('staff')
          .select('id')
          .limit(1);
        
        const defaultOwnerId = staffData?.[0]?.id || null;
        
        const stagesToInsert = defaultLifecycleStages.map(stage => ({
          customer_id: customerId,
          name: stage.name,
          status: stage.status,
          category: stage.category,
          owner_id: defaultOwnerId,
          notes: stage.notes || null
        }));
        
        const { error: stagesError } = await supabase
          .from('lifecycle_stages')
          .insert(stagesToInsert);
        
        if (stagesError) {
          console.error('Error creating lifecycle stages:', stagesError);
        } else {
          console.log(`✅ Created ${stagesToInsert.length} lifecycle stages for customer ${customerId}`);
        }
        
        // Log the create activity
        await logCustomerCreated(customerId!, customerData.name);
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
          payment_frequency: contract.payment_frequency || "annual",
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

      // Save documents after customer creation/update
      if (customerId && documents.length > 0) {
        console.log('AddEditCustomer: Saving documents to database:', { 
          customerId, 
          documentCount: documents.length 
        });
        
        try {
          await saveDocumentsToDatabase(customerId, documents);
          console.log('AddEditCustomer: Documents saved successfully');
        } catch (docError) {
          console.error('AddEditCustomer: Error saving documents:', docError);
          // Don't fail the whole operation, just show a warning
          toast({
            title: "Warning",
            description: "Customer saved but some documents may not have been saved properly.",
            variant: "destructive"
          });
        }
      }

      toast({
        title: "Success",
        description: `Customer ${id ? 'updated' : 'created'} successfully!`,
      });

      // Navigate to lifecycle page with the customer ID
      navigate(`/lifecycle/${customerId}`);
    } catch (error: any) {
      console.error('Error saving customer:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
      toast({
        title: "Error",
        description: `Failed to ${id ? 'update' : 'create'} customer. ${error?.message || ''}`,
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
