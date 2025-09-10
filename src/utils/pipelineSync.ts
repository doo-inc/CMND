
import { supabase } from "@/integrations/supabase/client";
import { canonicalizeStageName } from "@/utils/stageNames";
import { isCompletedLike, isInProgressLike, getOperationalStatusFromArray } from "@/utils/stageStatus";
import { PIPELINE_STAGE_ORDER, LIFECYCLE_TO_PIPELINE_MAPPING, getFurthestPipelineStageFromNames } from "@/utils/pipelineRules";


const computePipelineStage = (stages: any[]): string => {
  const reached = stages
    .filter((s: any) => isCompletedLike(s.status) || isInProgressLike(s.status))
    .map((s: any) => canonicalizeStageName(s.name));
  return getFurthestPipelineStageFromNames(reached);
};

const computeOperationalStatus = (stages: any[]): "not-started" | "in-progress" | "done" | "blocked" => {
  return getOperationalStatusFromArray(stages);
};

export const syncCustomerPipelineStages = async (): Promise<boolean> => {
  try {
    console.log("Starting customer pipeline stage sync...");
    
    // Fetch all customers, excluding churned customers from pipeline sync
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, stage, status')
      .neq('status', 'churned');

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
