
import React from "react";
import { CalendarClock, Clock, FileEdit, MoreHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { AddEditStage } from "./AddEditStage";

export interface OwnerType {
  id: string;
  name: string;
  role: string;
}

export interface LifecycleStageProps {
  id: string;
  name: string;
  status: "not-started" | "in-progress" | "done" | "blocked";
  owner: OwnerType;
  deadline?: string;
  notes?: string;
}

interface LifecycleStageComponentProps extends LifecycleStageProps {
  onUpdate?: (id: string, updatedStage: Partial<LifecycleStageProps>) => void;
}

export function LifecycleStage({ 
  id, 
  name, 
  status, 
  owner, 
  deadline, 
  notes,
  onUpdate
}: LifecycleStageComponentProps) {
  
  const getStatusClass = () => {
    switch (status) {
      case "not-started":
        return "status-not-started";
      case "in-progress":
        return "status-in-progress";
      case "done":
        return "status-done";
      case "blocked":
        return "status-blocked";
      default:
        return "status-not-started";
    }
  };

  const handleSaveStage = (updatedStage: Partial<LifecycleStageProps>) => {
    if (onUpdate) {
      onUpdate(id, updatedStage);
    }
  };

  return (
    <div className="lifecycle-stage glass-card animate-fade-in">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-base font-semibold">{name}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-card">
            <DropdownMenuItem className="cursor-pointer" asChild>
              <AddEditStage 
                stage={{ id, name, status, owner, deadline, notes }} 
                isEditing={true}
                onSave={handleSaveStage}
              />
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Users className="mr-2 h-4 w-4" />
              <span>Change Owner</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <CalendarClock className="mr-2 h-4 w-4" />
              <span>Set Deadline</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <span className={`status-badge ${getStatusClass()}`}>
            {status.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase())}
          </span>
          <span className="text-xs text-muted-foreground">{owner.name}</span>
        </div>
        
        {deadline && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            <span>Due {deadline}</span>
          </div>
        )}
        
        {notes && (
          <p className="text-xs mt-2 text-muted-foreground line-clamp-2">
            {notes}
          </p>
        )}
      </div>
    </div>
  );
}
