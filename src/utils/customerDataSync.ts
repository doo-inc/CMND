import { supabase } from "@/integrations/supabase/client";
import { customers as realCustomers } from "@/data/realCustomers";

/**
 * Syncs all customers from the local data to the database if they don't exist
 * This function is called automatically on application startup
 */
export const syncCustomersToDatabase = async (): Promise<boolean> => {
  try {
    console.log("Starting customer data sync check to database...");
    
    const { data: existingCustomers, error: fetchError } = await supabase
      .from('customers')
      .select('name');
      
    if (fetchError) {
      console.error("Error checking existing customers:", fetchError);
      return false;
    }
    
    const existingNames = new Set(existingCustomers?.map(c => c.name.toLowerCase()) || []);
    
    // Find customers that don't exist in the database yet
    const customersToInsert = realCustomers.filter(
      c => !existingNames.has(c.name.toLowerCase())
    ).map(customer => {
      // Generate a valid UUID for each customer
      return {
        id: crypto.randomUUID(),
        name: customer.name,
        segment: customer.segment || null,
        region: customer.region || null,
        stage: customer.stage || null,
        status: "not-started",
        contract_size: customer.contractSize || 0,
        owner_id: "00000000-0000-0000-0000-000000000001" // Default owner
      };
    });
    
    if (customersToInsert.length === 0) {
      console.log("No new customers to sync to database");
      return true;
    }
    
    console.log(`Found ${customersToInsert.length} new customers to sync to database`);
    
    // Insert new customers in batches to avoid too large requests
    for (let i = 0; i < customersToInsert.length; i += 50) {
      const batch = customersToInsert.slice(i, i + 50);
      const { error: insertError } = await supabase
        .from('customers')
        .insert(batch);
      
      if (insertError) {
        console.error(`Error inserting batch ${i}-${i+batch.length}:`, insertError);
      }
    }
    
    console.log(`Successfully synced new customers to the database`);
    
    // After sync, remove any duplicates in the database
    await removeDuplicateCustomers();
    
    return true;
  } catch (error) {
    console.error("Error in syncCustomersToDatabase:", error);
    return false;
  }
};

/**
 * Remove duplicate customers from the database based on name
 */
export const removeDuplicateCustomers = async (): Promise<boolean> => {
  try {
    console.log("Checking for duplicate customers...");
    
    // Get all customers
    const { data: allCustomers, error: fetchError } = await supabase
      .from('customers')
      .select('id, name')
      .order('created_at', { ascending: true });
      
    if (fetchError) {
      console.error("Error fetching customers for deduplication:", fetchError);
      return false;
    }

    if (!allCustomers || allCustomers.length === 0) {
      console.log("No customers found to check for duplicates");
      return true;
    }
    
    // Group customers by lowercase name
    const customersByName: Record<string, any[]> = {};
    allCustomers.forEach(customer => {
      const lowerName = customer.name.toLowerCase();
      if (!customersByName[lowerName]) {
        customersByName[lowerName] = [];
      }
      customersByName[lowerName].push(customer);
    });
    
    // Find duplicate sets (more than one customer with same name)
    const duplicateSets = Object.values(customersByName).filter(set => set.length > 1);
    
    if (duplicateSets.length === 0) {
      console.log("No duplicate customers found");
      return true;
    }
    
    console.log(`Found ${duplicateSets.length} sets of duplicate customers`);
    
    // For each set of duplicates, keep the first one and delete the rest
    for (const duplicateSet of duplicateSets) {
      // The first customer in each set is the one we'll keep
      const toKeep = duplicateSet[0];
      const toDelete = duplicateSet.slice(1).map(cust => cust.id);
      
      console.log(`Keeping customer "${toKeep.name}" (${toKeep.id}) and removing ${toDelete.length} duplicates`);
      
      // Delete duplicates
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .in('id', toDelete);
        
      if (deleteError) {
        console.error("Error deleting duplicate customers:", deleteError);
      }
    }
    
    console.log("Duplicate customer removal completed");
    return true;
  } catch (error) {
    console.error("Error in removeDuplicateCustomers:", error);
    return false;
  }
};

