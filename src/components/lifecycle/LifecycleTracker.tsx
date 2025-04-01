
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LifecycleStage, LifecycleStageProps } from "./LifecycleStage";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddEditStage } from "./AddEditStage";
import { toast } from "sonner";

interface LifecycleTrackerProps {
  customerId: string;
  customerName: string;
  stages: LifecycleStageProps[];
  onStagesUpdate?: (stages: LifecycleStageProps[]) => void;
}

export function LifecycleTracker({
  customerId,
  customerName,
  stages: initialStages,
  onStagesUpdate,
}: LifecycleTrackerProps) {
  const [stages, setStages] = useState(initialStages);

  const handleAddStage = (newStage: Partial<LifecycleStageProps>) => {
    const stageWithId: LifecycleStageProps = {
      id: `stage-${Date.now()}`,
      name: newStage.name || "",
      status: newStage.status || "not-started",
      owner: newStage.owner || {
        id: "user-001",
        name: "Ahmed Abdullah",
        role: "Account Executive"
      },
      deadline: newStage.deadline,
      notes: newStage.notes,
    };

    const updatedStages = [...stages, stageWithId];
    setStages(updatedStages);
    
    if (onStagesUpdate) {
      onStagesUpdate(updatedStages);
    }
  };

  const handleUpdateStage = (stageId: string, updatedStage: Partial<LifecycleStageProps>) => {
    const updatedStages = stages.map(stage => {
      if (stage.id === stageId) {
        return { ...stage, ...updatedStage };
      }
      return stage;
    });
    
    setStages(updatedStages);
    
    if (onStagesUpdate) {
      onStagesUpdate(updatedStages);
    }
  };

  return (
    <Card className="w-full glass-card">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Lifecycle Tracker: {customerName}</CardTitle>
        <AddEditStage 
          onSave={handleAddStage} 
          customerId={customerId}
        />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stages.map((stage, index) => (
            <div key={stage.id} className="animate-slide-in" style={{ animationDelay: `${index * 0.05}s` }}>
              <LifecycleStage 
                {...stage} 
                onUpdate={handleUpdateStage}
              />
            </div>
          ))}
          
          {stages.length === 0 && (
            <div className="col-span-3 text-center py-8">
              <p className="text-muted-foreground">No lifecycle stages defined. Add your first stage!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
