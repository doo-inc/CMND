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
    // Get all customers who have active contracts (not churned)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .neq('status', 'churned');

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
    const { data: contractsData, error: contractsError } = await supabase
      .from('contracts')
      .select(`
        annual_rate,
        customer_id,
        customers!inner(
          id,
          name,
          logo,
          segment,
          country,
          owner_id,
          status,
          stage
        )
      `)
      .or('status.eq.active,status.eq.pending,status.is.null')
      .gt('end_date', new Date().toISOString());

    if (contractsError) {
      console.error("Error fetching ARR from contracts:", contractsError);
      return { totalARR: 0, liveCustomers: [], growthRate: 0 };
    }

    const customerARRMap = new Map();
    (contractsData || []).forEach(contract => {
      const customer = contract.customers;
      const customerId = customer.id;
      
      // Only include customers with active contracts (exclude churned)
      if (customer.status === 'churned') {
        return;
      }
      
      if (!customerARRMap.has(customerId)) {
        customerARRMap.set(customerId, {
          id: customer.id,
          name: customer.name,
          logo: customer.logo || undefined,
          segment: customer.segment || "Unknown Segment",
          country: customer.country || "Unknown Country",
          stage: customer.stage || "Live",
          status: customer.status as "not-started" | "in-progress" | "done" | "blocked" | "churned" || "done",
          contractSize: 0,
          owner: {
            id: customer.owner_id || "unknown",
            name: "Account Manager",
            role: "Sales"
          }
        });
      }
      
      const existingCustomer = customerARRMap.get(customerId);
      // ARR excludes setup fees and one-time payments
      existingCustomer.contractSize += contract.annual_rate || 0;
    });

    const liveCustomers = Array.from(customerARRMap.values());
    const totalARR = liveCustomers.reduce((sum, customer) => sum + customer.contractSize, 0);
    
    return {
      totalARR,
      liveCustomers,
      growthRate: 14
    };
  } catch (error) {
    console.error("Error in getCustomerARRData:", error);
    return { totalARR: 0, liveCustomers: [], growthRate: 0 };
  }
};

export const getDealsPipeline = async () => {
  try {
    // Use same logic as DealsPipelineDetail: include customers that are not churned and not done (include NULL status)
    const { data, error } = await supabase
      .from('customers')
      .select('contract_size, estimated_deal_value, stage, status')
      .or('status.is.null,status.neq.churned.and.status.neq.done');

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
    // Use same logic as DealsPipelineDetail: include customers that are not churned and not done (include NULL status)
    const { data, error } = await supabase
      .from('customers')
      .select('contract_size, estimated_deal_value, stage, status')
      .or('status.is.null,status.neq.churned.and.status.neq.done');

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
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    const { data, error } = await supabase
      .from('contracts')
      .select('setup_fee, annual_rate, value, start_date, end_date, status')
      .or('status.eq.active,status.eq.pending,status.is.null')
      .gte('end_date', yearStart)
      .lte('start_date', yearEnd);

    if (error) {
      console.error("Error fetching total revenue:", error);
      return 0;
    }

    console.log('getActiveContractsValue: Fetched contracts:', data?.length);
    console.log('getActiveContractsValue: Contract details:', (data || []).map((c, index) => ({
      index: index + 1,
      setup_fee: c.setup_fee,
      annual_rate: c.annual_rate,
      value: c.value,
      calculated: (c.setup_fee > 0 || c.annual_rate > 0) 
        ? (c.setup_fee || 0) + (c.annual_rate || 0)
        : (c.value || 0)
    })));

    const totalRevenue = (data || []).reduce((sum, contract) => {
      // Use setup_fee + annual_rate if available, otherwise fallback to value
      const contractValue = (contract.setup_fee > 0 || contract.annual_rate > 0) 
        ? (contract.setup_fee || 0) + (contract.annual_rate || 0)
        : (contract.value || 0);
      return sum + contractValue;
    }, 0);

    console.log('getActiveContractsValue: Total calculated:', totalRevenue);
    return totalRevenue;
  } catch (error) {
    console.error("Error in getActiveContractsValue (Total Revenue):", error);
    return 0;
  }
};

