import { supabase } from "@/integrations/supabase/client";

interface CustomerAudit {
  id: string;
  name: string;
  currentStage: string;
  stageCount: number;
  completedStages: string[];
  inProgressStages: string[];
  expectedStage: string;
  isCorrect: boolean;
}

const STAGE_ORDER = ['Lead', 'Qualified', 'Demo', 'Proposal', 'Contract', 'Implementation', 'Live'];

const STAGE_MAPPING: Record<string, string> = {
  'Prospect': 'Lead',
  'Meeting Set': 'Lead',
  'Qualified Lead': 'Qualified',
  'Discovery Call': 'Qualified',
  'Demo': 'Demo',
  'Proposal Sent': 'Proposal',
  'Proposal Approved': 'Proposal',
  'Contract Sent': 'Contract',
  'Contract Signed': 'Contract',
  'Onboarding': 'Implementation',
  'Technical Setup': 'Implementation',
  'Training': 'Implementation',
  'Go Live': 'Live',
  'Payment Processed': 'Implementation', // Finance doesn't change pipeline stage
};

function calculateExpectedStage(completedStages: string[], inProgressStages: string[]): string {
  let furthestIndex = -1;
  
  // Check completed stages
  for (const stage of completedStages) {
    const pipelineStage = STAGE_MAPPING[stage];
    if (pipelineStage) {
      const index = STAGE_ORDER.indexOf(pipelineStage);
      if (index > furthestIndex) {
        furthestIndex = index;
      }
    }
  }
  
  // Check in-progress stages (they count too)
  for (const stage of inProgressStages) {
    const pipelineStage = STAGE_MAPPING[stage];
    if (pipelineStage) {
      const index = STAGE_ORDER.indexOf(pipelineStage);
      if (index > furthestIndex) {
        furthestIndex = index;
      }
    }
  }
  
  // Gate "Live" - only if Go Live is completed
  if (furthestIndex === 6) {
    const hasGoLiveCompleted = completedStages.includes('Go Live');
    if (!hasGoLiveCompleted) {
      furthestIndex = 5; // Implementation
    }
  }
  
  return furthestIndex >= 0 ? STAGE_ORDER[furthestIndex] : 'Lead';
}

export async function auditCustomerStages(): Promise<{
  total: number;
  correct: number;
  incorrect: number;
  noStages: number;
  details: CustomerAudit[];
}> {
  console.log('🔍 Starting customer stage audit...');
  
  // Get all customers
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('id, name, stage')
    .order('name');
  
  if (customersError) {
    console.error('Error fetching customers:', customersError);
    return { total: 0, correct: 0, incorrect: 0, noStages: 0, details: [] };
  }
  
  // Get all lifecycle stages
  const { data: allStages, error: stagesError } = await supabase
    .from('lifecycle_stages')
    .select('customer_id, name, status');
  
  if (stagesError) {
    console.error('Error fetching stages:', stagesError);
    return { total: 0, correct: 0, incorrect: 0, noStages: 0, details: [] };
  }
  
  // Group stages by customer
  const stagesByCustomer: Record<string, { name: string; status: string }[]> = {};
  allStages?.forEach(stage => {
    if (!stagesByCustomer[stage.customer_id]) {
      stagesByCustomer[stage.customer_id] = [];
    }
    stagesByCustomer[stage.customer_id].push({ name: stage.name, status: stage.status });
  });
  
  const results: CustomerAudit[] = [];
  let correct = 0;
  let incorrect = 0;
  let noStages = 0;
  
  for (const customer of customers || []) {
    const stages = stagesByCustomer[customer.id] || [];
    
    const completedStages = stages
      .filter(s => ['done', 'completed', 'complete', 'finished'].includes(s.status?.toLowerCase()))
      .map(s => s.name);
    
    const inProgressStages = stages
      .filter(s => ['in-progress', 'in progress', 'ongoing'].includes(s.status?.toLowerCase()))
      .map(s => s.name);
    
    const expectedStage = calculateExpectedStage(completedStages, inProgressStages);
    const currentStage = customer.stage || 'Lead';
    const isCorrect = currentStage === expectedStage;
    
    if (stages.length === 0) {
      noStages++;
    } else if (isCorrect) {
      correct++;
    } else {
      incorrect++;
    }
    
    results.push({
      id: customer.id,
      name: customer.name,
      currentStage,
      stageCount: stages.length,
      completedStages,
      inProgressStages,
      expectedStage,
      isCorrect
    });
  }
  
  // Log summary
  console.log('\n========== CUSTOMER STAGE AUDIT RESULTS ==========');
  console.log(`Total customers: ${customers?.length || 0}`);
  console.log(`✅ Correct stages: ${correct}`);
  console.log(`❌ Incorrect stages: ${incorrect}`);
  console.log(`⚠️ No lifecycle stages: ${noStages}`);
  
  // Log incorrect ones
  const incorrectCustomers = results.filter(r => !r.isCorrect && r.stageCount > 0);
  if (incorrectCustomers.length > 0) {
    console.log('\n--- CUSTOMERS WITH WRONG STAGES ---');
    incorrectCustomers.forEach(c => {
      console.log(`${c.name}: shows "${c.currentStage}" but should be "${c.expectedStage}"`);
      console.log(`   Completed: [${c.completedStages.join(', ')}]`);
      console.log(`   In Progress: [${c.inProgressStages.join(', ')}]`);
    });
  }
  
  // Log customers with no stages
  const customersWithNoStages = results.filter(r => r.stageCount === 0);
  if (customersWithNoStages.length > 0) {
    console.log('\n--- CUSTOMERS WITH NO LIFECYCLE STAGES ---');
    customersWithNoStages.slice(0, 20).forEach(c => {
      console.log(`${c.name}: ${c.currentStage} (0 stages)`);
    });
    if (customersWithNoStages.length > 20) {
      console.log(`... and ${customersWithNoStages.length - 20} more`);
    }
  }
  
  console.log('==================================================\n');
  
  return {
    total: customers?.length || 0,
    correct,
    incorrect,
    noStages,
    details: results
  };
}

// Make it available globally for console access
if (typeof window !== 'undefined') {
  (window as any).auditCustomerStages = auditCustomerStages;
}





