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
  deadline?: string;
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
  deadline?: string;
  notes?: string;
  icon?: React.ReactNode;
}

export function LifecycleStageComponent({
  id,
  name,
  status,
  owner,
  deadline,
  notes,
  icon,
  category,
  customerId,
  customerName,
  onUpdate,
}: LifecycleStageComponentProps) {
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
        return <Badge variant="outline">Not Started</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">In Progress</Badge>;
      case "done":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Done</Badge>;
      case "blocked":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Blocked</Badge>;
      case "not-applicable":
        return <Badge variant="outline" className="border-gray-300 text-gray-500">Not Applicable</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleStatusChange = (newStatus: LifecycleStageProps["status"]) => {
    if (onUpdate) {
      onUpdate(id, { status: newStatus });
      toast.success(`Status updated to ${newStatus.replace("-", " ")}`);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (onUpdate) {
      if (date) {
        onUpdate(id, { deadline: format(date, "yyyy-MM-dd") });
        toast.success("Deadline updated");
      } else {
        onUpdate(id, { deadline: undefined });
        toast.success("Deadline removed");
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
Owner: ${owner.name} (${owner.role})
Status: ${status.replace("-", " ")}
${notes ? `Notes: ${notes}` : ''}
${category ? `Category: ${category}` : ''}`;

      const dueDate = deadline 
        ? new Date(deadline).toISOString()
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {icon && icon}
            {name}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddAsTask}
            className="h-8 w-8 p-0"
            title="Add as Task"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {category && (
            <Badge variant="outline" className="bg-secondary/10">{category}</Badge>
          )}
          <div className="flex items-center space-x-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={`https://avatar.vercel.sh/${owner.name}.png`} alt={owner.name} />
              <AvatarFallback className="bg-secondary/50 text-secondary">{owner.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-medium">{owner.name}</p>
              <p className="text-muted-foreground">{owner.role}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="link" className="p-0 h-auto text-xs flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    {deadline ? new Date(deadline).toLocaleDateString() : "Set deadline"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={deadline ? new Date(deadline) : undefined}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {notes && (
            <div className="text-sm">
              <p className="text-muted-foreground">Notes:</p>
              <p>{notes}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="px-2">
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
          stage={{ id, name, status, owner, deadline, notes, icon, category }} 
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
