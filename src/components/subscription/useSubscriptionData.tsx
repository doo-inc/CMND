import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types/customers";
import { ProcessedCustomer } from "./types";
import { useToast } from "@/hooks/use-toast";

export const useSubscriptionData = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("renewal_date");
  const { toast } = useToast();

  // Fetch all customers for filter options
  const { data: allCustomers = [] } = useQuery({
    queryKey: ['all-customers-for-filters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('segment, country')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Pick<Customer, 'segment' | 'country'>[];
    }
  });

  // Fetch customers who have completed "Go Live" stage
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['subscription-tracker'],
    queryFn: async () => {
      // First, get customer IDs who have completed "Go Live" stage
      const { data: goLiveCustomers, error: stageError } = await supabase
        .from('lifecycle_stages')
        .select('customer_id')
        .eq('name', 'Go Live')
        .eq('status', 'done');
      
      if (stageError) throw stageError;
      
      // Extract customer IDs
      const customerIds = goLiveCustomers.map(stage => stage.customer_id);
      
      if (customerIds.length === 0) {
        return [];
      }
      
      // Now fetch customers with those IDs
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .in('id', customerIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Customer[];
    }
  });

  const processCustomers = (customers: Customer[]): ProcessedCustomer[] => {
    return customers.map(customer => {
      const today = new Date();
      const endDate = customer.subscription_end_date ? new Date(customer.subscription_end_date) : null;
      const startDate = customer.go_live_date ? new Date(customer.go_live_date) : null;
      
      let timeLeft = "";
      let status: "active" | "expiring_soon" | "expired" | "missing_date" = "missing_date";
      let delta = 0;
      let progressPercentage = 0;

      if (endDate) {
        delta = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (startDate) {
          const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          progressPercentage = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
        }
        
        if (delta > 60) {
          status = "active";
          const months = Math.floor(delta / 30);
          const days = delta % 30;
          timeLeft = days > 0 ? `${months} months, ${days} days left` : `${months} months left`;
        } else if (delta > 30) {
          status = "expiring_soon";
          timeLeft = `${delta} days left`;
        } else if (delta > 0) {
          status = "expiring_soon";
          timeLeft = `${delta} days left`;
        } else if (delta === 0) {
          status = "expiring_soon";
          timeLeft = "Renew today";
        } else {
          status = "expired";
          timeLeft = "To Be Renewed";
        }
      } else {
        timeLeft = "End date not set";
        delta = -999999;
      }

      return {
        ...customer,
        timeLeft,
        status,
        delta,
        progressPercentage
      };
    });
  };

  const processedCustomers = processCustomers(customers);

  // Filter customers
  const filteredCustomers = processedCustomers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.country?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSegment = segmentFilter === "all" || customer.segment === segmentFilter;
    const matchesCountry = countryFilter === "all" || customer.country === countryFilter;
    
    return matchesSearch && matchesSegment && matchesCountry;
  });

  // Sort customers
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case "renewal_date":
        return a.delta - b.delta;
      case "customer_name":
        return a.name.localeCompare(b.name);
      case "annual_rate":
        return (b.annual_rate || 0) - (a.annual_rate || 0);
      default:
        return 0;
    }
  });

  // Get unique values for filters from ALL customers
  const uniqueSegments = Array.from(new Set(allCustomers.map(c => c.segment).filter(Boolean)));
  const uniqueCountries = Array.from(new Set(allCustomers.map(c => c.country).filter(Boolean)));

  // Handle remind customer action
  const handleRemindCustomer = async (customerId: string, customerName: string) => {
    try {
      // For now, we'll just show a success toast
      // In the future, this could send an email or create a notification
      toast({
        title: "Reminder Sent",
        description: `Renewal reminder sent to ${customerName}`,
      });
      
      console.log(`Reminder sent to customer ${customerId} (${customerName})`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reminder. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle update subscription date
  const handleUpdateDate = async (customerId: string, newDate: string, customerName: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ subscription_end_date: newDate })
        .eq('id', customerId);

      if (error) throw error;

      toast({
        title: "Date Updated",
        description: `Subscription date updated for ${customerName}`,
      });

      console.log(`Updated subscription date for ${customerId} to ${newDate}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update date. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle mark as paid
  const handleMarkAsPaid = async (customerId: string, customerName: string) => {
    try {
      // For now, we'll just show a success toast
      // In the future, this could update a payment_status field
      toast({
        title: "Marked as Paid",
        description: `${customerName} marked as paid`,
      });
      
      console.log(`Marked as paid for customer ${customerId} (${customerName})`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark as paid. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    customers: sortedCustomers,
    isLoading,
    searchTerm,
    setSearchTerm,
    segmentFilter,
    setSegmentFilter,
    countryFilter,
    setCountryFilter,
    sortBy,
    setSortBy,
    uniqueSegments,
    uniqueCountries,
    handleRemindCustomer,
    handleUpdateDate,
    handleMarkAsPaid
  };
};
