
import React, { memo, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { CustomerData, CardLifecycleStage } from "@/types/customers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sortStagesByOrder } from "@/utils/stageOrdering";
import { ChevronRight, Clock, Pencil, Phone } from "lucide-react";

export interface CustomerOwner {
  id: string;
  name: string;
  role: string;
}

interface CustomerCardProps {
  customer: CustomerData;
  showEditOptions?: boolean;
  isDetailed?: boolean;
  onStageUpdate?: (showRefresh?: boolean) => void;
}

const STATUS_CYCLE = ["not-started", "in-progress", "done", "blocked", "not-applicable"] as const;
type StageStatus = typeof STATUS_CYCLE[number];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  "not-started": { label: "Not Started", color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800", dot: "bg-gray-400" },
  "in-progress": { label: "In Progress", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/30", dot: "bg-blue-500" },
  "done": { label: "Done", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/30", dot: "bg-green-500" },
  "blocked": { label: "Blocked", color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/30", dot: "bg-red-500" },
  "not-applicable": { label: "N/A", color: "text-gray-400", bg: "bg-gray-50 dark:bg-gray-800/50", dot: "bg-gray-300" },
};

const CATEGORY_COLORS: Record<string, string> = {
  "Pre-Sales": "text-purple-600 dark:text-purple-400",
  "Sales": "text-blue-600 dark:text-blue-400",
  "Implementation": "text-orange-600 dark:text-orange-400",
  "Finance": "text-green-600 dark:text-green-400",
};

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  // Show "Jan 5" style for this year, "Jan 5, 2025" for older
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  if (date.getFullYear() === now.getFullYear()) {
    return `${month} ${day}`;
  }
  return `${month} ${day}, ${date.getFullYear()}`;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

function CustomerCardComponent({ customer, showEditOptions = false, isDetailed = false, onStageUpdate }: CustomerCardProps) {
  const navigate = useNavigate();
  const [stagesOpen, setStagesOpen] = useState(false);
  const [localStages, setLocalStages] = useState<CardLifecycleStage[]>(
    customer.lifecycleStages || []
  );
  const [updatingStageId, setUpdatingStageId] = useState<string | null>(null);
  const [lastContacted, setLastContacted] = useState<string | null>(customer.last_contacted_at || null);
  const [isMarkingContacted, setIsMarkingContacted] = useState(false);

  // Sort stages by the canonical order
  const sortedStages = sortStagesByOrder(localStages);

  // Group stages by category
  const stagesByCategory = sortedStages.reduce((acc, stage) => {
    const cat = stage.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(stage);
    return acc;
  }, {} as Record<string, CardLifecycleStage[]>);

  const categoryOrder = ["Pre-Sales", "Sales", "Implementation", "Finance", "Other"];
  const orderedCategories = categoryOrder.filter(cat => stagesByCategory[cat]);

  // Calculate quick stats
  const totalStages = localStages.length;
  const doneCount = localStages.filter(s => s.status === "done" || s.status === "not-applicable").length;
  const inProgressCount = localStages.filter(s => s.status === "in-progress").length;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleCardClick = () => {
    navigate(`/customers/${customer.id}`);
  };

  const handleMarkContacted = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date().toISOString();

    // Optimistic update
    setLastContacted(now);
    setIsMarkingContacted(true);

    try {
      const { error } = await supabase
        .from("customers")
        .update({ last_contacted_at: now })
        .eq("id", customer.id);

      if (error) throw error;

      toast.success("Marked as contacted");
    } catch (error) {
      console.error("Error marking contacted:", error);
      toast.error("Failed to update");
      setLastContacted(customer.last_contacted_at || null);
    } finally {
      setIsMarkingContacted(false);
    }
  }, [customer.id, customer.last_contacted_at]);

  const handleStageStatusChange = useCallback(async (stageId: string, currentStatus: string) => {
    const currentIndex = STATUS_CYCLE.indexOf(currentStatus as StageStatus);
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    const newStatus = STATUS_CYCLE[nextIndex];
    const now = new Date().toISOString();

    setLocalStages(prev =>
      prev.map(s => s.id === stageId ? { ...s, status: newStatus, updated_at: now } : s)
    );
    setUpdatingStageId(stageId);

    try {
      const updateData: any = {
        status: newStatus,
        updated_at: now,
      };
      if (newStatus !== "not-started") {
        updateData.status_changed_at = now;
      }

      const { error } = await supabase
        .from("lifecycle_stages")
        .update(updateData)
        .eq("id", stageId);

      if (error) throw error;

      toast.success(`Stage updated to "${STATUS_CONFIG[newStatus].label}"`);

      if (onStageUpdate) {
        setTimeout(() => onStageUpdate(false), 300);
      }
    } catch (error) {
      console.error("Error updating stage:", error);
      toast.error("Failed to update stage");
      setLocalStages(customer.lifecycleStages || []);
    } finally {
      setUpdatingStageId(null);
    }
  }, [customer.lifecycleStages, onStageUpdate]);

  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-shadow duration-200 bg-card cursor-pointer hover:shadow-lg" 
      onClick={handleCardClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: Avatar + Name + Stage badge */}
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={customer.logo} alt={customer.name} />
            <AvatarFallback className="bg-doo-purple-100 text-doo-purple-800 dark:bg-doo-purple-800 dark:text-doo-purple-100 text-xs">
              {getInitials(customer.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm truncate">{customer.name}</h3>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0 font-medium">
                {customer.stage || "New"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {customer.segment || "Unknown"} · {customer.country || "Unknown"}{customer.industry ? ` · ${customer.industry}` : ""}
            </p>
          </div>
          <span className="text-sm font-semibold text-foreground shrink-0">
            ${customer.contractSize.toLocaleString()}
          </span>
        </div>

        {/* Lifecycle stages: compact dots + popover */}
        {localStages.length > 0 && (
          <Popover open={stagesOpen} onOpenChange={setStagesOpen}>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setStagesOpen(!stagesOpen);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border/60 hover:bg-accent/50 transition-colors text-left"
              >
                <Pencil className="h-3 w-3 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-1">
                  {sortedStages.map((stage) => {
                    const config = STATUS_CONFIG[stage.status] || STATUS_CONFIG["not-started"];
                    return (
                      <div
                        key={stage.id}
                        className={`w-2 h-2 rounded-full ${config.dot} shrink-0`}
                        title={`${stage.name}: ${config.label}`}
                      />
                    );
                  })}
                </div>
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {doneCount}/{totalStages}{inProgressCount > 0 ? ` · ${inProgressCount} active` : ""}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-0"
              align="start"
              side="right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b">
                <h4 className="font-medium text-sm">Lifecycle Stages</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Click to cycle: Not Started → In Progress → Done → Blocked → N/A</p>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-1">
                {orderedCategories.map((category) => (
                  <div key={category} className="mb-1">
                    <p className={`text-xs font-semibold px-3 py-1.5 ${CATEGORY_COLORS[category] || "text-muted-foreground"}`}>
                      {category}
                    </p>
                    {stagesByCategory[category].map((stage) => {
                      const config = STATUS_CONFIG[stage.status] || STATUS_CONFIG["not-started"];
                      const isUpdating = updatingStageId === stage.id;
                      return (
                        <button
                          key={stage.id}
                          disabled={isUpdating}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStageStatusChange(stage.id, stage.status);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left ${isUpdating ? "opacity-50" : ""}`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full ${config.dot} shrink-0 ${isUpdating ? "animate-pulse" : ""}`} />
                          <span className="text-sm flex-1 truncate">{stage.name}</span>
                          <span className={`text-xs font-medium ${config.color} ${config.bg} px-2 py-0.5 rounded-full`}>
                            {config.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Footer: Updated + Contacted */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          {/* Last Updated */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground" title={customer.lastUpdatedAt ? `Updated ${new Date(customer.lastUpdatedAt).toLocaleString()}` : ""}>
            <Clock className="h-3 w-3" />
            <span>Updated {customer.lastUpdatedAt ? formatShortDate(customer.lastUpdatedAt) : "—"}</span>
          </div>

          {/* Last Contacted — clickable to stamp */}
          <button
            onClick={handleMarkContacted}
            disabled={isMarkingContacted}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
            title={lastContacted ? `Contacted ${new Date(lastContacted).toLocaleString()} — click to update` : "Click to mark as contacted"}
          >
            <Phone className={`h-3 w-3 ${isMarkingContacted ? "animate-pulse" : ""}`} />
            <span>Contacted {lastContacted ? formatShortDate(lastContacted) : "Never"}</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export const CustomerCard = memo(CustomerCardComponent);
