
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LifecycleStage, LifecycleStageProps } from "./LifecycleStage";
import { AddEditStage } from "./AddEditStage";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LifecycleStageWithOwner } from "@/types/customers";

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

  const handleAddStage = async (newStage: Partial<LifecycleStageProps>) => {
    try {
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

      // Prepare the data for Supabase
      const { data, error } = await supabase
        .from('lifecycle_stages')
        .insert({
          customer_id: customerId,
          name: stageWithId.name,
          status: stageWithId.status,
          owner_id: stageWithId.owner.id,
          deadline: stageWithId.deadline,
          notes: stageWithId.notes
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Convert Supabase data to LifecycleStageProps format
      const newStageData: LifecycleStageProps = {
        id: data.id,
        name: data.name,
        status: data.status as "not-started" | "in-progress" | "done" | "blocked",
        owner: stageWithId.owner, // Using the provided owner data
        deadline: data.deadline,
        notes: data.notes,
      };

      const updatedStages = [...stages, newStageData];
      setStages(updatedStages);
      
      if (onStagesUpdate) {
        onStagesUpdate(updatedStages);
      }

      toast.success("Stage added successfully");
    } catch (error) {
      console.error("Error adding stage:", error);
      toast.error("Failed to add stage");
    }
  };

  const handleUpdateStage = async (stageId: string, updatedStage: Partial<LifecycleStageProps>) => {
    try {
      // Prepare the update data for Supabase
      const updateData: any = {};
      if (updatedStage.name) updateData.name = updatedStage.name;
      if (updatedStage.status) updateData.status = updatedStage.status;
      if (updatedStage.owner?.id) updateData.owner_id = updatedStage.owner.id;
      if (updatedStage.deadline !== undefined) updateData.deadline = updatedStage.deadline;
      if (updatedStage.notes !== undefined) updateData.notes = updatedStage.notes;

      const { error } = await supabase
        .from('lifecycle_stages')
        .update(updateData)
        .eq('id', stageId);

      if (error) {
        throw error;
      }

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

      toast.success("Stage updated successfully");
    } catch (error) {
      console.error("Error updating stage:", error);
      toast.error("Failed to update stage");
    }
  };

  // Load lifecycle stages from Supabase when component mounts
  useEffect(() => {
    const fetchLifecycleStages = async () => {
      try {
        const { data, error } = await supabase
          .from('lifecycle_stages')
          .select(`
            *,
            staff:owner_id (
              id, name, role
            )
          `)
          .eq('customer_id', customerId);

        if (error) {
          throw error;
        }

        if (data) {
          // Convert Supabase data to LifecycleStageProps format
          const formattedStages: LifecycleStageProps[] = data.map((stage: any) => ({
            id: stage.id,
            name: stage.name,
            status: stage.status as "not-started" | "in-progress" | "done" | "blocked",
            owner: stage.staff ? {
              id: stage.staff.id,
              name: stage.staff.name,
              role: stage.staff.role
            } : {
              id: "user-001",
              name: "Ahmed Abdullah",
              role: "Account Executive"
            },
            deadline: stage.deadline,
            notes: stage.notes,
          }));

          setStages(formattedStages);
          
          if (onStagesUpdate) {
            onStagesUpdate(formattedStages);
          }
        }
      } catch (error) {
        console.error("Error fetching lifecycle stages:", error);
        toast.error("Failed to load lifecycle stages");
      }
    };

    if (customerId) {
      fetchLifecycleStages();
    }
  }, [customerId, onStagesUpdate]);

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
