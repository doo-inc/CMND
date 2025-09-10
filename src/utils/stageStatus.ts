
// Centralized lifecycle stage status normalization and helpers
// - Always use these helpers when interpreting lifecycle stage statuses

import { canonicalizeStageName } from "./stageNames";

export const normalizeStatus = (s?: string) => (s ?? "").toString().trim().toLowerCase().replace(/[_\s-]+/g, "-");

export const isCompletedLike = (s?: string): boolean => {
  const n = normalizeStatus(s);
  return n === "done" || n === "completed" || n === "complete" || n === "finished";
};

export const isInProgressLike = (s?: string): boolean => {
  const n = normalizeStatus(s);
  return n === "in-progress" || n === "inprogress" || n === "ongoing" || n === "in-flight" || n === "inflight";
};

export const isBlockedLike = (s?: string): boolean => normalizeStatus(s) === "blocked";

export const toHumanStatus = (s?: string): "Completed" | "In Progress" | "Blocked" | "Not Started" => {
  if (isCompletedLike(s)) return "Completed";
  if (isInProgressLike(s)) return "In Progress";
  if (isBlockedLike(s)) return "Blocked";
  return "Not Started";
};

// Determine overall operational status from lifecycle stages (array form)
export const getOperationalStatusFromArray = (
  stages: Array<{ name?: string; status?: string }> = []
): "not-started" | "in-progress" | "done" | "blocked" => {
  if (!stages || stages.length === 0) return "not-started";

  // Done only when Go Live is completed
  const hasCompletedGoLive = stages.some(
    (s) => canonicalizeStageName(s.name) === "Go Live" && isCompletedLike(s.status)
  );
  if (hasCompletedGoLive) return "done";

  // Any blocked -> blocked
  if (stages.some((s) => isBlockedLike(s.status))) return "blocked";

  // Any in-progress -> in-progress
  if (stages.some((s) => isInProgressLike(s.status))) return "in-progress";

  // Any completed but not Go Live -> still in-progress overall
  if (stages.some((s) => isCompletedLike(s.status))) return "in-progress";

  return "not-started";
};

// Determine overall operational status from a canonical stage map
export const getOperationalStatusFromMap = (
  stageMap: Map<string, { status?: string }>
): "not-started" | "in-progress" | "done" | "blocked" => {
  if (!stageMap || stageMap.size === 0) return "not-started";

  const goLiveStage = stageMap.get("Go Live");
  if (goLiveStage && isCompletedLike(goLiveStage.status)) return "done";

  if (Array.from(stageMap.values()).some((s) => isBlockedLike(s.status))) return "blocked";
  if (Array.from(stageMap.values()).some((s) => isInProgressLike(s.status))) return "in-progress";
  if (Array.from(stageMap.values()).some((s) => isCompletedLike(s.status))) return "in-progress";

  return "not-started";
};

// Utility to get a human-readable status for a specific stage name from an array
export const getStageHumanStatus = (
  stageName: string,
  stages: Array<{ name?: string; status?: string }> = []
): "Completed" | "In Progress" | "Blocked" | "Not Started" => {
  const canonical = canonicalizeStageName(stageName);
  const match = stages.find((s) => canonicalizeStageName(s.name) === canonical);
  return toHumanStatus(match?.status);
};
