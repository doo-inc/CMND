import React, { useState, useEffect } from "react";
import { LifecycleStageProps } from "./LifecycleStage";
import { AddEditStage } from "./AddEditStage";
import { EnhancedLifecycleProgress } from "./EnhancedLifecycleProgress";
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

interface NewStageData {
  name?: string;
  status?: LifecycleStageProps["status"];
  category?: string;
  owner?: { id: string; name: string; role: string; };
  status_changed_at?: string;
  notes?: string;
  icon?: React.ReactNode;
}

export function LifecycleTracker({ 
  customerId, 
  customerName, 
  stages, 
  onStagesUpdate 
}: LifecycleTrackerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  

  const getDbCustomerId = (customerId: string) => {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      return customerId;
    }
    
    return `00000000-0000-0000-0000-${customerId.replace(/\D/g, '').padStart(12, '0')}`;
  };

  const handleStageUpdate = async (stageId: string, updatedStage: Partial<LifecycleStageProps>) => {
    // Optimistic update - immediately update UI
    const originalStages = [...stages];
    const optimisticStages = stages.map(stage => 
      stage.id === stageId ? { ...stage, ...updatedStage } : stage
    );
    onStagesUpdate(optimisticStages);

    setIsLoading(true);

    try {
      const dbCustomerId = getDbCustomerId(customerId);

      // Build minimal payload only with provided fields
      const payload: Record<string, any> = {};
      if (Object.prototype.hasOwnProperty.call(updatedStage, 'name')) payload.name = updatedStage.name;
      if (Object.prototype.hasOwnProperty.call(updatedStage, 'status')) payload.status = updatedStage.status;
      if (Object.prototype.hasOwnProperty.call(updatedStage, 'status_changed_at')) payload.status_changed_at = updatedStage.status_changed_at ?? null;
      if (Object.prototype.hasOwnProperty.call(updatedStage, 'notes')) payload.notes = updatedStage.notes ?? null;
      if (Object.prototype.hasOwnProperty.call(updatedStage, 'category')) payload.category = updatedStage.category;
      if (Object.prototype.hasOwnProperty.call(updatedStage, 'owner')) payload.owner_id = updatedStage.owner?.id ?? null;

      const { data, error } = await supabase
        .from('lifecycle_stages')
        .update(payload)
        .eq('id', stageId)
        .eq('customer_id', dbCustomerId)
        .select(`
          *,
          staff:owner_id (id, name, role)
        `);

      if (error) {
        // Revert optimistic update on error
        onStagesUpdate(originalStages);
        throw error;
      }

      // Use returned row to update local state to canonical server data
      if (data && data[0]) {
        const row = data[0];
        const updated: LifecycleStageProps = {
          id: row.id,
          name: row.name,
          status: row.status as LifecycleStageProps["status"],
          category: row.category || "",
          owner: row.staff ? {
            id: row.staff.id,
            name: row.staff.name,
            role: row.staff.role
          } : (optimisticStages.find(s => s.id === stageId)?.owner || { id: "unknown", name: "Unknown", role: "Unknown" }),
          status_changed_at: row.status_changed_at,
          notes: row.notes,
          icon: optimisticStages.find(s => s.id === stageId)?.icon
        };
        const merged = stages.map(s => s.id === stageId ? updated : s);
        onStagesUpdate(sortStagesByOrder(merged));
      }

      toast.success("Stage updated successfully");

      // Add timeline entry (decoupled; ignore failures)
      try {
        await supabase
          .from('customer_timeline')
          .insert({
            customer_id: dbCustomerId,
            event_type: 'lifecycle_stage',
            event_description: `Lifecycle stage "${(updatedStage.name ?? stages.find(s => s.id === stageId)?.name) ?? ''}" was updated${updatedStage.status ? ` to "${updatedStage.status}"` : ''}`,
            created_by: "current-user",
            created_by_name: "Demo User",
            created_by_avatar: `https://avatar.vercel.sh/${Math.random()}.png`
          });
      } catch (timelineError) {
        console.error('Timeline logging failed:', timelineError);
      }

    } catch (error) {
      console.error('Failed to update stage:', error);
      toast.error("Failed to update stage");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStageAdd = async (newStage: NewStageData) => {
    setIsLoading(true);
    
    try {
      const dbCustomerId = getDbCustomerId(customerId);
      const { data, error } = await supabase
        .from('lifecycle_stages')
        .insert({
          customer_id: dbCustomerId,
          name: newStage.name,
          status: newStage.status || 'not-started',
          notes: newStage.notes,
          category: newStage.category,
          owner_id: newStage.owner?.id,
        })
        .select(`
          *,
          staff:owner_id (id, name, role)
        `);

      if (error) {
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
          } : newStage.owner || {
            id: "unknown",
            name: "Unknown",
            role: "Unknown"
          },
          status_changed_at: data[0].status_changed_at,
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
      toast.error("Failed to add stage");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDefaultStages = async () => {
    if (hasInitialized || stages.length > 0) return;
    
    setIsLoading(true);
    setHasInitialized(true);
    
    // Double-check that stages don't exist in database to prevent duplicates
    const dbCustomerId = getDbCustomerId(customerId);
    const { data: existingStages } = await supabase
      .from('lifecycle_stages')
      .select('id')
      .eq('customer_id', dbCustomerId);
    
    if (existingStages && existingStages.length > 0) {
      setIsLoading(false);
      return;
    }
    
    try {
      
      // Fetch available staff members
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, name, role');
      
      if (staffError) {
        throw staffError;
      }
      
      // Create a mapping of roles to staff members
      const staffByRole = {
        'Account Executive': staffData?.find(s => s.role === 'Account Executive'),
        'Customer Success Manager': staffData?.find(s => s.role === 'Customer Success Manager'),
        'Finance Manager': staffData?.find(s => s.role === 'Finance Manager'),
        'Integration Engineer': staffData?.find(s => s.role === 'Integration Engineer')
      };
      
      for (const defaultStage of defaultLifecycleStages) {
        
        // Try to find a matching staff member by role, fallback to first available or null
        const matchingStaff = staffByRole[defaultStage.owner.role as keyof typeof staffByRole] || 
                             staffData?.[0] || 
                             null;
        
        await supabase
          .from('lifecycle_stages')
          .insert({
            customer_id: dbCustomerId,
            name: defaultStage.name,
            status: defaultStage.status,
            category: defaultStage.category,
            owner_id: matchingStaff?.id || null,
            notes: defaultStage.notes
          });
      }
      
      toast.success("Default lifecycle stages initialized");
      
      // Refresh stages data without page reload
      const { data, error } = await supabase
        .from('lifecycle_stages')
        .select(`
          *,
          staff:owner_id (id, name, role)
        `)
        .eq('customer_id', dbCustomerId);

      if (!error && data) {
        const formattedStages: LifecycleStageProps[] = data.map((stage: any) => ({
          id: stage.id,
          name: stage.name,
          status: stage.status as LifecycleStageProps["status"],
          category: stage.category || "",
          owner: stage.staff ? {
            id: stage.staff.id,
            name: stage.staff.name,
            role: stage.staff.role
          } : {
            id: "unknown",
            name: "Unknown",
            role: "Unknown"
          },
          status_changed_at: stage.status_changed_at,
          notes: stage.notes,
        }));
        
        onStagesUpdate(sortStagesByOrder(formattedStages));
      }
      
    } catch (error) {
      toast.error("Failed to initialize default stages");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (stages.length === 0 && !hasInitialized) {
      initializeDefaultStages();
    }
  }, [customerId, stages.length, hasInitialized]);

  const sortedStages = sortStagesByOrder(stages);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Lifecycle Stages for {customerName}
        </h2>
        <AddEditStage onSave={handleStageAdd} />
      </div>
      
      
      <EnhancedLifecycleProgress 
        stages={sortedStages}
        customerId={customerId}
        customerName={customerName}
        onStageUpdate={handleStageUpdate}
      />
      
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
