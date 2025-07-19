
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowLeft, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { useDocumentManager } from "@/hooks/useDocumentManager";
import { getActiveCountries } from "@/utils/countryUtils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

const partnershipSchema = z.object({
  name: z.string().min(1, "Partnership name is required"),
  partnership_type: z.enum(["reseller", "consultant", "platform_partner", "education_partner", "mou_partner"]),
  status: z.enum(["in_discussion", "signed", "active", "inactive", "expired"]).optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  start_date: z.date().optional(),
  expiry_date: z.date().optional(),
  renewal_date: z.date().optional(),
  expected_value: z.number().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type PartnershipFormData = z.infer<typeof partnershipSchema>;

export default function AddEditPartnership() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [partnershipName, setPartnershipName] = useState("");
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  
  // Document management
  const { documents, setDocuments, saveDocuments } = useDocumentManager(id, "partnership");

  const form = useForm<PartnershipFormData>({
    resolver: zodResolver(partnershipSchema),
    defaultValues: {
      name: "",
      partnership_type: "reseller",
      status: "in_discussion",
      country: "",
      region: "",
      expected_value: 0,
      description: "",
      notes: "",
    },
  });

  // Load countries from database
  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const countries = await getActiveCountries();
      setCountryOptions(countries);
    } catch (error) {
      console.error('Error loading countries:', error);
    } finally {
      setLoadingCountries(false);
    }
  };

  // Load existing partnership data
  useEffect(() => {
    if (!id) return;

    const loadPartnership = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('partnerships')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error loading partnership:', error);
          toast({
            title: "Error",
            description: "Failed to load partnership data.",
            variant: "destructive"
          });
          return;
        }

        if (data) {
          setPartnershipName(data.name);
          form.reset({
            name: data.name,
            partnership_type: data.partnership_type,
            status: data.status,
            country: data.country || "",
            region: data.region || "",
            start_date: data.start_date ? new Date(data.start_date) : undefined,
            expiry_date: data.expiry_date ? new Date(data.expiry_date) : undefined,
            renewal_date: data.renewal_date ? new Date(data.renewal_date) : undefined,
            expected_value: data.expected_value || 0,
            description: data.description || "",
            notes: data.notes || "",
          });
        }
      } catch (error) {
        console.error('Error loading partnership:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPartnership();
  }, [id, form, toast]);

  const handleDelete = async () => {
    if (!id) return;
    
    setIsDeleting(true);
    try {
      // Delete related records in correct order to avoid foreign key constraints
      const deleteOperations = [
        // Delete partnership contacts
        supabase.from('partnership_contacts').delete().eq('partnership_id', id),
        // Delete partnership documents
        supabase.from('partnership_documents').delete().eq('partnership_id', id),
        // Delete partnership timeline
        supabase.from('partnership_timeline').delete().eq('partnership_id', id),
      ];

      // Execute all delete operations
      for (const operation of deleteOperations) {
        const { error } = await operation;
        if (error) {
          console.error('Error deleting related records:', error);
          // Continue with other deletions even if one fails
        }
      }

      // Finally delete the partnership
      const { error: partnershipError } = await supabase
        .from('partnerships')
        .delete()
        .eq('id', id);

      if (partnershipError) throw partnershipError;

      toast({
        title: "Success",
        description: "Partnership deleted successfully!",
      });

      navigate('/partnerships');
    } catch (error) {
      console.error('Error deleting partnership:', error);
      toast({
        title: "Error",
        description: "Failed to delete partnership.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const onSubmit = async (data: PartnershipFormData) => {
    setIsSubmitting(true);
    try {
      const partnershipData = {
        name: data.name,
        partnership_type: data.partnership_type,
        status: data.status,
        country: data.country,
        region: data.region,
        start_date: data.start_date ? format(data.start_date, "yyyy-MM-dd") : null,
        expiry_date: data.expiry_date ? format(data.expiry_date, "yyyy-MM-dd") : null,
        renewal_date: data.renewal_date ? format(data.renewal_date, "yyyy-MM-dd") : null,
        expected_value: data.expected_value,
        description: data.description,
        notes: data.notes,
      };

      let partnershipId = id;

      if (id) {
        // Update existing partnership
        const { error } = await supabase
          .from('partnerships')
          .update(partnershipData)
          .eq('id', id);

        if (error) throw error;
      } else {
        // Create new partnership
        const { data: newPartnership, error } = await supabase
          .from('partnerships')
          .insert([partnershipData])
          .select()
          .single();

        if (error) throw error;
        partnershipId = newPartnership.id;
      }

      // Save documents
      if (partnershipId && documents.length > 0) {
        await saveDocuments(partnershipId, documents);
      }

      toast({
        title: "Success",
        description: `Partnership ${id ? 'updated' : 'created'} successfully!`,
      });

      navigate('/partnerships');
    } catch (error) {
      console.error('Error saving partnership:', error);
      toast({
        title: "Error",
        description: `Failed to ${id ? 'update' : 'create'} partnership.`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const partnershipTypes = [
    { value: "reseller", label: "Reseller" },
    { value: "consultant", label: "Consultant" },
    { value: "platform_partner", label: "Platform Partner" },
    { value: "education_partner", label: "Education Partner" },
    { value: "mou_partner", label: "MOU Partner" },
  ];

  const statusOptions = [
    { value: "in_discussion", label: "In Discussion" },
    { value: "signed", label: "Signed" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "expired", label: "Expired" },
  ];

  const countryComboboxOptions = countryOptions.map(country => ({
    value: country,
    label: country
  }));

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
              onClick={() => navigate('/partnerships')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Partnerships
            </Button>
            <h1 className="text-2xl font-bold">
              {id ? 'Edit Partnership' : 'Add New Partnership'}
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
              Delete Partnership
            </Button>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partnership Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter partnership name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partnership_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partnership Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {partnershipTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expected_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Value ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Combobox
                          options={countryComboboxOptions}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select country"
                          searchPlaceholder="Search countries..."
                          emptyMessage="No country found."
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter region" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Documents Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Documents</h3>
              <DocumentUpload
                documents={documents}
                onDocumentsChange={setDocuments}
                entityType="partnership"
                entityId={id}
              />
            </div>

            {/* Dates */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Important Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiry_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expiry Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="renewal_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Renewal Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Description and Notes */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter partnership description" 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter additional notes" 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/partnerships')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : (id ? "Update Partnership" : "Create Partnership")}
              </Button>
            </div>
          </form>
        </Form>

        <DeleteConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          title="Delete Partnership"
          description="Are you sure you want to delete this partnership?"
          itemName={partnershipName}
          isDeleting={isDeleting}
        />
      </div>
    </DashboardLayout>
  );
}