export const getConversionRate = async (): Promise<number> => {
  try {
    const { data: totalCustomers, error: totalError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' });

    // Get all customers with active contracts (live customers)
    const { data: liveCustomers, error: liveError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' })
      .neq('status', 'churned');

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
    // Use same logic as DealsPipelineDetail: include customers that are not churned and not done (include NULL status)
    const { data, error } = await supabase
      .from('customers')
      .select('contract_size, estimated_deal_value, status')
      .or('status.is.null,status.neq.churned.and.status.neq.done');

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
      .from('contracts')
      .select('annual_rate, end_date, status')
      .or('status.eq.active,status.eq.pending,status.is.null')
      .gt('end_date', new Date().toISOString());

    if (error) {
      console.error("Error fetching MRR from contracts:", error);
      return 0;
    }

    const totalAnnualRevenue = (data || []).reduce((sum, contract) => 
      sum + (contract.annual_rate || 0), 0
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

    let totalTime = 0;
    for (const goLive of data) {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('created_at')
        .eq('id', goLive.customer_id)
        .single();

      if (customerError) {
        console.error(`Error fetching customer creation date for ${goLive.customer_id}:`, customerError);
        continue;
      }

      if (!customerData || !customerData.created_at) {
        console.warn(`Customer creation date not found for ${goLive.customer_id}.`);
        continue;
      }

      const startDate = new Date(customerData.created_at);
      const endDate = new Date(goLive.created_at);
      const timeDiff = endDate.getTime() - startDate.getTime();
      totalTime += timeDiff;
    }

    const averageTimeMs = totalTime / data.length;
    const averageTimeDays = averageTimeMs / (1000 * 3600 * 24);

    return Math.round(averageTimeDays);
  } catch (error) {
    console.error("Error calculating average Go Live time:", error);
    return 0;
  }
};

export const calculateSalesLifecycle = async (): Promise<number> => {
  try {
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

export const calculateChurnRate = async (periodDays: number = 30): Promise<string> => {
  try {
    const periodStartDate = new Date();
    periodStartDate.setDate(periodStartDate.getDate() - periodDays);
    
    // Get all customers with active contracts at period start
    const { data: liveCustomersAtStart, error: liveStartError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' })
      .neq('status', 'churned')
      .lt('created_at', periodStartDate.toISOString());

    const { data: churnedCustomers, error: churnError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' })
      .eq('status', 'churned')
      .gte('churn_date', periodStartDate.toISOString())
      .lte('churn_date', new Date().toISOString());

    const { data: totalCustomers, error: totalError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' })
      .neq('status', 'churned');

    if (liveStartError || churnError || totalError) {
      console.error("Error calculating churn rate:", liveStartError || churnError || totalError);
      return "0.0%";
    }

    const liveCount = liveCustomersAtStart?.length || 0;
    const churnedCount = churnedCustomers?.length || 0;
    const totalCount = totalCustomers?.length || 0;

    let churnRate: number;
    
    if (liveCount < 3) {
      churnRate = totalCount > 0 ? (churnedCount / (totalCount + churnedCount)) * 100 : 0;
      console.log(`Using simple ratio method: ${churnedCount} churned / ${totalCount + churnedCount} total = ${churnRate.toFixed(1)}%`);
    } else {
      churnRate = liveCount > 0 ? (churnedCount / liveCount) * 100 : 0;
      console.log(`Using traditional method: ${churnedCount} churned / ${liveCount} at period start = ${churnRate.toFixed(1)}%`);
    }

    return `${churnRate.toFixed(1)}%`;
  } catch (error) {
    console.error("Error in calculateChurnRate:", error);
    return "0.0%";
  }
};

export const getMonthlyChurnRate = async (): Promise<string> => {
  return calculateChurnRate(30);
};

export const getQuarterlyChurnRate = async (): Promise<string> => {
  return calculateChurnRate(90);
};

export const updateCustomerChurnStatus = async (): Promise<void> => {
  try {
    const { error } = await supabase.rpc('update_customer_churn_status');
    
    if (error) {
      console.error("Error updating customer churn status:", error);
      throw error;
    }
    
    console.log("Customer churn status updated successfully");
  } catch (error) {
    console.error("Error in updateCustomerChurnStatus:", error);
    throw error;
  }
};

export const getImprovedConversionRate = async (): Promise<number> => {
  try {
    const { data: totalCustomers, error: totalError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' })
      .neq('status', 'churned');

    const { data: liveCustomers, error: liveError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' })
      .eq('status', 'done');

    if (totalError || liveError) {
      console.error("Error calculating improved conversion rate:", totalError || liveError);
      return 0;
    }

    const totalCount = totalCustomers?.length || 0;
    const liveCount = liveCustomers?.length || 0;

    return totalCount > 0 ? (liveCount / totalCount) * 100 : 0;
  } catch (error) {
    console.error("Error in getImprovedConversionRate:", error);
    return 0;
  }
};
