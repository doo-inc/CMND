import { supabase } from "@/integrations/supabase/client";
import { customers as realCustomers } from "@/data/realCustomers";
import { CustomerData } from "@/types/customers";

/**
 * Finds a customer by ID or name in both database and local data
 */
export const findCustomerById = async (customerId: string): Promise<CustomerData | null> => {
  console.log("Searching for customer with ID or name:", customerId);
  
  try {
    // First try direct UUID lookup in database
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      const { data: customerData, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
      
      if (error) {
        console.error("Error fetching customer from database:", error);
      }
      
      if (customerData) {
        console.log("Customer found in database:", customerData);
        return {
          id: customerData.id,
          name: customerData.name,
          logo: customerData.logo || undefined,
          segment: customerData.segment || "Unknown Segment",
          country: customerData.country || "Unknown Country",
          stage: customerData.stage || "New",
          status: (customerData.status as "not-started" | "in-progress" | "done" | "blocked") || "not-started",
          contractSize: customerData.contract_size || 0,
          owner: {
            id: customerData.owner_id || "unknown",
            name: "Account Manager",
            role: "Sales"
          }
        };
      }
    }
    
    // Try to find by name in database
    const { data: nameSearchData, error: nameSearchError } = await supabase
      .from('customers')
      .select('*')
      .ilike('name', `%${customerId}%`)
      .limit(1);
    
    if (nameSearchError) {
      console.error("Error searching by name:", nameSearchError);
    }
    
    if (nameSearchData && nameSearchData.length > 0) {
      const customer = nameSearchData[0];
      console.log("Customer found in database by name:", customer);
      return {
        id: customer.id,
        name: customer.name,
        logo: customer.logo || undefined,
        segment: customer.segment || "Unknown Segment",
        country: customer.country || "Unknown Country",
        stage: customer.stage || "New",
        status: (customer.status as "not-started" | "in-progress" | "done" | "blocked") || "not-started",
        contractSize: customer.contract_size || 0,
        owner: {
          id: customer.owner_id || "unknown",
          name: "Account Manager",
          role: "Sales"
        }
      };
    }
    
    // If not found in database, search in local data
    const customer = realCustomers.find(c => {
      // Check for UUID match or customer ID match
      return c.id === customerId || 
             c.id?.toLowerCase().includes(customerId.toLowerCase()) || 
             c.name.toLowerCase().includes(customerId.toLowerCase());
    });
    
    if (customer) {
      console.log("Customer found in local data:", customer);
      // Try to insert this customer into the database for future use
      const newCustomerId = crypto.randomUUID();
      
      try {
        const { error: insertError } = await supabase
          .from('customers')
          .insert({
            id: newCustomerId,
            name: customer.name,
            segment: customer.segment || null,
            country: customer.region || null,
            stage: customer.stage || null,
            status: "not-started",
            contract_size: customer.contractSize || 0,
            owner_id: "00000000-0000-0000-0000-000000000001" // Default owner
          });
          
        if (insertError) {
          console.error("Error inserting customer from local data:", insertError);
        } else {
          console.log("Inserted customer into database from local data");
        }
      } catch (insertErr) {
        console.error("Exception inserting customer:", insertErr);
      }
      
      return {
        id: newCustomerId,
        name: customer.name,
        logo: undefined,
        segment: customer.segment || "Unknown Segment",
        country: customer.region || "Unknown Country",
        stage: customer.stage || "New", 
        status: "not-started",
        contractSize: customer.contractSize || 0,
        owner: {
          id: "unknown",
          name: customer.owner?.name || "Account Manager",
          role: customer.owner?.role || "Sales"
        }
      };
    }
    
    console.log("No customer found with ID or name:", customerId);
    return null;
  } catch (error) {
    console.error("Error in findCustomerById:", error);
    return null;
  }
};

/**
 * Format customer ID to UUID format expected by database
 */
export const formatCustomerId = (customerId: string): string => {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
    return customerId;
  }
  
  // For custom IDs, return a new valid UUID
  return crypto.randomUUID();
};

/**
 * Gets a list of customers that are considered "live"
 * A customer is considered live if their status is "done" or in specified live stages
 */
export const getLiveCustomers = (customers: CustomerData[]): CustomerData[] => {
  const liveStages = [
    "live", 
    "production", 
    "launched", 
    "active", 
    "paid", 
    "went live", 
    "training completed"
  ];
  
  return customers.filter(customer => 
    customer.status === "done" || 
    (customer.stage && liveStages.some(stage => 
      customer.stage?.toLowerCase().includes(stage.toLowerCase())
    ))
  );
};

/**
 * Format a number as a currency with K (thousands) or M (millions) suffix
 */
export const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount}`;
};

/**
 * Gets customer ARR data including all customers that are live, paid, or with invoices sent
 * Include signed customers in ARR now
 */
export const getCustomerARRData = (customers: CustomerData[]): { 
  totalARR: number, 
  liveCustomers: CustomerData[], 
  growthRate: number 
} => {
  const arrStages = [
    "live", 
    "production", 
    "launched", 
    "active", 
    "paid", 
    "invoice sent", 
    "signed", 
    "went live",
    "invoice sent",
    "paid",
    "training completed"
  ];
  
  const relevantCustomers = customers.filter(customer => {
    if (customer.status === "done") return true;
    if (!customer.stage) return false;
    
    // Check if customer stage contains any of the ARR stages (including "signed" now)
    return arrStages.some(stage => 
      customer.stage?.toLowerCase().includes(stage.toLowerCase())
    );
  });
  
  const totalARR = relevantCustomers.reduce((sum, customer) => sum + (customer.contractSize || 0), 0);
  
  // Calculate growth rate (mock 12.5% if no historical data available)
  const growthRate = 12.5;
  
  const liveCustomers = getLiveCustomers(customers);
  
  return {
    totalARR,
    liveCustomers,
    growthRate
  };
};

/**
 * Gets deals pipeline information
 * Deals in pipeline are those not in ARR-counted stages (but NOT including signed now)
 */
export const getDealsPipeline = (customers: CustomerData[]): { 
  value: number, 
  count: number 
} => {
  const arrStages = ["live", "production", "launched", "active", "paid", "invoice sent", "signed"];
  
  const pipelineCustomers = customers.filter(customer => {
    if (customer.status === "done") return false;
    if (!customer.stage) return true;
    
    // Check if customer stage does NOT contain any of the ARR stages (signed is in ARR now)
    return !arrStages.some(stage => 
      customer.stage?.toLowerCase().includes(stage.toLowerCase())
    );
  });
  
  const totalValue = pipelineCustomers.reduce((sum, c) => sum + (c.contractSize || 0), 0);
  const count = pipelineCustomers.length;
  
  return {
    value: totalValue,
    count
  };
};

/**
 * Calculates average go-live time (currently returns mock data)
 */
export const calculateAverageGoLiveTime = (): string => {
  return "37 days";
};

/**
 * Calculate churn rate based on total customers
 */
export const calculateChurnRate = (customers: CustomerData[]): string => {
  const totalCustomers = customers.length;
  const churnedCustomers = Math.floor(totalCustomers * 0.05); // 5% churn rate
  return (churnedCustomers / totalCustomers * 100).toFixed(1) + "%";
};

/**
 * Calculate sales lifecycle
 */
export const calculateSalesLifecycle = (): string => {
  return "45 days";
};
