import React from "react";
import { AddEditStage } from "./AddEditStage";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { CheckCircle, Clock, AlertCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactNode } from "react";

export interface LifecycleStageProps {
  id: string;
  name: string;
  status: "not-started" | "in-progress" | "done" | "blocked";
  owner: {
    id: string;
    name: string;
    role: string;
  };
  deadline?: string;
  notes?: string;
  icon?: ReactNode;
  onUpdate?: (stageId: string, updatedStage: Partial<LifecycleStageProps>) => void;
}

export function LifecycleStageComponent({
  id,
  name,
  status,
  owner,
  deadline,
  notes,
  icon,
  onUpdate,
}: LifecycleStageProps) {
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
      default:
        return <Badge>{status}</Badge>;
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
          {getStatusIcon(status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
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
          
          {deadline && (
            <div className="text-sm text-muted-foreground">
              Deadline: {new Date(deadline).toLocaleDateString()}
            </div>
          )}
          
          {notes && (
            <div className="text-sm">
              <p className="text-muted-foreground">Notes:</p>
              <p>{notes}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        {getStatusBadge(status)}
        <AddEditStage 
          stage={{ id, name, status, owner, deadline, notes, icon }} 
          isEditing 
          onSave={(updatedStage) => {
            if (onUpdate) {
              onUpdate(id, updatedStage);
            }
          }}
        />
      </CardFooter>
    </Card>
  );
}
