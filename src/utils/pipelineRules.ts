
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

  // Implementation stage
  "Onboarding": "Implementation",
  "Technical Setup": "Implementation",
  "Training": "Implementation",

  // Live stage
  "Go Live": "Live",
  "Payment Processed": "Live",
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
  const names: string[] = [];
  stages?.forEach((s) => {
    if (!s?.name) return;
    const status = (s.status || "").toString();
    if (
      status &&
      (status.toLowerCase() === "done" ||
        status.toLowerCase() === "completed" ||
        status.toLowerCase() === "complete" ||
        status.toLowerCase() === "finished" ||
        (includeInProgress && (status.toLowerCase() === "in-progress" || status.toLowerCase() === "in progress" || status.toLowerCase() === "ongoing")))
    ) {
      // Accept this stage as reached
      names.push(titleCase(s.name));
    }
  });
  return getFurthestPipelineStageFromNames(names);
};

function titleCase(s?: string): string {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
