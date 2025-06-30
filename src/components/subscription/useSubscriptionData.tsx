
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types/customers";
import { ProcessedCustomer, MonthlyRenewal } from "./types";

export const useSubscriptionData = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("renewal_date");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['subscription-tracker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('stage', 'Went Live')
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

  // Process monthly renewals for the renewals view
  const getMonthlyRenewals = (): MonthlyRenewal[] => {
    const monthlyMap = new Map<string, MonthlyRenewal>();
    
    filteredCustomers
      .filter(customer => customer.subscription_end_date && customer.delta > -365) // Only include customers with end dates within a year
      .forEach(customer => {
        if (!customer.subscription_end_date) return;
        
        const endDate = new Date(customer.subscription_end_date);
        const monthKey = `${endDate.getFullYear()}-${endDate.getMonth()}`;
        const monthName = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthName,
            year: endDate.getFullYear(),
            renewalCount: 0,
            totalValue: 0,
            customers: []
          });
        }
        
        const monthData = monthlyMap.get(monthKey)!;
        monthData.renewalCount++;
        monthData.totalValue += customer.annual_rate || 0;
        monthData.customers.push(customer);
      });

    return Array.from(monthlyMap.values())
      .sort((a, b) => {
        const aDate = new Date(a.year, new Date(Date.parse(a.month + " 1, 2000")).getMonth());
        const bDate = new Date(b.year, new Date(Date.parse(b.month + " 1, 2000")).getMonth());
        return aDate.getTime() - bDate.getTime();
      })
      .slice(0, 12); // Show next 12 months
  };

  // Get unique values for filters
  const uniqueSegments = Array.from(new Set(customers.map(c => c.segment).filter(Boolean)));
  const uniqueCountries = Array.from(new Set(customers.map(c => c.country).filter(Boolean)));

  return {
    customers: sortedCustomers,
    monthlyRenewals: getMonthlyRenewals(),
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
    uniqueCountries
  };
};
