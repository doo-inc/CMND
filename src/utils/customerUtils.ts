import { supabase } from "@/integrations/supabase/client";
import { CustomerData } from "@/types/customers";

export const formatCurrency = (amount: number, includeDecimals: boolean = true): string => {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(amount);
  
  return formattedAmount;
};

export const getLiveCustomers = async (): Promise<CustomerData[]> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or('status.eq.done,stage.eq.Live'); // Check both status and stage for live customers

    if (error) {
      console.error("Error fetching live customers:", error);
      return [];
    }

    return (data || []).map(customer => ({
      id: customer.id,
      name: customer.name,
      logo: customer.logo || undefined,
      segment: customer.segment || "Unknown Segment",
      country: customer.country || "Unknown Country",
      stage: customer.stage || "Lead",
      status: (customer.status as "not-started" | "in-progress" | "done" | "blocked") || "not-started",
      contractSize: customer.contract_size || 0,
      owner: {
        id: customer.owner_id || "unknown",
        name: "Account Manager",
        role: "Sales"
      }
    }));
  } catch (error) {
    console.error("Error in getLiveCustomers:", error);
    return [];
  }
};

export const getCustomerARRData = async (customers: CustomerData[]) => {
  try {
    // Get live customers (those who have completed Go Live)
    const { data: liveCustomersData, error } = await supabase
      .from('customers')
      .select(`
        *,
        lifecycle_stages!inner(name, status)
      `)
      .eq('lifecycle_stages.name', 'Go Live')
      .eq('lifecycle_stages.status', 'done');

    if (error) {
      console.error("Error fetching live customers for ARR:", error);
      return { totalARR: 0, liveCustomers: [], growthRate: 0 };
    }

    const liveCustomers = (liveCustomersData || []).map(customer => ({
      id: customer.id,
      name: customer.name,
      logo: customer.logo || undefined,
      segment: customer.segment || "Unknown Segment",
      country: customer.country || "Unknown Country",
      stage: "Live",
      status: "done" as const,
      contractSize: customer.contract_size || 0,
      owner: {
        id: customer.owner_id || "unknown",
        name: "Account Manager",
        role: "Sales"
      }
    }));

    const totalARR = liveCustomers.reduce((sum, customer) => sum + customer.contractSize, 0);
    
    return {
      totalARR,
      liveCustomers,
      growthRate: 14 // Placeholder growth rate
    };
  } catch (error) {
    console.error("Error in getCustomerARRData:", error);
    return { totalARR: 0, liveCustomers: [], growthRate: 0 };
  }
};

export const getDealsPipeline = async () => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('contract_size, estimated_deal_value, stage')
      .not('stage', 'eq', 'Live')
      .not('stage', 'is', null);

    if (error) {
      console.error("Error fetching deals pipeline:", error);
      return { value: 0, count: 0 };
    }

    const deals = data || [];
    const totalValue = deals.reduce((sum, deal) => 
      sum + (deal.estimated_deal_value || deal.contract_size || 0), 0
    );

    return {
      value: totalValue,
      count: deals.length
    };
  } catch (error) {
    console.error("Error in getDealsPipeline:", error);
    return { value: 0, count: 0 };
  }
};

export const getTotalPipelineValue = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('contract_size, estimated_deal_value, stage')
      .not('stage', 'eq', 'Live')
      .not('stage', 'is', null);

    if (error) {
      console.error("Error fetching total pipeline value:", error);
      return 0;
    }

    return (data || []).reduce((sum, customer) => 
      sum + (customer.estimated_deal_value || customer.contract_size || 0), 0
    );
  } catch (error) {
    console.error("Error in getTotalPipelineValue:", error);
    return 0;
  }
};

export const getActiveContractsValue = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('contract_size')
      .or('status.eq.done,stage.eq.Live');

    if (error) {
      console.error("Error fetching active contracts value:", error);
      return 0;
    }

    return (data || []).reduce((sum, customer) => sum + (customer.contract_size || 0), 0);
  } catch (error) {
    console.error("Error in getActiveContractsValue:", error);
    return 0;
  }
};

export const getConversionRate = async (): Promise<number> => {
  try {
    const { data: totalCustomers, error: totalError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' });

    const { data: liveCustomers, error: liveError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' })
      .or('status.eq.done,stage.eq.Live');

    if (totalError || liveError) {
      console.error("Error calculating conversion rate:", totalError || liveError);
      return 0;
    }

    const totalCount = totalCustomers?.length || 0;
    const liveCount = liveCustomers?.length || 0;

    return totalCount > 0 ? (liveCount / totalCount) * 100 : 0;
  } catch (error) {
    console.error("Error in getConversionRate:", error);
    return 0;
  }
};

export const getAverageDealSize = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('contract_size, estimated_deal_value')
      .not('stage', 'eq', 'Live')
      .not('stage', 'is', null);

    if (error) {
      console.error("Error fetching average deal size:", error);
      return 0;
    }

    const deals = data || [];
    if (deals.length === 0) return 0;

    const totalValue = deals.reduce((sum, deal) => 
      sum + (deal.estimated_deal_value || deal.contract_size || 0), 0
    );

    return Math.round(totalValue / deals.length);
  } catch (error) {
    console.error("Error in getAverageDealSize:", error);
    return 0;
  }
};

