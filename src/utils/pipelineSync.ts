
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
      // console.log(
        `      Stage mapping: "${s.name}" (${s.status}) -> canonical: "${canonical}"`
      );
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

  // console.log(
    `      Reached stages: [${reached.join(", ")}] -> Base: ${basePipelineStage} -> Final: ${finalPipelineStage}`
  );

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
    
    // Debug: Check if Gulf Air exists in both datasets
    const gulfAirCustomer = customers?.find(c => c.name?.toLowerCase().includes('gulf air'));
    if (gulfAirCustomer) {
      // console.log(`🔍 GULF AIR FOUND IN CUSTOMERS:`, {
        id: gulfAirCustomer.id,
        name: gulfAirCustomer.name,
        currentStage: gulfAirCustomer.stage,
        currentStatus: gulfAirCustomer.status
      });
      
      const gulfAirStages = allLifecycleStages?.filter(s => s.customer_id === gulfAirCustomer.id);
      // console.log(`🔍 GULF AIR LIFECYCLE STAGES (${gulfAirStages?.length || 0}):`, 
        gulfAirStages?.map(s => ({ name: s.name, status: s.status }))
      );
    } else {
      // console.log(`⚠️ Gulf Air NOT found in customers list`);
    }

    // Group stages by customer
    const stagesByCustomer: Record<string, any[]> = {};
    allLifecycleStages?.forEach(stage => {
      if (!stagesByCustomer[stage.customer_id]) {
        stagesByCustomer[stage.customer_id] = [];
      }
      stagesByCustomer[stage.customer_id].push(stage);
    });

    // console.log(`🔄 Grouped stages for ${Object.keys(stagesByCustomer).length} customers`);

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
      
      // Special detailed logging for Gulf Air and Macqueen
      if (customer.name?.toLowerCase().includes('gulf air') || customer.name?.toLowerCase().includes('macqueen')) {
        // console.log(`🔴🔴🔴 ${customer.name.toUpperCase()} SYNC DETAILS:`);
        // console.log(`   Customer ID: ${customer.id}`);
        // console.log(`   Stages found for this customer ID: ${customerStages.length}`);
        // console.log(`   All stages:`, customerStages.map(s => ({ name: s.name, status: s.status, canonical: canonicalizeStageName(s.name) })));
        // console.log(`   Completed stages: [${completedStages.join(', ')}]`);
        // console.log(`   In progress stages: [${inProgressStages.join(', ')}]`);
        // console.log(`   Computed pipeline stage: ${newPipelineStage}`);
        // console.log(`   Computed status: ${newOperationalStatus}`);
        // console.log(`   Current DB: stage="${customer.stage}", status="${customer.status}"`);
      }
      
      // IMPORTANT: Don't downgrade customers with no lifecycle stages
      // If a customer has 0 stages, preserve their existing stage (may have been manually set)
      if (customerStages.length === 0) {
        // console.log(`⏭️ SKIPPING ${customer.name}: No lifecycle stages - preserving current stage "${customer.stage}"`);
        continue;
      }

      // Only update if stage or status has changed
      if (customer.stage !== newPipelineStage || customer.status !== newOperationalStatus) {
        // console.log(`🔄 UPDATING ${customer.name}: Stage ${customer.stage} -> ${newPipelineStage}, Status ${customer.status} -> ${newOperationalStatus}`);
        
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
          // console.log(`✅ Successfully updated ${customer.name}:`, updateData);
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
    // console.log("=== PIPELINE SYNC COMPLETED ===");
    // console.log(`✅ Updated ${updatedCount} customers in ${duration}ms`);
    
    if (syncResults.length > 0) {
      // console.log("📊 SYNC SUMMARY:");
      syncResults.forEach(result => {
        // console.log(`   • ${result.customer}: ${result.oldStage} -> ${result.newStage} (${result.oldStatus} -> ${result.newStatus})`);
      });
    }
    
    return true;
  } catch (error) {
    console.error("❌ CRITICAL ERROR in syncCustomerPipelineStages:", error);
    return false;
  }
};
