
import React, { useState, useEffect } from "react";
import { LifecycleStageComponent, LifecycleStageProps } from "./LifecycleStage";
import { AddEditStage } from "./AddEditStage";
import { LifecycleProgress } from "./LifecycleProgress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { defaultLifecycleStages } from "@/data/defaultLifecycleStages";
import { sortStagesByOrder } from "@/utils/stageOrdering";

interface LifecycleTrackerProps {
  customerId: string;
  customerName: string;
  stages: LifecycleStageProps[];
  onStagesUpdate: (stages: LifecycleStageProps[]) => void;
}

export function LifecycleTracker({ 
  customerId, 
  customerName, 
  stages, 
  onStagesUpdate 
}: LifecycleTrackerProps) {
  const [isLoading, setIsLoading] = useState(false);

  const getDbCustomerId = (customerId: string) => {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      return customerId;
    }
    
    return `00000000-0000-0000-0000-${customerId.replace(/\D/g, '').padStart(12, '0')}`;
  };

  const handleStageUpdate = async (stageId: string, updatedStage: Partial<LifecycleStageProps>) => {
    console.log("Updating stage:", stageId, updatedStage);
    setIsLoading(true);
    
    try {
      const dbCustomerId = getDbCustomerId(customerId);
      const { error } = await supabase
        .from('lifecycle_stages')
        .update({
          name: updatedStage.name,
          status: updatedStage.status,
          deadline: updatedStage.deadline,
          notes: updatedStage.notes,
          category: updatedStage.category,
          owner_id: updatedStage.owner?.id,
        })
        .eq('id', stageId)
        .eq('customer_id', dbCustomerId);

      if (error) {
        console.error("Error updating stage:", error);
        throw error;
      }

      const updatedStages = stages.map(stage => 
        stage.id === stageId ? { ...stage, ...updatedStage } : stage
      );
      
      onStagesUpdate(updatedStages);
      toast.success("Stage updated successfully");

      await supabase
        .from('customer_timeline')
        .insert({
          customer_id: dbCustomerId,
          event_type: 'lifecycle_stage',
          event_description: `Lifecycle stage "${updatedStage.name || stages.find(s => s.id === stageId)?.name}" was updated`,
          created_by: "current-user",
          created_by_name: "Demo User",
          created_by_avatar: `https://avatar.vercel.sh/${Math.random()}.png`
        });

    } catch (error) {
      console.error("Error in handleStageUpdate:", error);
      toast.error("Failed to update stage");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStageAdd = async (newStage: Omit<LifecycleStageProps, 'id'>) => {
    console.log("Adding new stage:", newStage);
    setIsLoading(true);
    
    try {
      const dbCustomerId = getDbCustomerId(customerId);
      const { data, error } = await supabase
        .from('lifecycle_stages')
        .insert({
          customer_id: dbCustomerId,
          name: newStage.name,
          status: newStage.status || 'not-started',
          deadline: newStage.deadline,
          notes: newStage.notes,
          category: newStage.category,
          owner_id: newStage.owner?.id,
        })
        .select(`
          *,
          staff:owner_id (id, name, role)
        `);

      if (error) {
        console.error("Error adding stage:", error);
        throw error;
      }

      if (data && data[0]) {
        const formattedStage: LifecycleStageProps = {
          id: data[0].id,
          name: data[0].name,
          status: data[0].status as LifecycleStageProps["status"],
          category: data[0].category || "",
          owner: data[0].staff ? {
            id: data[0].staff.id,
            name: data[0].staff.name,
            role: data[0].staff.role
          } : newStage.owner,
          deadline: data[0].deadline,
          notes: data[0].notes,
          icon: newStage.icon
        };

        const updatedStages = [...stages, formattedStage];
        onStagesUpdate(sortStagesByOrder(updatedStages));
        toast.success("Stage added successfully");

        await supabase
          .from('customer_timeline')
          .insert({
            customer_id: dbCustomerId,
            event_type: 'lifecycle_stage',
            event_description: `New lifecycle stage "${newStage.name}" was added`,
            created_by: "current-user",
            created_by_name: "Demo User",
            created_by_avatar: `https://avatar.vercel.sh/${Math.random()}.png`
          });
      }
    } catch (error) {
      console.error("Error in handleStageAdd:", error);
      toast.error("Failed to add stage");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeStages = async () => {
      if (stages.length === 0) {
        console.log("No stages found, adding default stages for customer:", customerId);
        setIsLoading(true);
        
        try {
          const dbCustomerId = getDbCustomerId(customerId);
          
          for (const defaultStage of defaultLifecycleStages) {
            console.log("Adding default stage:", defaultStage.name);
            await supabase
              .from('lifecycle_stages')
              .insert({
                customer_id: dbCustomerId,
                name: defaultStage.name,
                status: defaultStage.status,
                category: defaultStage.category,
                owner_id: defaultStage.owner.id,
                deadline: defaultStage.deadline,
                notes: defaultStage.notes
              });
          }
          
          toast.success("Default lifecycle stages initialized");
          
          window.location.reload();
          
        } catch (error) {
          console.error("Error initializing default stages:", error);
          toast.error("Failed to initialize default stages");
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeStages();
  }, [customerId, stages.length]);

  const sortedStages = sortStagesByOrder(stages);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Lifecycle Stages for {customerName}
        </h2>
        <AddEditStage onSave={handleStageAdd} />
      </div>
      
      <LifecycleProgress stages={sortedStages} />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedStages.map((stage) => (
          <LifecycleStageComponent
            key={stage.id}
            {...stage}
            customerId={customerId}
            customerName={customerName}
            onUpdate={handleStageUpdate}
          />
        ))}
      </div>
      
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="animate-pulse text-center">
            <p className="text-muted-foreground">Processing lifecycle stages...</p>
          </div>
        </div>
      )}
    </div>
  );
}
