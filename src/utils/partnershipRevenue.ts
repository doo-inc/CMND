import { supabase } from "@/integrations/supabase/client";
import type { Contract } from "@/types/customers";

interface ContractWithCustomer extends Contract {
  customer?: {
    id: string;
    name: string;
    logo?: string | null;
  };
}

interface PartnershipRevenueSummary {
  totalRevenue: number;
  contractCount: number;
  customerCount: number;
  averageDealSize: number;
}

interface TopPartnership {
  id: string;
  name: string;
  revenue: number;
}

export const getLinkedContracts = async (partnershipId: string): Promise<ContractWithCustomer[]> => {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      customer:customers!inner(
        id,
        name,
        logo
      )
    `)
    .eq('partnership_id', partnershipId);

  if (error) {
    console.error('Error fetching linked contracts:', error);
    throw error;
  }

  return data || [];
};

export const getAvailableContracts = async (partnershipId: string): Promise<ContractWithCustomer[]> => {
  // Fetch contracts that are not linked to any partnership (available to link)
  // Also include contracts already linked to this partnership (so they can be seen and potentially unlinked)
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      customer:customers!inner(
        id,
        name,
        logo
      )
    `)
    .or(`partnership_id.is.null,partnership_id.eq.${partnershipId}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching available contracts:', error);
    // If the error is about the OR syntax, try an alternative approach
    if (error.message?.includes('or') || error.code === 'PGRST116') {
      // Fallback: fetch all contracts and filter in JavaScript
      const { data: allContracts, error: allError } = await supabase
        .from('contracts')
        .select(`
          *,
          customer:customers!inner(
            id,
            name,
            logo
          )
        `)
        .order('created_at', { ascending: false });
      
      if (allError) {
        throw allError;
      }
      
      // Filter to show only contracts that are null or linked to this partnership
      return (allContracts || []).filter(
        (contract: any) => !contract.partnership_id || contract.partnership_id === partnershipId
      );
    }
    throw error;
  }

  return data || [];
};

export const linkContractToPartnership = async (contractId: string, partnershipId: string): Promise<void> => {
  const { error } = await supabase
    .from('contracts')
    .update({ partnership_id: partnershipId })
    .eq('id', contractId);

  if (error) {
    console.error('Error linking contract to partnership:', error);
    throw error;
  }
};

export const unlinkContractFromPartnership = async (contractId: string): Promise<void> => {
  const { error } = await supabase
    .from('contracts')
    .update({ partnership_id: null })
    .eq('id', contractId);

  if (error) {
    console.error('Error unlinking contract from partnership:', error);
    throw error;
  }
};

export const calculateContractValue = (contract: any): number => {
  // Use setup_fee + annual_rate if available, otherwise use value
  const setupFee = contract.setup_fee || 0;
  const annualRate = contract.annual_rate || 0;
  
  if (setupFee > 0 || annualRate > 0) {
    return setupFee + annualRate;
  }
  
  return contract.value || 0;
};

export const calculatePartnershipRevenue = (contracts: any[]): PartnershipRevenueSummary => {
  const totalRevenue = contracts.reduce((sum, contract) => sum + calculateContractValue(contract), 0);
  const contractCount = contracts.length;
  const uniqueCustomers = new Set(contracts.map(c => c.customer_id));
  const customerCount = uniqueCustomers.size;
  const averageDealSize = contractCount > 0 ? totalRevenue / contractCount : 0;

  return {
    totalRevenue,
    contractCount,
    customerCount,
    averageDealSize,
  };
};

export const getTopPartnershipsByRevenue = async (limit: number = 5, filterTypes?: string[]): Promise<TopPartnership[]> => {
  // Build the partnerships query
  let partnershipsQuery = supabase
    .from('partnerships')
    .select('id, name, partnership_type');

  // Apply filter if types are specified - cast to enum array for type safety
  if (filterTypes && filterTypes.length > 0) {
    const validTypes = filterTypes as Array<"consultant" | "education_partner" | "mou_partner" | "platform_partner" | "reseller">;
    partnershipsQuery = partnershipsQuery.in('partnership_type', validTypes);
  }

  const { data: partnerships, error: partnershipsError } = await partnershipsQuery;

  if (partnershipsError) {
    console.error('Error fetching partnerships:', partnershipsError);
    return [];
  }

  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select('*')
    .not('partnership_id', 'is', null);

  if (contractsError) {
    console.error('Error fetching contracts:', contractsError);
    return [];
  }

  // Create a set of filtered partnership IDs for quick lookup
  const filteredPartnershipIds = new Set(partnerships?.map(p => p.id) || []);

  // Group contracts by partnership and calculate revenue
  const revenueByPartnership = new Map<string, number>();
  
  contracts?.forEach(contract => {
    if (contract.partnership_id && filteredPartnershipIds.has(contract.partnership_id)) {
      const currentRevenue = revenueByPartnership.get(contract.partnership_id) || 0;
      revenueByPartnership.set(contract.partnership_id, currentRevenue + calculateContractValue(contract));
    }
  });

  // Create top partnerships array
  const topPartnerships: TopPartnership[] = [];
  partnerships?.forEach(partnership => {
    const revenue = revenueByPartnership.get(partnership.id) || 0;
    if (revenue > 0) {
      topPartnerships.push({
        id: partnership.id,
        name: partnership.name,
        revenue,
      });
    }
  });

  // Sort by revenue and take top N
  return topPartnerships
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
};
