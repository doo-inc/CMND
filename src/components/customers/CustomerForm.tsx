
import React, { useRef, useState, useEffect } from "react";
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
import { CalendarIcon } from "lucide-react";
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
import { industryOptions } from "@/data/defaultLifecycleStages";
import { getActiveCountries } from "@/utils/countryUtils";
import { CustomerAvatarUpload, CustomerAvatarUploadRef } from "./CustomerAvatarUpload";
import { ContractsList, Contract, ContractsListRef } from "./ContractsList";
import { DocumentUpload, Document as UploadDocument } from "@/components/documents/DocumentUpload";
import { useDocumentManager } from "@/hooks/useDocumentManager";

const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  segment: z.string().min(1, "Segment is required"),
  country: z.string().min(1, "Country is required"),
  industry: z.string().optional(),
  estimated_deal_value: z.number().nullable().optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  owner_id: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email("Invalid email format").optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  company_registration_number: z.string().optional(),
  legal_address: z.string().optional(),
  representative_name: z.string().optional(),
  representative_title: z.string().optional(),
  payment_terms_days: z.number().nullable().optional(),
  currency: z.string().optional(),
  service_type: z.enum(['text', 'voice', 'both']).nullable().optional(),
  text_plan: z.enum(['basic', 'growth']).nullable().optional(),
  text_ai_responses: z.number().nullable().optional(),
  voice_tier: z.enum(['tier_1', 'tier_2', 'tier_3', 'tier_4']).nullable().optional(),
  voice_hours: z.number().nullable().optional(),
  voice_price_per_hour: z.number().nullable().optional(),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  initialData?: Partial<CustomerFormData>;
  onSubmit: (data: CustomerFormData, contracts: Contract[], documents: UploadDocument[]) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  customerId?: string;
}

