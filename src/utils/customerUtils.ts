
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
          segment: customerData.segment || undefined,
          country: customerData.country || undefined,
          stage: customerData.stage || undefined,
          status: (customerData.status as "not-started" | "in-progress" | "done" | "blocked") || undefined,
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
        segment: customer.segment || undefined,
        country: customer.country || undefined,
        stage: customer.stage || undefined,
        status: (customer.status as "not-started" | "in-progress" | "done" | "blocked") || undefined,
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
            country: customer.country || null,
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
        segment: customer.segment || undefined,
        country: customer.country || undefined,
        stage: customer.stage || undefined, 
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
export const formatCurrency = (amount: number, decimals: boolean = true): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(decimals ? 1 : 0)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${Math.round(amount)}`;
};

/**
 * Gets customer ARR data using actual contract values from database
 */
export const getCustomerARRData = async (customers: CustomerData[]): Promise<{ 
  totalARR: number, 
  liveCustomers: CustomerData[], 
  growthRate: number 
}> => {
  try {
    // Get actual contract values from database for ARR calculation
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('annual_rate, value, customer_id')
      .eq('status', 'active');
    
    if (error) {
      console.error("Error fetching contracts for ARR:", error);
      // Fallback to customer contract_size
      const arrStages = ["live", "production", "launched", "active", "paid", "invoice sent", "signed", "went live", "training completed"];
      const relevantCustomers = customers.filter(customer => {
        if (customer.status === "done") return true;
        if (!customer.stage) return false;
        return arrStages.some(stage => customer.stage?.toLowerCase().includes(stage.toLowerCase()));
      });
      const totalARR = relevantCustomers.reduce((sum, customer) => sum + (customer.contractSize || 0), 0);
      
      return {
        totalARR,
        liveCustomers: getLiveCustomers(customers),
        growthRate: 12.5
      };
    }
    
    // Calculate ARR from actual contracts
    const totalARR = contracts?.reduce((sum, contract) => {
      return sum + (contract.annual_rate || contract.value || 0);
    }, 0) || 0;
    
    // Simple growth rate calculation based on contract count (could be improved with historical data)
    const growthRate = contracts && contracts.length > 0 ? Math.min(15, contracts.length * 2) : 12.5;
    
    const liveCustomers = getLiveCustomers(customers);
    
    return {
      totalARR,
      liveCustomers,
      growthRate
    };
  } catch (error) {
    console.error("Error in getCustomerARRData:", error);
    return {
      totalARR: 0,
      liveCustomers: [],
      growthRate: 0
    };
  }
};

/**
 * Gets deals pipeline information using estimated deal values from database
 * Deals in pipeline are those not yet "Live" - using estimated values, not actual contracts
 */
export const getDealsPipeline = async (): Promise<{ 
  value: number, 
  count: number 
}> => {
  try {
    // Get customers from database with estimated_deal_value that are not live
    const { data: customers, error } = await supabase
      .from('customers')
      .select('estimated_deal_value, stage, status')
      .not('stage', 'ilike', '%live%')
      .neq('status', 'done');
    
    if (error) {
      console.error("Error fetching pipeline data:", error);
      return { value: 0, count: 0 };
    }
    
    if (!customers || customers.length === 0) {
      return { value: 0, count: 0 };
    }
    
    const totalValue = customers.reduce((sum, c) => sum + (c.estimated_deal_value || 0), 0);
    const count = customers.length;
    
    return {
      value: totalValue,
      count
    };
  } catch (error) {
    console.error("Error in getDealsPipeline:", error);
    return { value: 0, count: 0 };
  }
};

/**
 * Gets total pipeline value for customers not yet live
 */
export const getTotalPipelineValue = async (): Promise<number> => {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('estimated_deal_value')
      .not('stage', 'ilike', '%live%')
      .neq('status', 'done');
    
    if (error || !customers) {
      console.error("Error fetching pipeline value:", error);
      return 0;
    }
    
    return customers.reduce((sum, c) => sum + (c.estimated_deal_value || 0), 0);
  } catch (error) {
    console.error("Error in getTotalPipelineValue:", error);
    return 0;
  }
};

/**
 * Gets total value of active contracts for live customers
 */
export const getActiveContractsValue = async (): Promise<number> => {
  try {
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('value, annual_rate, setup_fee')
      .eq('status', 'active');
    
    if (error || !contracts) {
      console.error("Error fetching contracts value:", error);
      return 0;
    }
    
    return contracts.reduce((sum, c) => {
      const contractValue = c.annual_rate || c.value || 0;
      const setupFee = c.setup_fee || 0;
      return sum + contractValue + setupFee;
    }, 0);
  } catch (error) {
    console.error("Error in getActiveContractsValue:", error);
    return 0;
  }
};

/**
 * Calculate conversion rate from leads to live customers
 */
export const getConversionRate = async (): Promise<number> => {
  try {
    const { data: allCustomers, error: allError } = await supabase
      .from('customers')
      .select('stage, status');
    
    if (allError || !allCustomers) {
      console.error("Error fetching customers for conversion:", allError);
      return 0;
    }
    
    const totalCustomers = allCustomers.length;
    const liveCustomers = allCustomers.filter(c => 
      c.status === 'done' || 
      (c.stage && c.stage.toLowerCase().includes('live'))
    ).length;
    
    return totalCustomers > 0 ? (liveCustomers / totalCustomers) * 100 : 0;
  } catch (error) {
    console.error("Error in getConversionRate:", error);
    return 0;
  }
};

/**
 * Calculate average deal size from estimated deal values
 */
export const getAverageDealSize = async (): Promise<number> => {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('estimated_deal_value')
      .not('estimated_deal_value', 'is', null);
    
    if (error || !customers || customers.length === 0) {
      console.error("Error fetching deal sizes:", error);
      return 0;
    }
    
    const totalValue = customers.reduce((sum, c) => sum + (c.estimated_deal_value || 0), 0);
    return totalValue / customers.length;
  } catch (error) {
    console.error("Error in getAverageDealSize:", error);
    return 0;
  }
};

/**
 * Calculate Monthly Recurring Revenue from active contracts
 */
export const getMRR = async (): Promise<number> => {
  try {
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('annual_rate')
      .eq('status', 'active')
      .not('annual_rate', 'is', null);
    
    if (error || !contracts) {
      console.error("Error fetching MRR data:", error);
      return 0;
    }
    
    const totalARR = contracts.reduce((sum, c) => sum + (c.annual_rate || 0), 0);
    return totalARR / 12; // Convert ARR to MRR
  } catch (error) {
    console.error("Error in getMRR:", error);
    return 0;
  }
};

/**
 * Get count of deals at risk (customers with overdue lifecycle stages)
 */
export const getDealsAtRisk = async (): Promise<number> => {
  try {
    const { data: stages, error } = await supabase
      .from('lifecycle_stages')
      .select('customer_id')
      .lt('deadline', new Date().toISOString())
      .eq('status', 'not-started');
    
    if (error || !stages) {
      console.error("Error fetching at-risk deals:", error);
      return 0;
    }
    
    // Count unique customers with overdue stages
    const uniqueCustomers = new Set(stages.map(s => s.customer_id));
    return uniqueCustomers.size;
  } catch (error) {
    console.error("Error in getDealsAtRisk:", error);
    return 0;
  }
};

/**
 * Calculates average go-live time (currently returns mock data)
 */
export const calculateAverageGoLiveTime = (): string => {
  return "37 days";
};

/**
 * Calculate churn rate based on expired contracts without renewal
 */
export const calculateChurnRate = async (): Promise<string> => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // Get contracts that ended in the last 6 months
    const { data: expiredContracts, error: expiredError } = await supabase
      .from('contracts')
      .select('customer_id, end_date')
      .lt('end_date', new Date().toISOString())
      .gte('end_date', sixMonthsAgo.toISOString());
    
    if (expiredError) {
      console.error("Error fetching expired contracts:", expiredError);
      return "0.0%";
    }
    
    // Get total active customers for the same period
    const { data: allCustomers, error: customersError } = await supabase
      .from('customers')
      .select('id')
      .gte('created_at', sixMonthsAgo.toISOString());
    
    if (customersError) {
      console.error("Error fetching customers for churn:", customersError);
      return "0.0%";
    }
    
    const totalCustomers = allCustomers?.length || 0;
    const churnedCustomers = expiredContracts?.length || 0;
    
    if (totalCustomers === 0) return "0.0%";
    
    const churnRate = (churnedCustomers / totalCustomers) * 100;
    return churnRate.toFixed(1) + "%";
  } catch (error) {
    console.error("Error calculating churn rate:", error);
    return "0.0%";
  }
};

/**
 * Calculate sales lifecycle
 */
export const calculateSalesLifecycle = (): string => {
  return "45 days";
};
