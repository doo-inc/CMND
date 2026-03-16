
import React, { memo, useState, useCallback, useMemo, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate, useLocation } from "react-router-dom";
import { CustomerData, CardLifecycleStage } from "@/types/customers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sortStagesByOrder } from "@/utils/stageOrdering";
import { ChevronRight, Clock, Pencil, Phone, Save, Undo2, Loader2, X, CalendarDays, StickyNote } from "lucide-react";

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
  const location = useLocation();
  const isBatelco = location.pathname.startsWith("/batelco");
  const [stagesOpen, setStagesOpen] = useState(false);
  const [localStages, setLocalStages] = useState<CardLifecycleStage[]>(
    customer.lifecycleStages || []
  );
  const [pendingChanges, setPendingChanges] = useState<Record<string, StageStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [lastContacted, setLastContacted] = useState<string | null>(customer.last_contacted_at || null);
  const [isMarkingContacted, setIsMarkingContacted] = useState(false);
  const [contactedOpen, setContactedOpen] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesValue, setNotesValue] = useState(customer.description || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const originalStagesRef = useRef(customer.lifecycleStages || []);

  // Merge local stages with pending changes for display
  const effectiveStages = useMemo(() =>
    localStages.map(s => pendingChanges[s.id] ? { ...s, status: pendingChanges[s.id] } : s),
    [localStages, pendingChanges]
  );

  const sortedStages = sortStagesByOrder(effectiveStages);

  const stagesByCategory = sortedStages.reduce((acc, stage) => {
    const cat = stage.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(stage);
    return acc;
  }, {} as Record<string, CardLifecycleStage[]>);

  const categoryOrder = ["Pre-Sales", "Sales", "Implementation", "Finance", "Other"];
  const orderedCategories = categoryOrder.filter(cat => stagesByCategory[cat]);

  const totalStages = effectiveStages.length;
  const doneCount = effectiveStages.filter(s => s.status === "done" || s.status === "not-applicable").length;
  const inProgressCount = effectiveStages.filter(s => s.status === "in-progress").length;
  const pendingCount = Object.keys(pendingChanges).length;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleCardClick = () => {
    navigate(isBatelco ? `/batelco/customers/${customer.id}` : `/customers/${customer.id}`);
  };

  const saveContactedDate = useCallback(async (dateValue: string | null) => {
    const previousValue = lastContacted;
    setLastContacted(dateValue);
    setIsMarkingContacted(true);
    setContactedOpen(false);
    setCustomDate("");

    try {
      const { error } = await supabase
        .from("customers")
        .update({ last_contacted_at: dateValue })
        .eq("id", customer.id);

      if (error) throw error;

      toast.success(dateValue ? "Contact date updated" : "Contact date cleared");
    } catch (error) {
      console.error("Error updating contacted:", error);
      toast.error("Failed to update");
      setLastContacted(previousValue);
    } finally {
      setIsMarkingContacted(false);
    }
  }, [customer.id, lastContacted]);

  const handleContactedNow = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    saveContactedDate(new Date().toISOString());
  }, [saveContactedDate]);

  const handleClearContacted = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    saveContactedDate(null);
  }, [saveContactedDate]);

  const handleSetCustomDate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!customDate) return;
    const date = new Date(customDate + "T12:00:00");
    if (isNaN(date.getTime())) {
      toast.error("Invalid date");
      return;
    }
    saveContactedDate(date.toISOString());
  }, [customDate, saveContactedDate]);

  const handleSaveNotes = useCallback(async () => {
    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({ description: notesValue || null })
        .eq("id", customer.id);

      if (error) throw error;
      toast.success("Notes saved");
      setNotesOpen(false);
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    } finally {
      setIsSavingNotes(false);
    }
  }, [customer.id, notesValue]);

  const handleSetStageStatus = useCallback((stageId: string, newStatus: StageStatus) => {
    const original = originalStagesRef.current.find(s => s.id === stageId);
    if (original && original.status === newStatus) {
      setPendingChanges(prev => {
        const next = { ...prev };
        delete next[stageId];
        return next;
      });
    } else {
      setPendingChanges(prev => ({ ...prev, [stageId]: newStatus }));
    }
    setExpandedStageId(null);
  }, []);

  const handleDiscardChanges = useCallback(() => {
    setPendingChanges({});
    setExpandedStageId(null);
  }, []);

  const handleSaveChanges = useCallback(async () => {
    if (pendingCount === 0) return;

    setIsSaving(true);
    const now = new Date().toISOString();

    try {
      const updates = Object.entries(pendingChanges).map(([stageId, newStatus]) => {
        const updateData: Record<string, string> = {
          status: newStatus,
          updated_at: now,
        };
        if (newStatus !== "not-started") {
          updateData.status_changed_at = now;
        }
        return supabase
          .from("lifecycle_stages")
          .update(updateData)
          .eq("id", stageId);
      });

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`${errors.length} update(s) failed`);
      }

      // Apply changes to local state so dots reflect saved state
      setLocalStages(prev =>
        prev.map(s => pendingChanges[s.id]
          ? { ...s, status: pendingChanges[s.id], updated_at: now }
          : s
        )
      );
      originalStagesRef.current = localStages.map(s =>
        pendingChanges[s.id] ? { ...s, status: pendingChanges[s.id], updated_at: now } : s
      );
      setPendingChanges({});

      toast.success(`${pendingCount} stage${pendingCount > 1 ? "s" : ""} updated`);

      setStagesOpen(false);

      if (onStageUpdate) {
        setTimeout(() => onStageUpdate(false), 400);
      }
    } catch (error) {
      console.error("Error saving stage changes:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, pendingCount, localStages, onStageUpdate]);

  const handlePopoverClose = useCallback((open: boolean) => {
    if (!open && pendingCount > 0) {
      // Auto-save pending changes when closing the popover
      handleSaveChanges();
      return;
    }
    setStagesOpen(open);
    if (!open) {
      setExpandedStageId(null);
    }
  }, [pendingCount, handleSaveChanges]);

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
              {customer.partner_label === "batelco" && (
                <Badge className="text-[10px] px-1.5 py-0 h-5 shrink-0 font-medium bg-red-100 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
                  Batelco
                </Badge>
              )}
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
          <Popover open={stagesOpen} onOpenChange={handlePopoverClose}>
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
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isBatelco
                    ? "View-only lifecycle stage progress."
                    : `Click a status to change it. ${pendingCount > 0 ? "Changes save when you close." : ""}`}
                </p>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-1">
                {orderedCategories.map((category) => (
                  <div key={category} className="mb-1">
                    <p className={`text-xs font-semibold px-3 py-1.5 ${CATEGORY_COLORS[category] || "text-muted-foreground"}`}>
                      {category}
                    </p>
                    {stagesByCategory[category].map((stage) => {
                      const config = STATUS_CONFIG[stage.status] || STATUS_CONFIG["not-started"];
                      const isModified = !!pendingChanges[stage.id];
                      const isExpanded = expandedStageId === stage.id;
                      return (
                        <div key={stage.id} className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedStageId(isExpanded ? null : stage.id);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left ${isExpanded ? "bg-accent" : ""}`}
                          >
                            {isModified && (
                              <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-amber-400" />
                            )}
                            <div className={`w-2.5 h-2.5 rounded-full ${config.dot} shrink-0`} />
                            <span className="text-sm flex-1 truncate">{stage.name}</span>
                            <span className={`text-xs font-medium ${config.color} ${config.bg} px-2 py-0.5 rounded-full`}>
                              {config.label}
                            </span>
                          </button>
                          {!isBatelco && isExpanded && (
                            <div className="flex items-center gap-1 px-3 pb-2 pt-0.5">
                              {STATUS_CYCLE.map((status) => {
                                const sc = STATUS_CONFIG[status];
                                const isActive = stage.status === status;
                                return (
                                  <button
                                    key={status}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSetStageStatus(stage.id, status);
                                    }}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                                      isActive
                                        ? `${sc.bg} ${sc.color} ring-1 ring-current`
                                        : "hover:bg-accent text-muted-foreground"
                                    }`}
                                  >
                                    <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                    {sc.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              {!isBatelco && pendingCount > 0 && (
                <div className="border-t p-2 flex items-center gap-2 bg-muted/30">
                  <span className="text-xs text-muted-foreground flex-1 pl-1">
                    {pendingCount} unsaved change{pendingCount > 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDiscardChanges();
                    }}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <Undo2 className="h-3 w-3" />
                    Discard
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveChanges();
                    }}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}

        {/* Notes */}
        <Popover open={notesOpen} onOpenChange={setNotesOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNotesOpen(!notesOpen);
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border/60 hover:bg-accent/50 transition-colors text-left ${notesValue ? "" : "opacity-60"}`}
            >
              <StickyNote className={`h-3.5 w-3.5 shrink-0 ${notesValue ? "text-amber-500" : "text-muted-foreground"}`} />
              <span className="text-[11px] text-muted-foreground truncate flex-1">
                {notesValue || "Add a note..."}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-0"
            align="start"
            side="right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b">
              <h4 className="font-medium text-sm">Notes</h4>
            </div>
            <div className="p-3 space-y-2">
              <textarea
                value={notesValue}
                readOnly={isBatelco}
                onChange={isBatelco ? undefined : (e) => setNotesValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder={isBatelco ? "No notes." : "Add notes about this customer..."}
                className={`w-full min-h-[100px] text-sm bg-background border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring ${isBatelco ? "cursor-default opacity-70" : ""}`}
              />
              {!isBatelco && (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setNotesValue(customer.description || "");
                      setNotesOpen(false);
                    }}
                    className="px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveNotes();
                    }}
                    disabled={isSavingNotes}
                    className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {isSavingNotes ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save
                  </button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Footer: Updated + Contacted */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          {/* Last Updated */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground" title={customer.lastUpdatedAt ? `Updated ${new Date(customer.lastUpdatedAt).toLocaleString()}` : ""}>
            <Clock className="h-3 w-3" />
            <span>Updated {customer.lastUpdatedAt ? formatShortDate(customer.lastUpdatedAt) : "—"}</span>
          </div>

          {/* Last Contacted — read-only for Batelco, interactive popover for DOO */}
          {isBatelco ? (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>Contacted {lastContacted ? formatShortDate(lastContacted) : "Never"}</span>
            </div>
          ) : (
            <Popover open={contactedOpen} onOpenChange={setContactedOpen}>
              <PopoverTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setContactedOpen(!contactedOpen);
                  }}
                  disabled={isMarkingContacted}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                >
                  <Phone className={`h-3 w-3 ${isMarkingContacted ? "animate-pulse" : ""}`} />
                  <span>Contacted {lastContacted ? formatShortDate(lastContacted) : "Never"}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-56 p-1"
                align="end"
                side="top"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleContactedNow}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left text-sm"
                >
                  <Phone className="h-3.5 w-3.5 text-green-500" />
                  Contacted Now
                </button>

                <div className="px-3 py-2">
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    Set a different date
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={customDate}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => { e.stopPropagation(); setCustomDate(e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-xs border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      onClick={handleSetCustomDate}
                      disabled={!customDate}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CalendarDays className="h-3 w-3" />
                      Set
                    </button>
                  </div>
                </div>

                {lastContacted && (
                  <>
                    <div className="h-px bg-border mx-2" />
                    <button
                      onClick={handleClearContacted}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-destructive/10 transition-colors text-left text-sm text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear Contact Date
                    </button>
                  </>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const CustomerCard = memo(CustomerCardComponent);
