import { supabase } from "@/integrations/supabase/client";

export type ActivityAction = 
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'customer_created'
  | 'customer_updated'
  | 'customer_deleted'
  | 'contract_created'
  | 'contract_updated'
  | 'contract_deleted'
  | 'partnership_created'
  | 'partnership_updated'
  | 'partnership_deleted'
  | 'stage_changed'
  | 'login'
  | 'logout';

export type EntityType = 'user' | 'customer' | 'contract' | 'partnership' | 'stage' | 'system';

interface LogActivityParams {
  action: ActivityAction | string;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
}

/**
 * Log an activity to the activity_logs table
 */
export const logActivity = async ({
  action,
  entityType,
  entityId,
  entityName,
  details = {}
}: LogActivityParams): Promise<void> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    let userName: string | null = null;
    let userEmail: string | null = null;

    if (user) {
      userEmail = user.email || null;
      
      // Try to get full name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      userName = profile?.full_name || user.user_metadata?.full_name || null;
    }

    const { error } = await (supabase as any)
      .from('activity_logs')
      .insert({
        user_id: user?.id || null,
        user_email: userEmail,
        user_name: userName,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        entity_name: entityName || null,
        details
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
    // Don't throw - activity logging should not break the main flow
  }
};

/**
 * Quick helper functions for common actions
 */
export const logCustomerCreated = (customerId: string, customerName: string, details?: Record<string, any>) =>
  logActivity({ action: 'customer_created', entityType: 'customer', entityId: customerId, entityName: customerName, details });

export const logCustomerUpdated = (customerId: string, customerName: string, details?: Record<string, any>) =>
  logActivity({ action: 'customer_updated', entityType: 'customer', entityId: customerId, entityName: customerName, details });

export const logCustomerDeleted = (customerId: string, customerName: string) =>
  logActivity({ action: 'customer_deleted', entityType: 'customer', entityId: customerId, entityName: customerName });

export const logContractCreated = (contractId: string, contractName: string, details?: Record<string, any>) =>
  logActivity({ action: 'contract_created', entityType: 'contract', entityId: contractId, entityName: contractName, details });

export const logContractUpdated = (contractId: string, contractName: string, details?: Record<string, any>) =>
  logActivity({ action: 'contract_updated', entityType: 'contract', entityId: contractId, entityName: contractName, details });

export const logContractDeleted = (contractId: string, contractName: string) =>
  logActivity({ action: 'contract_deleted', entityType: 'contract', entityId: contractId, entityName: contractName });

export const logUserCreated = (userId: string, userEmail: string, details?: Record<string, any>) =>
  logActivity({ action: 'user_created', entityType: 'user', entityId: userId, entityName: userEmail, details });

export const logStageChanged = (customerId: string, customerName: string, fromStage: string, toStage: string) =>
  logActivity({ 
    action: 'stage_changed', 
    entityType: 'stage', 
    entityId: customerId, 
    entityName: customerName, 
    details: { from: fromStage, to: toStage } 
  });

