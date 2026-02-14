
// Centralized pipeline rules: stage order and lifecycle-to-pipeline mapping
// Always use canonical stage names as keys in the mapping

export const PIPELINE_STAGE_ORDER = [
  "Lead",
  "Qualified",
  "Demo",
  "Proposal",
  "Contract",
  "Implementation",
  "Live",
];

// Map canonical lifecycle stage names to pipeline stages
export const LIFECYCLE_TO_PIPELINE_MAPPING: Record<string, string> = {
  // Lead stage
  "Prospect": "Lead",
  "Meeting Set": "Lead",

  // Qualified stage
  "Qualified Lead": "Qualified",
  "Discovery Call": "Qualified",

  // Demo stage
  "Demo": "Demo",

  // Proposal stage
  "Proposal Sent": "Proposal",
  "Proposal Approved": "Proposal",

  // Contract stage
  "Contract Sent": "Contract",
  "Contract Signed": "Contract",
  "Contract Approval": "Contract",

  // Implementation stage
  "Onboarding": "Implementation",
  "Technical Setup": "Implementation",
  "Training": "Implementation",
  "Kick Off Meeting": "Implementation",  // titleCase normalizes hyphens to spaces
  "Kick-Off Meeting": "Implementation",
  "Kick-off Meeting": "Implementation",
  "Kickoff Meeting": "Implementation",
  "Requirements Gathering": "Implementation",
  "Account Setup": "Implementation",
  "Data Migration": "Implementation",
  "Invoice Generation": "Implementation",
  "Payment Processing": "Implementation",
  "Implementation": "Implementation",
  "Setup": "Implementation",
  "Configuration": "Implementation",
  "Integration": "Implementation",

  // Live stage
  "Go Live": "Live",
  // Payment Processed should not advance to Live on its own; keep in Implementation
  "Payment Processed": "Implementation",
};

// Resolve furthest pipeline stage from a list of canonical or raw lifecycle stage names
export const getFurthestPipelineStageFromNames = (stageNames: string[]): string => {
  const pipelineStages = stageNames
    .map((name) => LIFECYCLE_TO_PIPELINE_MAPPING[name] || LIFECYCLE_TO_PIPELINE_MAPPING[titleCase(name)])
    .filter(Boolean) as string[];

  if (pipelineStages.length === 0) return "Lead";

  let furthestIndex = -1;
  for (const s of pipelineStages) {
    const idx = PIPELINE_STAGE_ORDER.indexOf(s);
    if (idx > furthestIndex) furthestIndex = idx;
  }
  return furthestIndex >= 0 ? PIPELINE_STAGE_ORDER[furthestIndex] : "Lead";
};

// Helper to resolve pipeline stage directly from lifecycle stage objects (array form)
export const resolvePipelineStageFromLifecycleStages = (
  stages: Array<{ name?: string; status?: string }>,
  opts: { includeInProgress?: boolean } = { includeInProgress: true }
): string => {
  const { includeInProgress = true } = opts;
  
  // Implementation stage names - expanded list
  const implementationStageNames = [
    "Onboarding", "Technical Setup", "Training", "Kick Off Meeting",
    "Requirements Gathering", "Account Setup", "Data Migration",
    "Invoice Generation", "Payment Processing", "Implementation",
    "Setup", "Configuration", "Integration"
  ];
  
  const isActiveStatus = (status?: string) => {
    const s = (status || "").toLowerCase();
    const isActive = s === "done" || s === "completed" || s === "complete" || s === "finished" || s === "not-applicable" ||
      (includeInProgress && (s === "in-progress" || s === "in progress" || s === "ongoing"));
    return isActive;
  };
  
  const names: string[] = [];
  stages?.forEach((s) => {
    if (!s?.name) return;
    if (isActiveStatus(s.status)) {
      names.push(titleCase(s.name));
    }
  });
  
  // Check if ANY implementation stage is active
  let hasImplementationActivity = false;
  stages?.forEach(s => {
    if (!s?.name) return;
    const canonical = titleCase(s.name);
    const normalizedName = s.name.toLowerCase();
    const isImplStage = implementationStageNames.some(name => 
      canonical === name || 
      canonical.toLowerCase() === name.toLowerCase() ||
      normalizedName.includes(name.toLowerCase())
    );
    if (isImplStage && isActiveStatus(s.status)) {
      console.log(`   ✅ Found implementation stage: "${s.name}" (${s.status}) -> canonical: "${canonical}"`);
      hasImplementationActivity = true;
    }
  });
  
  const basePipelineStage = getFurthestPipelineStageFromNames(names);
  
  let finalPipelineStage = basePipelineStage;
  
  // KEY FIX: If we have implementation activity but base stage is Contract or earlier, bump to Implementation
  if (hasImplementationActivity && ["Lead", "Qualified", "Demo", "Proposal", "Contract"].includes(basePipelineStage)) {
    console.log(`   🔄 Bumping stage from ${basePipelineStage} to Implementation`);
    finalPipelineStage = "Implementation";
  }
  
  // GATING LOGIC: Prevent showing as "Live" unless Go Live is complete
  if (finalPipelineStage === "Live") {
    const hasGoLiveCompleted = stages?.some(
      s => titleCase(s.name) === "Go Live" && 
      (s.status?.toLowerCase() === "done" || s.status?.toLowerCase() === "completed" || 
       s.status?.toLowerCase() === "complete" || s.status?.toLowerCase() === "finished" ||
       s.status?.toLowerCase() === "not-applicable")
    );
    
    if (!hasGoLiveCompleted) {
      finalPipelineStage = hasImplementationActivity ? "Implementation" : "Contract";
    }
  }
  
  console.log(`   Pipeline: names=[${names.join(', ')}] base=${basePipelineStage} hasImpl=${hasImplementationActivity} final=${finalPipelineStage}`);
  
  return finalPipelineStage;
};

function titleCase(s?: string): string {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
