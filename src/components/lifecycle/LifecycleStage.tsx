
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Check, Clock, AlertCircle } from "lucide-react";

export interface StageOwner {
  id: string;
  name: string;
  avatar?: string;
  role: string;
}

export interface LifecycleStageProps {
  id: string;
  name: string;
  status: "not-started" | "in-progress" | "done" | "blocked";
  owner?: StageOwner;
  deadline?: string;
  notes?: string;
}

export function LifecycleStage({
  id,
  name,
  status,
  owner,
  deadline,
  notes,
}: LifecycleStageProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "not-started":
        return <Clock className="h-4 w-4 text-gray-400" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "done":
        return <Check className="h-4 w-4 text-green-500" />;
      case "blocked":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "not-started":
        return "status-badge status-not-started";
      case "in-progress":
        return "status-badge status-in-progress";
      case "done":
        return "status-badge status-done";
      case "blocked":
        return "status-badge status-blocked";
      default:
        return "status-badge status-not-started";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="lifecycle-stage">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-medium text-gray-900">{name}</h3>
        <span className={getStatusClass(status)}>
          <div className="flex items-center">
            {getStatusIcon(status)}
            <span className="ml-1 capitalize">{status.replace("-", " ")}</span>
          </div>
        </span>
      </div>
      
      {owner && (
        <div className="flex items-center mt-4">
          <span className="text-sm text-gray-500 mr-2">Owner:</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={owner.avatar} alt={owner.name} />
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-800">
                      {getInitials(owner.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{owner.name}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{owner.role}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      
      {deadline && (
        <div className="mt-2 text-sm text-gray-500">
          <span className="font-medium">Deadline:</span> {deadline}
        </div>
      )}
      
      {notes && notes.length > 0 && (
        <div className="mt-2 text-sm text-gray-500">
          <div className="font-medium">Notes:</div>
          <p className="mt-1 text-gray-600">{notes}</p>
        </div>
      )}
    </div>
  );
}
