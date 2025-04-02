
import { supabase } from "@/integrations/supabase/client";
import { customers as realCustomers } from "@/data/realCustomers";
import { toast } from "sonner";

/**
 * Syncs all customers from the local data to the database
 * This function can be called from any page to ensure customer data is in the database
 */
export const syncCustomersToDatabase = async (): Promise<boolean> => {
  try {
    console.log("Starting customer data sync to database...");
    
    // First, check if we already have customers in the database
    const { data: existingCustomers, error: checkError } = await supabase
      .from('customers')
      .select('id, name')
      .limit(1);
      
    if (checkError) {
      console.error("Error checking existing customers:", checkError);
      return false;
    }
    
    // If we already have customers, don't duplicate them
    if (existingCustomers && existingCustomers.length > 0) {
      console.log("Customers already exist in database, skipping sync");
      return true;
    }
    
    // Format customers for database insertion, ensuring IDs are proper UUIDs
    const customersToInsert = realCustomers.map(customer => {
      // Generate a valid UUID for each customer instead of using custom IDs
      const validUuid = crypto.randomUUID();
      
      return {
        id: validUuid,
        name: customer.name,
        segment: customer.segment || null,
        region: customer.region || null,
        stage: customer.stage || null,
        status: "not-started",
        contract_size: customer.contractSize || 0,
        owner_id: "00000000-0000-0000-0000-000000000001" // Default owner
      };
    });
    
    // Insert all customers
    const { error: insertError } = await supabase
      .from('customers')
      .insert(customersToInsert);
    
    if (insertError) {
      console.error("Error inserting customers:", insertError);
      return false;
    }
    
    console.log(`Successfully synced ${customersToInsert.length} customers to the database`);
    return true;
  } catch (error) {
    console.error("Error in syncCustomersToDatabase:", error);
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
