
import { supabase } from "@/integrations/supabase/client";
import { canonicalizeStageName } from "@/utils/stageNames";
import { isCompletedLike, isInProgressLike, getOperationalStatusFromArray } from "@/utils/stageStatus";
import { getFurthestPipelineStageFromNames } from "@/utils/pipelineRules";


const computePipelineStage = (stages: any[]): string => {
  const reached = stages
    .filter((s: any) => isCompletedLike(s.status) || isInProgressLike(s.status))
    .map((s: any) => {
      const canonical = canonicalizeStageName(s.name);
      console.log(
        `      Stage mapping: "${s.name}" (${s.status}) -> canonical: "${canonical}"`
      );
      return canonical;
    });

  const basePipelineStage = getFurthestPipelineStageFromNames(reached);

  // Determine completion status for implementation + go-live
  const hasOnboardingCompleted = stages.some(
    (s: any) =>
      canonicalizeStageName(s.name) === "Onboarding" && isCompletedLike(s.status)
  );
  const hasTechnicalSetupCompleted = stages.some(
    (s: any) =>
      canonicalizeStageName(s.name) === "Technical Setup" && isCompletedLike(s.status)
  );
  const hasTrainingCompleted = stages.some(
    (s: any) =>
      canonicalizeStageName(s.name) === "Training" && isCompletedLike(s.status)
  );
  const hasGoLiveCompleted = stages.some(
    (s: any) =>
      canonicalizeStageName(s.name) === "Go Live" && isCompletedLike(s.status)
  );

  const allImplementationCompleted =
    hasOnboardingCompleted && hasTechnicalSetupCompleted && hasTrainingCompleted;
  const liveEligible = allImplementationCompleted && hasGoLiveCompleted;

  let finalPipelineStage = basePipelineStage;

  // Enforce: Live only when ALL implementation stages + Go Live are completed
  if (basePipelineStage === "Live" && !liveEligible) {
    const implementationReached = stages.some((s: any) => {
      const canonical = canonicalizeStageName(s.name);
      const isImplStage =
        canonical === "Onboarding" ||
        canonical === "Technical Setup" ||
        canonical === "Training";
      return (
        isImplStage &&
        (isCompletedLike(s.status) || isInProgressLike(s.status))
      );
    });

    finalPipelineStage = implementationReached ? "Implementation" : "Contract";

    console.log(
      `      Live gated -> using ${finalPipelineStage} instead (implCompleted=${allImplementationCompleted}, goLiveCompleted=${hasGoLiveCompleted})`
    );
  }

  console.log(
    `      Reached stages: [${reached.join(
      ", "
    )}] -> Base pipeline: ${basePipelineStage} -> Final: ${finalPipelineStage}`
  );

  return finalPipelineStage;
};

const computeOperationalStatus = (stages: any[]): "not-started" | "in-progress" | "done" | "blocked" => {
  return getOperationalStatusFromArray(stages);
};

