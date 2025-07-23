
import { supabase } from "@/integrations/supabase/client";

// Map completed lifecycle stages to pipeline stages
const LIFECYCLE_TO_PIPELINE_MAPPING: Record<string, string> = {
  "Prospect": "Lead",
  "Meeting Set": "Lead",
  "Qualified Lead": "Qualified", 
  "Demo": "Demo",
  "Discovery Call": "Demo",
  "Proposal Sent": "Proposal",
  "Proposal Approved": "Proposal", 
  "Contract Sent": "Contract",
  "Contract Signed": "Contract",
  "Onboarding": "Implementation",
  "Technical Setup": "Implementation",
  "Training": "Implementation",
  "Go Live": "Live"
};

const PIPELINE_STAGE_ORDER = ["Lead", "Qualified", "Demo", "Proposal", "Contract", "Implementation", "Live"];

const getFurthestPipelineStage = (completedStages: string[]): string => {
  const pipelineStages = completedStages
    .map(stage => LIFECYCLE_TO_PIPELINE_MAPPING[stage])
    .filter(Boolean);
  
  if (pipelineStages.length === 0) return "Lead";
  
  let furthestStageIndex = -1;
  for (const stage of pipelineStages) {
    const index = PIPELINE_STAGE_ORDER.indexOf(stage);
    if (index > furthestStageIndex) {
      furthestStageIndex = index;
    }
  }
  
  return PIPELINE_STAGE_ORDER[furthestStageIndex] || "Lead";
};

const getOperationalStatus = (stages: any[]): "not-started" | "in-progress" | "done" | "blocked" => {
  if (!stages || stages.length === 0) return "not-started";
  
  // Check if customer has completed "Go Live" stage
  const hasCompletedGoLive = stages.some(stage => 
    stage.name === "Go Live" && stage.status === "done"
  );
  
  if (hasCompletedGoLive) return "done";
  
  // Check if any stage is blocked
  const hasBlockedStages = stages.some(stage => stage.status === "blocked");
  if (hasBlockedStages) return "blocked";
  
  // Check if any stage is in progress
  const hasInProgressStages = stages.some(stage => stage.status === "in-progress");
  if (hasInProgressStages) return "in-progress";
  
  // Check if any stage is completed (but not Go Live)
  const hasCompletedStages = stages.some(stage => stage.status === "done");
  if (hasCompletedStages) return "in-progress";
  
  return "not-started";
};

export const syncCustomerPipelineStages = async (): Promise<boolean> => {
  try {
    console.log("Starting customer pipeline stage sync...");
    
    // Fetch all customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, stage, status');

    if (customersError) {
      console.error("Error fetching customers:", customersError);
      return false;
    }

    // Fetch all lifecycle stages
    const { data: allLifecycleStages, error: stagesError } = await supabase
      .from('lifecycle_stages')
      .select('customer_id, name, status');

    if (stagesError) {
      console.error("Error fetching lifecycle stages:", stagesError);
      return false;
    }

    // Group stages by customer
    const stagesByCustomer: Record<string, any[]> = {};
    allLifecycleStages?.forEach(stage => {
      if (!stagesByCustomer[stage.customer_id]) {
        stagesByCustomer[stage.customer_id] = [];
      }
      stagesByCustomer[stage.customer_id].push(stage);
    });

    // Update each customer's pipeline stage and status
    for (const customer of customers || []) {
      const customerStages = stagesByCustomer[customer.id] || [];
      const completedStages = customerStages
        .filter(stage => stage.status === "done")
        .map(stage => stage.name);
      
      const newPipelineStage = getFurthestPipelineStage(completedStages);
      const newOperationalStatus = getOperationalStatus(customerStages);
      
      // Only update if stage or status has changed
      if (customer.stage !== newPipelineStage || customer.status !== newOperationalStatus) {
        console.log(`Updating ${customer.name}: ${customer.stage} -> ${newPipelineStage}, ${customer.status} -> ${newOperationalStatus}`);
        
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            stage: newPipelineStage,
            status: newOperationalStatus
          })
          .eq('id', customer.id);

        if (updateError) {
          console.error(`Error updating customer ${customer.name}:`, updateError);
        }
      }
    }

    console.log("Customer pipeline stage sync completed successfully");
    return true;
  } catch (error) {
    console.error("Error in syncCustomerPipelineStages:", error);
    return false;
  }
};
