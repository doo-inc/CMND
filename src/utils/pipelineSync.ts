
import { supabase } from "@/integrations/supabase/client";
import { canonicalizeStageName } from "@/utils/stageNames";
import { isCompletedLike, isInProgressLike, getOperationalStatusFromArray } from "@/utils/stageStatus";
import { getFurthestPipelineStageFromNames } from "@/utils/pipelineRules";


const computePipelineStage = (stages: any[]): string => {
  // Implementation stage names - expanded list
  const implementationStageNames = [
    "Onboarding", "Technical Setup", "Training", "Kick Off Meeting",
    "Kick-Off Meeting", "Kick-off Meeting", "Kickoff Meeting",
    "Requirements Gathering", "Account Setup", "Data Migration",
    "Invoice Generation", "Payment Processing", "Implementation",
    "Setup", "Configuration", "Integration"
  ];

  const reached = stages
    .filter((s: any) => isCompletedLike(s.status) || isInProgressLike(s.status))
    .map((s: any) => {
      const canonical = canonicalizeStageName(s.name);
      return canonical;
    });

  // Check if ANY implementation stage is done or in-progress
  const hasImplementationActivity = stages.some((s: any) => {
    const canonical = canonicalizeStageName(s.name);
    const normalizedName = s.name?.toLowerCase() || '';
    const isImplStage = implementationStageNames.some(name => 
      canonical === name || 
      canonical.toLowerCase() === name.toLowerCase() ||
      normalizedName.includes(name.toLowerCase())
    );
    const isActive = isCompletedLike(s.status) || isInProgressLike(s.status);
    if (isImplStage && isActive) {
      // console.log(`      ✅ Found active implementation stage: "${s.name}" (${s.status})`);
    }
    return isImplStage && isActive;
  });

  const basePipelineStage = getFurthestPipelineStageFromNames(reached);

  // Determine completion status for go-live
  const hasGoLiveCompleted = stages.some(
    (s: any) =>
      canonicalizeStageName(s.name) === "Go Live" && isCompletedLike(s.status)
  );

  let finalPipelineStage = basePipelineStage;

  // KEY FIX: If we have implementation activity but base stage is Contract or earlier, bump to Implementation
  if (hasImplementationActivity && ["Lead", "Qualified", "Demo", "Proposal", "Contract"].includes(basePipelineStage)) {
    // console.log(`      🔄 Bumping from ${basePipelineStage} to Implementation (has implementation activity)`);
    finalPipelineStage = "Implementation";
  }

  // Enforce: Live only when Go Live is completed
  if (finalPipelineStage === "Live" && !hasGoLiveCompleted) {
    finalPipelineStage = hasImplementationActivity ? "Implementation" : "Contract";
    // console.log(`      Live gated -> using ${finalPipelineStage} instead (goLiveCompleted=${hasGoLiveCompleted})`);
  }


  return finalPipelineStage;
};

const computeOperationalStatus = (stages: any[]): "not-started" | "in-progress" | "done" | "blocked" => {
  return getOperationalStatusFromArray(stages);
};

export const syncCustomerPipelineStages = async (): Promise<boolean> => {
  try {
    // console.log("=== PIPELINE SYNC STARTED ===");
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

    // console.log(`📊 Found ${customers?.length || 0} non-churned customers to sync`);

    // Fetch ALL lifecycle stages with pagination to avoid 1000 row limit
    let allLifecycleStages: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: pageStages, error: stagesError } = await supabase
        .from('lifecycle_stages')
        .select('customer_id, name, status')
        .range(offset, offset + pageSize - 1);
      
      if (stagesError) {
        console.error("❌ Error fetching lifecycle stages:", stagesError);
        return false;
      }
      
      if (!pageStages || pageStages.length === 0) break;
      
      allLifecycleStages = allLifecycleStages.concat(pageStages);
      
      if (pageStages.length < pageSize) break;
      offset += pageSize;
    }

    // console.log(`📋 Found ${allLifecycleStages.length} lifecycle stages (paginated)`);
    
    // Debug check removed for performance

    // Group stages by customer
    const stagesByCustomer: Record<string, any[]> = {};
    allLifecycleStages?.forEach(stage => {
      if (!stagesByCustomer[stage.customer_id]) {
        stagesByCustomer[stage.customer_id] = [];
      }
      stagesByCustomer[stage.customer_id].push(stage);
    });

    // console.log(`🔄 Grouped stages for ${Object.keys(stagesByCustomer).length} customers`);

    // Collect all needed updates first (no awaits in the loop)
    const updateQueue: Array<{ id: string; stage: string; status: string }> = [];

    for (const customer of customers || []) {
      const customerStages = stagesByCustomer[customer.id] || [];

      // Preserve manually-set stage for customers with no lifecycle stages
      if (customerStages.length === 0) continue;

      const newPipelineStage = computePipelineStage(customerStages);
      const newOperationalStatus = computeOperationalStatus(customerStages);

      if (customer.stage !== newPipelineStage || customer.status !== newOperationalStatus) {
        updateQueue.push({ id: customer.id, stage: newPipelineStage, status: newOperationalStatus });
      }
    }

    // Run all updates concurrently instead of sequentially — turns N round-trips
    // into a single parallel wave (e.g. 50 updates: ~50× faster than sequential).
    const updateResults = await Promise.all(
      updateQueue.map(({ id, stage, status }) =>
        supabase
          .from('customers')
          .update({ stage, status })
          .eq('id', id)
      )
    );

    const updatedCount = updateResults.filter(r => !r.error).length;
    const failedCount = updateResults.filter(r => r.error).length;

    const duration = Date.now() - startTime;
    if (failedCount > 0) {
      console.error(`❌ Pipeline sync: ${failedCount} update(s) failed`);
    }

    return true;
  } catch (error) {
    console.error("❌ CRITICAL ERROR in syncCustomerPipelineStages:", error);
    return false;
  }
};
