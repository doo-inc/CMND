import { supabase } from "@/integrations/supabase/client";

export interface Payment {
  id: string;
  contract_id: string;
  customer_id: string;
  amount: number;
  due_date: string;
  payment_date?: string | null;
  status: "pending" | "paid" | "overdue";
  payment_type: "setup" | "recurring";
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all payments for a customer
 */
export const getCustomerPayments = async (customerId: string): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('customer_id', customerId)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching customer payments:', error);
    throw error;
  }

  return (data || []) as Payment[];
};

/**
 * Get payments for a specific contract
 */
export const getContractPayments = async (contractId: string): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('contract_id', contractId)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching contract payments:', error);
    throw error;
  }

  return (data || []) as Payment[];
};

/**
 * Mark a payment as paid
 */
export const markPaymentAsPaid = async (paymentId: string, paymentDate?: string): Promise<void> => {
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      payment_date: paymentDate || new Date().toISOString().split('T')[0]
    })
    .eq('id', paymentId);

  if (error) {
    console.error('Error marking payment as paid:', error);
    throw error;
  }
};

/**
 * Update payment status for overdue payments
 */
export const updatePaymentStatus = async (): Promise<void> => {
  const { error } = await supabase.rpc('update_payment_status');

  if (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
};

/**
 * Get payment summary for a customer
 */
export const getPaymentSummary = async (customerId: string) => {
  const payments = await getCustomerPayments(customerId);
  
  const summary = {
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    nextPaymentDue: null as Payment | null,
    overdueCount: 0
  };

  const today = new Date().toISOString().split('T')[0];

  payments.forEach(payment => {
    switch (payment.status) {
      case 'paid':
        summary.totalPaid += payment.amount;
        break;
      case 'pending':
        summary.totalPending += payment.amount;
        if (!summary.nextPaymentDue || payment.due_date < summary.nextPaymentDue.due_date) {
          summary.nextPaymentDue = payment;
        }
        break;
      case 'overdue':
        summary.totalOverdue += payment.amount;
        summary.overdueCount++;
        break;
    }
  });

  return summary;
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
 * Get payment frequency display name
 */
export const getPaymentFrequencyDisplay = (frequency: string): string => {
  switch (frequency) {
    case 'quarterly':
      return 'Quarterly';
    case 'semi_annual':
      return 'Semi-Annual';
    case 'annual':
    default:
      return 'Annual';
  }
};

/**
 * Get status color for payments
 */
export const getPaymentStatusColor = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'success';
    case 'overdue':
      return 'destructive';
    case 'pending':
    default:
      return 'secondary';
  }
};