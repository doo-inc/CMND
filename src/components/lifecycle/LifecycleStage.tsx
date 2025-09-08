
import React from "react";
import { AddEditStage } from "./AddEditStage";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { CheckCircle, Clock, AlertCircle, Circle, Slash, Calendar, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactNode } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export interface LifecycleStageProps {
  id: string;
  name: string;
  status: "not-started" | "in-progress" | "done" | "blocked" | "not-applicable";
  owner: {
    id: string;
    name: string;
    role: string;
  };
  status_changed_at?: string;
  notes?: string;
  icon?: ReactNode;
  category?: string;
  onUpdate?: (stageId: string, updatedStage: Partial<LifecycleStageProps>) => void;
}

interface LifecycleStageComponentProps extends LifecycleStageProps {
  customerId?: string;
  customerName?: string;
}

interface NewStageData {
  name?: string;
  status?: LifecycleStageProps["status"];
  category?: string;
  owner?: { id: string; name: string; role: string; };
  status_changed_at?: string;
  notes?: string;
  icon?: React.ReactNode;
}

export function LifecycleStageComponent({
  id,
  name,
  status,
  owner,
  status_changed_at,
  notes,
  icon,
  category,
  customerId,
  customerName,
  onUpdate,
}: LifecycleStageComponentProps) {
  const [localNotes, setLocalNotes] = React.useState<string>(notes || "");
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [justSaved, setJustSaved] = React.useState(false);

  React.useEffect(() => {
    setLocalNotes(notes || "");
    // cancel any pending save when props change or id changes
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }, [notes, id]);

  const triggerSave = React.useCallback((value: string) => {
    if (!onUpdate) return;
    setSaving(true);
    onUpdate(id, { notes: value });
    setSaving(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  }, [id, onUpdate]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "not-started":
        return <Circle className="h-4 w-4 text-gray-500" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "done":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "blocked":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "not-applicable":
        return <Slash className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "not-started":
        return <Badge variant="outline" className="text-xs">Not Started</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs">In Progress</Badge>;
      case "done":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Done</Badge>;
      case "blocked":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs">Blocked</Badge>;
      case "not-applicable":
        return <Badge variant="outline" className="border-gray-300 text-gray-500 text-xs">Not Applicable</Badge>;
      default:
        return <Badge className="text-xs">{status}</Badge>;
    }
  };

  const handleStatusChange = async (newStatus: LifecycleStageProps["status"]) => {
    if (onUpdate) {
      // Clear date if going back to "not-started", otherwise preserve existing date or set current date
      const statusChangedAt = newStatus === "not-started" 
        ? null 
        : (status_changed_at || new Date().toISOString());
      
      // Update in database
      try {
        await supabase
          .from('lifecycle_stages')
          .update({ 
            status: newStatus,
            status_changed_at: statusChangedAt
          })
          .eq('id', id);
          
        onUpdate(id, { status: newStatus, status_changed_at: statusChangedAt });
        toast.success(`Status updated to ${newStatus.replace("-", " ")}`);
      } catch (error) {
        console.error("Error updating status:", error);
        toast.error("Failed to update status");
      }
    }
  };


  const handleAddAsTask = async () => {
    if (!customerId) {
      toast.error("Customer information not available");
      return;
    }

    try {
      const taskTitle = `Complete ${name}${customerName ? ` for ${customerName}` : ''}`;
      const taskDescription = `Lifecycle stage: ${name}
Owner Role: ${owner.role}
Status: ${status.replace("-", " ")}
${notes ? `Notes: ${notes}` : ''}
${category ? `Category: ${category}` : ''}`;

      const dueDate = status_changed_at 
        ? new Date(Date.parse(status_changed_at) + 7 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: taskTitle,
          description: taskDescription,
          status: "todo",
          customer_id: customerId,
          due_date: dueDate,
          assigned_to: owner.id
        })
        .select();
        
      if (error) throw error;
      
      // Add timeline entry for the task creation
      await supabase
        .from('customer_timeline')
        .insert({
          customer_id: customerId,
          event_type: 'task',
          event_description: `Task created from lifecycle stage: ${name}`,
          related_id: data[0].id,
          related_type: 'task',
          created_by: "current-user",
          created_by_name: "Demo User",
          created_by_avatar: `https://avatar.vercel.sh/${Math.random()}.png`
        });
      
      toast.success("Task created successfully from lifecycle stage");
    } catch (error) {
      console.error("Error creating task from lifecycle stage:", error);
      toast.error("Failed to create task");
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium flex items-start gap-2 leading-tight">
            {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
            <span className="break-words">{name}</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddAsTask}
            className="h-6 w-6 p-0 flex-shrink-0"
            title="Add as Task"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {category && (
          <Badge variant="outline" className="bg-secondary/10 text-xs w-fit mt-1">{category}</Badge>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 pt-0 pb-2">
        <div className="space-y-2">
          {status_changed_at && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">
                Status changed: {new Date(status_changed_at).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="text-xs space-y-1">
            <p className="text-muted-foreground font-medium">Notes:</p>
            <Textarea
              placeholder="Add notes..."
              value={localNotes}
              onChange={(e) => {
                const value = e.target.value;
                setLocalNotes(value);
                if (saveTimer.current) {
                  clearTimeout(saveTimer.current);
                }
                // Debounced auto-save
                saveTimer.current = setTimeout(() => {
                  triggerSave(value);
                }, 600);
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (saveTimer.current) {
                  clearTimeout(saveTimer.current);
                  saveTimer.current = null;
                }
                triggerSave(value);
                toast.success("Notes saved");
              }}
              className="min-h-[60px] text-xs resize-none"
            />
            {(saving || justSaved) && (
              <p className="text-[10px] text-muted-foreground mt-1">{saving ? "Saving..." : "Saved"}</p>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between items-center pt-0 gap-2 pb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="px-2 h-7 text-xs">
              {getStatusBadge(status)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem onClick={() => handleStatusChange("not-started")}>
              <Circle className="h-4 w-4 mr-2 text-gray-500" />
              Not Started
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("in-progress")}>
              <Clock className="h-4 w-4 mr-2 text-blue-500" />
              In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("done")}>
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Done
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("blocked")}>
              <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
              Blocked
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatusChange("not-applicable")}>
              <Slash className="h-4 w-4 mr-2 text-gray-400" />
              Not Applicable
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <AddEditStage 
          stage={{ id, name, status, owner, status_changed_at, notes, icon, category }} 
          isEditing 
          onSave={(updatedStage: NewStageData) => {
            if (onUpdate) {
              onUpdate(id, updatedStage as Partial<LifecycleStageProps>);
            }
          }}
        />
      </CardFooter>
    </Card>
  );
}
