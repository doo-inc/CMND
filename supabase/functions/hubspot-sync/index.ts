import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const HUBSPOT_API_KEY = Deno.env.get("HUBSPOT_API_KEY") || "";
const HUBSPOT_API_URL = "https://api.hubapi.com";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Check for API key
    if (!HUBSPOT_API_KEY) {
      throw new Error("HUBSPOT_API_KEY environment variable not set");
    }

    // Get request body
    const { operation, data } = await req.json();

    if (!operation || !data) {
      throw new Error("Operation and data are required");
    }

    let result;

    // Route to the appropriate handler based on operation
    switch (operation) {
      case "syncCustomer":
        result = await syncCustomerToHubspot(data);
        break;
      case "createDeal":
        result = await createDealInHubspot(data);
        break;
      case "updateDeal":
        result = await updateDealInHubspot(data);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error in HubSpot sync: ${errorMessage}`);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

/**
 * Sync a customer to HubSpot (create or update)
 */
async function syncCustomerToHubspot(customer: any) {
  try {
    // First check if the customer already exists in HubSpot by email domain
    const domainParts = customer.name.toLowerCase().split(' ');
    const domain = `${domainParts.join('')}.com`;
    
    const searchResponse = await fetch(
      `${HUBSPOT_API_URL}/crm/v3/objects/companies/search`, 
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "domain",
                  operator: "EQ",
                  value: domain,
                },
              ],
            },
          ],
        }),
      }
    );

    const searchResult = await searchResponse.json();
    
    // If company exists, update it
    if (searchResult.results && searchResult.results.length > 0) {
      const companyId = searchResult.results[0].id;
      
      const updateResponse = await fetch(
        `${HUBSPOT_API_URL}/crm/v3/objects/companies/${companyId}`, 
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${HUBSPOT_API_KEY}`,
          },
          body: JSON.stringify({
            properties: {
              name: customer.name,
              industry: customer.segment,
              annualrevenue: customer.contract_size ? (customer.contract_size * 12).toString() : undefined,
              lifecyclestage: mapCustomerStageToHubspot(customer.stage),
            },
          }),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(`Failed to update company in HubSpot: ${JSON.stringify(error)}`);
      }

      return await updateResponse.json();
    } 
    // Otherwise create a new company
    else {
      const createResponse = await fetch(
        `${HUBSPOT_API_URL}/crm/v3/objects/companies`, 
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${HUBSPOT_API_KEY}`,
          },
          body: JSON.stringify({
            properties: {
              name: customer.name,
              domain: domain,
              industry: customer.segment,
              annualrevenue: customer.contract_size ? (customer.contract_size * 12).toString() : undefined,
              lifecyclestage: mapCustomerStageToHubspot(customer.stage),
            },
          }),
        }
      );

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(`Failed to create company in HubSpot: ${JSON.stringify(error)}`);
      }

      return await createResponse.json();
    }
  } catch (error) {
    console.error("Error syncing customer to HubSpot:", error);
    throw error;
  }
}

/**
 * Create a deal in HubSpot
 */
async function createDealInHubspot(contract: any) {
  try {
    const customer = contract.customers;
    
    // First, ensure the customer exists in HubSpot
    const customerResult = await syncCustomerToHubspot(customer);
    const companyId = customerResult.id;
    
    // Create the deal
    const createDealResponse = await fetch(
      `${HUBSPOT_API_URL}/crm/v3/objects/deals`, 
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          properties: {
            dealname: `${contract.name} - ${customer.name}`,
            amount: contract.value.toString(),
            closedate: new Date(contract.end_date).getTime().toString(),
            dealstage: mapContractStatusToDealStage(contract.status),
            pipeline: "default",
          },
          associations: [
            {
              to: {
                id: companyId,
              },
              types: [
                {
                  associationCategory: "HUBSPOT_DEFINED",
                  associationTypeId: 5, // Company to deal association
                },
              ],
            },
          ],
        }),
      }
    );

    if (!createDealResponse.ok) {
      const error = await createDealResponse.json();
      throw new Error(`Failed to create deal in HubSpot: ${JSON.stringify(error)}`);
    }

    return await createDealResponse.json();
  } catch (error) {
    console.error("Error creating deal in HubSpot:", error);
    throw error;
  }
}

/**
 * Update a deal in HubSpot
 */
async function updateDealInHubspot(contract: any) {
  try {
    // First, find the deal in HubSpot
    const searchResponse = await fetch(
      `${HUBSPOT_API_URL}/crm/v3/objects/deals/search`, 
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "dealname",
                  operator: "CONTAINS",
                  value: contract.name,
                },
              ],
            },
          ],
        }),
      }
    );

    const searchResult = await searchResponse.json();
    
    // If deal doesn't exist, create it
    if (!searchResult.results || searchResult.results.length === 0) {
      return await createDealInHubspot(contract);
    }
    
    // Otherwise update the existing deal
    const dealId = searchResult.results[0].id;
    
    const updateResponse = await fetch(
      `${HUBSPOT_API_URL}/crm/v3/objects/deals/${dealId}`, 
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          properties: {
            amount: contract.value.toString(),
            closedate: new Date(contract.end_date).getTime().toString(),
            dealstage: mapContractStatusToDealStage(contract.status),
          },
        }),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(`Failed to update deal in HubSpot: ${JSON.stringify(error)}`);
    }

    return await updateResponse.json();
  } catch (error) {
    console.error("Error updating deal in HubSpot:", error);
    throw error;
  }
}

/**
 * Map customer stage to HubSpot lifecycle stage
 */
function mapCustomerStageToHubspot(stage: string): string {
  switch (stage?.toLowerCase()) {
    case "lead":
      return "lead";
    case "prospect":
      return "marketingqualifiedlead";
    case "qualified":
      return "salesqualifiedlead";
    case "presentation":
      return "opportunity";
    case "proposal":
      return "opportunity";
    case "won":
      return "customer";
    case "active":
      return "customer";
    default:
      return "lead";
  }
}

/**
 * Map contract status to HubSpot deal stage
 */
function mapContractStatusToDealStage(status: string): string {
  switch (status?.toLowerCase()) {
    case "draft":
      return "presentationscheduled";
    case "pending":
      return "decisionmakerboughtin";
    case "active":
      return "closedwon";
    case "expired":
      return "closedlost";
    default:
      return "appointmentscheduled";
  }
}