export const getMRR = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('contract_size, annual_rate')
      .or('status.eq.done,stage.eq.Live');

    if (error) {
      console.error("Error fetching MRR:", error);
      return 0;
    }

    const totalAnnualRevenue = (data || []).reduce((sum, customer) => 
      sum + (customer.annual_rate || customer.contract_size || 0), 0
    );

    return Math.round(totalAnnualRevenue / 12);
  } catch (error) {
    console.error("Error in getMRR:", error);
    return 0;
  }
};

export const getDealsAtRisk = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('lifecycle_stages')
      .select('id', { count: 'exact' })
      .eq('status', 'blocked')
      .or('deadline.lt.now()');

    if (error) {
      console.error("Error fetching deals at risk:", error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error("Error in getDealsAtRisk:", error);
    return 0;
  }
};

export const calculateAverageGoLiveTime = async (): Promise<number> => {
  try {
    // Fetch all customers who have reached the "Go Live" stage
    const { data, error } = await supabase
      .from('lifecycle_stages')
      .select('customer_id, created_at')
      .eq('name', 'Go Live')
      .eq('status', 'done');

    if (error) {
      console.error("Error fetching Go Live dates:", error);
      return 0;
    }

    if (!data || data.length === 0) {
      console.log("No customers have reached Go Live yet.");
      return 0;
    }

    // Calculate the time difference between the customer's creation date and Go Live date
    let totalTime = 0;
    for (const goLive of data) {
      // Fetch the customer's creation date
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('created_at')
        .eq('id', goLive.customer_id)
        .single();

      if (customerError) {
        console.error(`Error fetching customer creation date for ${goLive.customer_id}:`, customerError);
        continue; // Skip this customer if there's an error
      }

      if (!customerData || !customerData.created_at) {
        console.warn(`Customer creation date not found for ${goLive.customer_id}.`);
        continue; // Skip this customer if creation date is missing
      }

      const startDate = new Date(customerData.created_at);
      const endDate = new Date(goLive.created_at); // Use the lifecycle stage creation date
      const timeDiff = endDate.getTime() - startDate.getTime(); // Difference in milliseconds
      totalTime += timeDiff;
    }

    const averageTimeMs = totalTime / data.length;
    const averageTimeDays = averageTimeMs / (1000 * 3600 * 24); // Convert milliseconds to days

    return Math.round(averageTimeDays); // Return average time in days
  } catch (error) {
    console.error("Error calculating average Go Live time:", error);
    return 0;
  }
};

export const calculateSalesLifecycle = async (): Promise<number> => {
  try {
    // Fetch all customers with their creation date and contract signed date
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id,
        created_at,
        lifecycle_stages (
          created_at,
          name
        )
      `);

    if (error) {
      console.error("Error fetching customer data:", error);
      return 0;
    }

    let totalLifecycle = 0;
    let validCustomerCount = 0;

    for (const customer of data) {
      // Find the 'Contract Signed' lifecycle stage
      const contractSignedStage = customer.lifecycle_stages?.find(
        (stage: any) => stage.name === 'Contract Signed'
      );

      if (contractSignedStage) {
        const startDate = new Date(customer.created_at);
        const endDate = new Date(contractSignedStage.created_at);
        const lifecycleTime = endDate.getTime() - startDate.getTime();
        totalLifecycle += lifecycleTime;
        validCustomerCount++;
      }
    }

    if (validCustomerCount === 0) {
      console.log("No customers with 'Contract Signed' stage found.");
      return 0;
    }

    const averageLifecycleMs = totalLifecycle / validCustomerCount;
    const averageLifecycleDays = averageLifecycleMs / (1000 * 3600 * 24);

    return Math.round(averageLifecycleDays);
  } catch (error) {
    console.error("Error calculating sales lifecycle:", error);
    return 0;
  }
};

export const calculateChurnRate = async (): Promise<string> => {
  try {
    // This is a simplified calculation - in reality you'd track churned customers over time
    const { data: totalCustomers, error: totalError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' });

    const { data: liveCustomers, error: liveError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' })
      .or('status.eq.done,stage.eq.Live');

    if (totalError || liveError) {
      console.error("Error calculating churn rate:", totalError || liveError);
      return "0.0%";
    }

    const totalCount = totalCustomers?.length || 0;
    const liveCount = liveCustomers?.length || 0;
    const churnedCount = totalCount - liveCount;

    const churnRate = totalCount > 0 ? (churnedCount / totalCount) * 100 : 0;
    return `${churnRate.toFixed(1)}%`;
  } catch (error) {
    console.error("Error in calculateChurnRate:", error);
    return "0.0%";
  }
};