export const syncCustomerPipelineStages = async (): Promise<boolean> => {
  try {
    console.log("=== PIPELINE SYNC STARTED ===");
    const startTime = Date.now();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("❌ Authentication failed in pipeline sync:", authError);
      return false;
    }
    
    // Fetch all customers, excluding churned customers from pipeline sync
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, stage, status')
      .or('status.is.null,status.neq.churned');

    if (customersError) {
      console.error("❌ Error fetching customers:", customersError);
      return false;
    }

    console.log(`📊 Found ${customers?.length || 0} non-churned customers to sync`);

    // Fetch all lifecycle stages
    const { data: allLifecycleStages, error: stagesError } = await supabase
      .from('lifecycle_stages')
      .select('customer_id, name, status');

    if (stagesError) {
      console.error("❌ Error fetching lifecycle stages:", stagesError);
      return false;
    }

    console.log(`📋 Found ${allLifecycleStages?.length || 0} lifecycle stages`);
    
    // Debug: Check if Gulf Air exists in both datasets
    const gulfAirCustomer = customers?.find(c => c.name?.toLowerCase().includes('gulf air'));
    if (gulfAirCustomer) {
      console.log(`🔍 GULF AIR FOUND IN CUSTOMERS:`, {
        id: gulfAirCustomer.id,
        name: gulfAirCustomer.name,
        currentStage: gulfAirCustomer.stage,
        currentStatus: gulfAirCustomer.status
      });
      
      const gulfAirStages = allLifecycleStages?.filter(s => s.customer_id === gulfAirCustomer.id);
      console.log(`🔍 GULF AIR LIFECYCLE STAGES (${gulfAirStages?.length || 0}):`, 
        gulfAirStages?.map(s => ({ name: s.name, status: s.status }))
      );
    } else {
      console.log(`⚠️ Gulf Air NOT found in customers list`);
    }

    // Group stages by customer
    const stagesByCustomer: Record<string, any[]> = {};
    allLifecycleStages?.forEach(stage => {
      if (!stagesByCustomer[stage.customer_id]) {
        stagesByCustomer[stage.customer_id] = [];
      }
      stagesByCustomer[stage.customer_id].push(stage);
    });

    console.log(`🔄 Grouped stages for ${Object.keys(stagesByCustomer).length} customers`);

    let updatedCount = 0;
    const syncResults: Array<{
      customer: string;
      oldStage: string;
      newStage: string;
      oldStatus: string;
      newStatus: string;
      stages: string[];
    }> = [];

    // Update each customer's pipeline stage and status
    for (const customer of customers || []) {
      const customerStages = stagesByCustomer[customer.id] || [];
      const newPipelineStage = computePipelineStage(customerStages);
      const newOperationalStatus = computeOperationalStatus(customerStages);
      
      // Log stage computation details
      const completedStages = customerStages
        .filter(s => isCompletedLike(s.status))
        .map(s => s.name);
      const inProgressStages = customerStages
        .filter(s => isInProgressLike(s.status))
        .map(s => s.name);
      
      // Special detailed logging for Gulf Air
      if (customer.name?.toLowerCase().includes('gulf air')) {
        console.log(`🔴🔴🔴 GULF AIR SYNC DETAILS:`);
        console.log(`   Customer ID: ${customer.id}`);
        console.log(`   Stages found for this customer ID: ${customerStages.length}`);
        console.log(`   All stages:`, customerStages.map(s => ({ name: s.name, status: s.status, canonical: canonicalizeStageName(s.name) })));
        console.log(`   Completed stages: [${completedStages.join(', ')}]`);
        console.log(`   In progress stages: [${inProgressStages.join(', ')}]`);
        console.log(`   Computed pipeline stage: ${newPipelineStage}`);
        console.log(`   Computed status: ${newOperationalStatus}`);
        console.log(`   Current DB: stage="${customer.stage}", status="${customer.status}"`);
      }
      
      // Only update if stage or status has changed
      if (customer.stage !== newPipelineStage || customer.status !== newOperationalStatus) {
        console.log(`🔄 UPDATING ${customer.name}: Stage ${customer.stage} -> ${newPipelineStage}, Status ${customer.status} -> ${newOperationalStatus}`);
        
        const { data: updateData, error: updateError } = await supabase
          .from('customers')
          .update({
            stage: newPipelineStage,
            status: newOperationalStatus
          })
          .eq('id', customer.id)
          .select();

        if (updateError) {
          console.error(`❌ Error updating customer ${customer.name}:`, updateError);
        } else {
          console.log(`✅ Successfully updated ${customer.name}:`, updateData);
          updatedCount++;
          syncResults.push({
            customer: customer.name,
            oldStage: customer.stage || 'null',
            newStage: newPipelineStage,
            oldStatus: customer.status || 'null',
            newStatus: newOperationalStatus,
            stages: [...completedStages, ...inProgressStages]
          });
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log("=== PIPELINE SYNC COMPLETED ===");
    console.log(`✅ Updated ${updatedCount} customers in ${duration}ms`);
    
    if (syncResults.length > 0) {
      console.log("📊 SYNC SUMMARY:");
      syncResults.forEach(result => {
        console.log(`   • ${result.customer}: ${result.oldStage} -> ${result.newStage} (${result.oldStatus} -> ${result.newStatus})`);
      });
    }
    
    return true;
  } catch (error) {
    console.error("❌ CRITICAL ERROR in syncCustomerPipelineStages:", error);
    return false;
  }
};
