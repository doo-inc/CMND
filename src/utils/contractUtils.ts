import { Contract } from "@/types/customers";

/**
 * Calculate total contract value using standardized formula
 * Priority: setup_fee + annual_rate, fallback to legacy value field
 */
export const calculateContractValue = (contract: Contract | any): number => {
  // New structure: setup_fee + annual_rate
  const setupFee = contract.setup_fee || 0;
  const annualRate = contract.annual_rate || 0;
  
  // If new structure is available, use it
  if (setupFee > 0 || annualRate > 0) {
    return setupFee + annualRate;
  }
  
  // Fallback to legacy value field
  return contract.value || 0;
};

/**
 * Calculate total lifetime value for multiple contracts
 */
export const calculateLifetimeValue = (contracts: (Contract | any)[]): number => {
  return contracts.reduce((total, contract) => {
    return total + calculateContractValue(contract);
  }, 0);
};

/**
 * Calculate effective annual rate from active/pending contracts
 */
export const calculateEffectiveAnnualRate = (contracts: (Contract | any)[]): number => {
  const activeContracts = contracts.filter(c => ['active', 'pending'].includes(c.status));
  
  return activeContracts.reduce((total, contract) => {
    // Use annual_rate if available, otherwise treat value as annual rate for backward compatibility
    const annualRate = contract.annual_rate || 0;
    const legacyValue = (!contract.setup_fee && !contract.annual_rate && contract.value) ? contract.value : 0;
    
    return total + annualRate + legacyValue;
  }, 0);
};

/**
 * Get the latest contract end date from active/pending contracts
 */
export const getLatestContractEndDate = (contracts: (Contract | any)[]): string | null => {
  const activeContracts = contracts.filter(c => ['active', 'pending'].includes(c.status));
  
  return activeContracts.reduce((latest, contract) => {
    if (!latest || new Date(contract.end_date) > new Date(latest)) {
      return contract.end_date;
    }
    return latest;
  }, null);
};

/**
 * Format currency value for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Shared React Query keys for contract-related data
 */
export const contractQueryKeys = {
  all: ['contracts'] as const,
  lists: () => [...contractQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...contractQueryKeys.lists(), { filters }] as const,
  details: () => [...contractQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...contractQueryKeys.details(), id] as const,
  customer: (customerId: string) => [...contractQueryKeys.all, 'customer', customerId] as const,
  subscription: () => ['subscription-tracker-with-contracts'] as const,
};