/**
 * Helper function to ensure a customer exists in the database
 * If not, it will be created from the real customer data
 */
export const ensureCustomerExists = async (customerId: string): Promise<boolean> => {
  try {
    // For existing UUIDs in the database, we'll use them directly
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      // Check if customer exists
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('id', customerId);
      
      if (error) {
        console.error("Error checking customer:", error);
        return false;
      }
      
      // If customer exists, return true
      if (data && data.length > 0) {
        return true;
      }
    }
    
    // For non-UUID identifiers, we need to look up by name in the real data
    const customer = realCustomers.find(c => 
      c.id === customerId || 
      c.name.toLowerCase().includes(customerId.toLowerCase())
    );
    
    if (!customer) {
      console.error("Customer not found in real data:", customerId);
      return false;
    }
    
    // Check if customer with this name already exists in the database
    const { data: existingData, error: existingError } = await supabase
      .from('customers')
      .select('id')
      .ilike('name', customer.name);
      
    if (existingError) {
      console.error("Error checking existing customer by name:", existingError);
      return false;
    }
    
    // If customer already exists, return true
    if (existingData && existingData.length > 0) {
      console.log("Found existing customer with name:", customer.name);
      return true;
    }
    
    // Create a new valid UUID for this customer
    const dbCustomerId = crypto.randomUUID();
    
    // Insert the customer
    const { error: insertError } = await supabase
      .from('customers')
      .insert({
        id: dbCustomerId,
        name: customer.name,
        segment: customer.segment || null,
        region: customer.region || null,
        stage: customer.stage || null,
        status: "not-started",
        contract_size: customer.contractSize || 0,
        owner_id: "00000000-0000-0000-0000-000000000001" // Default owner
      });
    
    if (insertError) {
      console.error("Error inserting customer:", insertError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in ensureCustomerExists:", error);
    return false;
  }
};

/**
 * Check for duplicate lifecycle stages and remove them
 */
export const checkForDuplicateStages = async (customerId: string): Promise<boolean> => {
  try {
    const dbCustomerId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId) 
      ? customerId 
      : `00000000-0000-0000-0000-${customerId.replace(/\D/g, '').padStart(12, '0')}`;
      
    // Get all stages for this customer
    const { data: stages, error } = await supabase
      .from('lifecycle_stages')
      .select('*')
      .eq('customer_id', dbCustomerId);
      
    if (error) {
      console.error("Error checking for duplicate stages:", error);
      return false;
    }
    
    if (!stages || stages.length === 0) {
      return true; // No stages to check
    }
    
    // Group stages by name to find duplicates
    const stagesByName: Record<string, any[]> = {};
    stages.forEach(stage => {
      const key = `${stage.name.toLowerCase()}-${stage.category || ''}`;
      if (!stagesByName[key]) {
        stagesByName[key] = [];
      }
      stagesByName[key].push(stage);
    });
    
    // Find duplicate sets
    const duplicateSets = Object.values(stagesByName).filter(set => set.length > 1);
    
    if (duplicateSets.length === 0) {
      console.log("No duplicate stages found");
      return true;
    }
    
    console.log(`Found ${duplicateSets.length} sets of duplicate stages`);
    
    // For each set of duplicates, keep the most complete one and delete the rest
    for (const duplicateSet of duplicateSets) {
      // Sort by completeness (done > in-progress > others)
      duplicateSet.sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return -1;
        if (a.status !== 'done' && b.status === 'done') return 1;
        if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
        if (a.status !== 'in-progress' && b.status === 'in-progress') return 1;
        return 0;
      });
      
      // Keep first stage (most complete), delete the rest
      const toKeep = duplicateSet[0];
      const toDelete = duplicateSet.slice(1).map(stage => stage.id);
      
      if (toDelete.length > 0) {
        console.log(`Removing ${toDelete.length} duplicate stages for "${toKeep.name}"`);
        
        const { error: deleteError } = await supabase
          .from('lifecycle_stages')
          .delete()
          .in('id', toDelete);
          
        if (deleteError) {
          console.error("Error deleting duplicate stages:", deleteError);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error in checkForDuplicateStages:", error);
    return false;
  }
};