export function CustomerForm({ 
  initialData, 
  onSubmit, 
  isSubmitting = false, 
  submitLabel = "Save Customer",
  customerId
}: CustomerFormProps) {
  console.log('CustomerForm: Component rendering, isSubmitting:', isSubmitting);
  
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const avatarUploadRef = useRef<CustomerAvatarUploadRef>(null);
  const contractsListRef = useRef<ContractsListRef>(null);
  
  // Document management
  const { documents, setDocuments, saveDocuments } = useDocumentManager(customerId, "customer");
  
  // CRITICAL: Configure React Hook Form to ONLY validate on explicit submission
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    mode: "onSubmit", // CRITICAL: Only validate when form is explicitly submitted
    reValidateMode: "onSubmit", // CRITICAL: Only re-validate on explicit submission
    defaultValues: {
      name: initialData?.name || "",
      segment: initialData?.segment || "",
      country: initialData?.country || "",
      industry: initialData?.industry || "",
      estimated_deal_value: initialData?.estimated_deal_value || null,
      description: initialData?.description || "",
      logo: initialData?.logo || "",
      owner_id: initialData?.owner_id || "",
      contact_name: initialData?.contact_name || "",
      contact_email: initialData?.contact_email || "",
      contact_phone: initialData?.contact_phone || "",
      company_registration_number: initialData?.company_registration_number || "",
      legal_address: initialData?.legal_address || "",
      representative_name: initialData?.representative_name || "",
      representative_title: initialData?.representative_title || "",
      payment_terms_days: initialData?.payment_terms_days || 14,
      currency: initialData?.currency || "BD",
      service_type: (initialData as any)?.service_type || null,
      text_plan: (initialData as any)?.text_plan || null,
      text_ai_responses: (initialData as any)?.text_ai_responses || null,
      voice_tier: (initialData as any)?.voice_tier || null,
      voice_hours: (initialData as any)?.voice_hours || null,
      voice_price_per_hour: (initialData as any)?.voice_price_per_hour || null,
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

  // Debug logging for form state changes
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      console.log('CustomerForm: Form watch triggered', { name, type, isSubmitting });
      // Prevent auto-submission by not calling handleSubmit here
    });
    return () => subscription.unsubscribe();
  }, [form, isSubmitting]);

  // CRITICAL: Only submit when user explicitly clicks the save button
  const handleFormSubmit = async (data: CustomerFormData) => {
    console.log('CustomerForm: EXPLICIT form submission started by user click');
    
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('CustomerForm: Submission already in progress, ignoring');
      return;
    }
    
    try {
      // Get the final logo value from the avatar component (with timeout protection)
      let finalLogoValue = data.logo;
      if (avatarUploadRef.current) {
        try {
          const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Avatar load timeout')), 3000)
          );
          finalLogoValue = await Promise.race([
            Promise.resolve(avatarUploadRef.current.getPendingValue()),
            timeout
          ]) as string;
        } catch (err) {
          console.warn('Avatar value retrieval failed, using existing:', err);
        }
      }
      data.logo = finalLogoValue;
      
      // Get contracts from the contracts list component
      const contracts = contractsListRef.current?.getContracts() || [];
      console.log('CustomerForm: Retrieved contracts for submission:', { contractCount: contracts.length });
      console.log('CustomerForm: Retrieved documents for submission:', { documentCount: documents.length });
      
      // Call the original onSubmit with current contract state and documents
      await onSubmit(data, contracts, documents);
    } catch (error) {
      console.error('CustomerForm: Error during submission:', error);
      throw error;
    }
  };

  // CRITICAL: Prevent any automatic form submission
  const preventAutoSubmit = (e: any) => {
    console.log('CustomerForm: Preventing auto-submit event:', e.type);
    e.preventDefault();
    e.stopPropagation();
  };

  const segmentOptions = [
    "Enterprise",
    "Mid-Market", 
    "Small Business",
    "Startup"
  ];

  const countryComboboxOptions = countryOptions.map(country => ({
    value: country,
    label: country
  }));

  // Watch customer name for avatar component
  const customerName = form.watch("name");

  return (
    <Form {...form}>
      <form 
        onSubmit={(e) => {
          console.log('CustomerForm: Form onSubmit event triggered');
          form.handleSubmit(handleFormSubmit)(e);
        }}
        onKeyDown={(e) => {
          // Prevent Enter key from submitting the form unless it's the submit button
          if (e.key === 'Enter' && e.target !== e.currentTarget) {
            const target = e.target as HTMLElement;
            if (target.tagName !== 'BUTTON' || target.getAttribute('type') !== 'submit') {
              console.log('CustomerForm: Preventing Enter key submission');
              e.preventDefault();
            }
          }
        }}
        className="space-y-6"
      >
        {/* Customer Profile Section */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Customer Profile Image
                </label>
                <CustomerAvatarUpload
                  ref={avatarUploadRef}
                  value={initialData?.logo || ""}
                  onChange={() => {
                    console.log('CustomerForm: Avatar changed, but NOT triggering form submission');
                  }}
                  customerName={customerName || "New Customer"}
                />
              </div>
            </div>

            {/* Basic Information */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select segment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {segmentOptions.map((segment) => (
                          <SelectItem key={segment} value={segment}>
                            {segment}
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
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Combobox
                        options={countryComboboxOptions}
                        value={field.value}
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
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {industryOptions.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
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
                name="estimated_deal_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Deal Value</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input 
                          type="number" 
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? null : parseInt(value) || null);
                          }}
                          className="pl-8"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="owner_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Owner</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter deal owner name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Service Plan Section */}
          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-lg font-semibold">Service Plan Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="service_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="text">Text AI</SelectItem>
                        <SelectItem value="voice">Voice AI</SelectItem>
                        <SelectItem value="both">Text & Voice AI</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Text Plan Fields - Show if service_type is 'text' or 'both' */}
            {(form.watch("service_type") === "text" || form.watch("service_type") === "both") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <FormField
                  control={form.control}
                  name="text_plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text Plan</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="basic">Basic Plan</SelectItem>
                          <SelectItem value="growth">Growth Plan</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="text_ai_responses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Responses (Monthly)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g., 1000"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? null : parseInt(value) || null);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Voice Plan Fields - Show if service_type is 'voice' or 'both' */}
            {(form.watch("service_type") === "voice" || form.watch("service_type") === "both") && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <FormField
                  control={form.control}
                  name="voice_tier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voice Tier</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="tier_1">Tier 1 (100-399 hrs)</SelectItem>
                          <SelectItem value="tier_2">Tier 2 (400-999 hrs)</SelectItem>
                          <SelectItem value="tier_3">Tier 3 (1,000-2,999 hrs)</SelectItem>
                          <SelectItem value="tier_4">Tier 4 (3,000+ hrs)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="voice_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Hours</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g., 150"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? null : parseInt(value) || null);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="voice_price_per_hour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Hour ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="e.g., 25.00"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? null : parseFloat(value) || null);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {/* Contract Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Contract Details
          </h3>
          
          <ContractsList
            ref={contractsListRef}
            customerId={customerId}
            customerName={customerName || "Customer"}
            initialData={initialData}
          />
        </div>

        {/* Documents Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Documents
          </h3>
          <DocumentUpload
            documents={documents}
            onDocumentsChange={setDocuments}
            entityType="customer"
            entityId={customerId}
          />
        </div>


        {/* Contact Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter contact name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter contact email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter contact phone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Legal & Company Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Legal & Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="company_registration_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Registration Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter registration number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BD">BD - Bahraini Dinar</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                      <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                      <SelectItem value="KWD">KWD - Kuwaiti Dinar</SelectItem>
                      <SelectItem value="QAR">QAR - Qatari Riyal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="legal_address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Legal Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter full legal address" 
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="representative_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Representative Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter representative name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="representative_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Representative Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., CEO, Managing Director" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_terms_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms (Days)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="14"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? null : parseInt(value) || null);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter customer description" 
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button 
            type="submit" 
            disabled={isSubmitting}
            onClick={(e) => {
              console.log('CustomerForm: Save button clicked explicitly');
              // Let the form's onSubmit handle this
            }}
          >
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
