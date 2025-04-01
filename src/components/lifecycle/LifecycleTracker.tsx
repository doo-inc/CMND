import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LifecycleStageComponent, LifecycleStageProps } from "./LifecycleStage";
import { AddEditStage } from "./AddEditStage";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LifecycleStage, LifecycleStageWithOwner } from "@/types/customers";
import { createNotification } from "@/utils/notificationHelpers";
import { defaultLifecycleStages, icons, DefaultLifecycleStage } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LifecycleTrackerProps {
  customerId: string;
  customerName: string;
  stages: LifecycleStageProps[];
  onStagesUpdate?: (stages: LifecycleStageProps[]) => void;
}

const STAGE_CATEGORIES = [
  "All",
  "Sales",
  "Finance",
  "Onboarding",
  "Integration",
  "Training",
  "Success"
];

export function LifecycleTracker({
  customerId,
  customerName,
  stages: initialStages,
  onStagesUpdate,
}: LifecycleTrackerProps) {
  const [stages, setStages] = useState<LifecycleStageProps[]>(initialStages && initialStages.length > 0 ? initialStages : []);
  const [hasFetchedStages, setHasFetchedStages] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const getDbCustomerId = () => {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      return customerId;
    }
    return `00000000-0000-0000-0000-${customerId.replace(/\D/g, '').padStart(12, '0')}`;
  };

  const convertDefaultStageToProps = (defaultStage: DefaultLifecycleStage): LifecycleStageProps => {
    const IconComponent = icons[defaultStage.iconName];
    return {
      ...defaultStage,
      icon: IconComponent ? <IconComponent className="h-5 w-5" /> : undefined
    };
  };

  const handleAddStage = async (newStage: Partial<LifecycleStageProps>) => {
    try {
      const stageWithId: LifecycleStageProps = {
        id: `stage-${Date.now()}`,
        name: newStage.name || "",
        status: newStage.status || "not-started",
        category: newStage.category || "",
        owner: newStage.owner || {
          id: "user-001",
          name: "Ahmed Abdullah",
          role: "Account Executive"
        },
        deadline: newStage.deadline,
        notes: newStage.notes,
      };

      const { data, error } = await supabase
        .from('lifecycle_stages')
        .insert({
          customer_id: getDbCustomerId(),
          name: stageWithId.name,
          status: stageWithId.status,
          owner_id: stageWithId.owner.id,
          deadline: stageWithId.deadline,
          notes: stageWithId.notes,
          category: stageWithId.category
        })
        .select();

      if (error) {
        console.error("Error details:", error);
        throw error;
      }

      if (data && data.length > 0) {
        const matchingDefaultStage = defaultLifecycleStages.find(
          ds => ds.name === data[0].name && ds.category === data[0].category
        );
        
        const IconComponent = matchingDefaultStage ? icons[matchingDefaultStage.iconName] : undefined;
        
        const newStageData: LifecycleStageProps = {
          id: data[0].id,
          name: data[0].name,
          status: data[0].status as LifecycleStageProps["status"],
          category: data[0].category,
          owner: stageWithId.owner,
          deadline: data[0].deadline,
          notes: data[0].notes,
          icon: IconComponent ? <IconComponent className="h-5 w-5" /> : undefined
        };

        const updatedStages = [...stages, newStageData];
        setStages(updatedStages);
        
        if (onStagesUpdate) {
          onStagesUpdate(updatedStages);
        }

        await createNotification({
          type: 'lifecycle',
          title: 'New Lifecycle Stage Added',
          message: `A new stage "${newStageData.name}" has been added for ${customerName}`,
          related_id: data[0].id,
          related_type: 'lifecycle_stage'
        });

        if (newStageData.owner) {
          await createNotification({
            type: 'lifecycle',
            title: 'Lifecycle Stage Assigned',
            message: `"${newStageData.name}" for ${customerName} has been assigned to ${newStageData.owner.name}`,
            related_id: data[0].id,
            related_type: 'lifecycle_stage'
          });
        }

        if (newStageData.deadline) {
          await createNotification({
            type: 'deadline',
            title: 'New Deadline Added',
            message: `A deadline has been set for "${newStageData.name}" (${customerName}) - ${new Date(newStageData.deadline).toLocaleDateString()}`,
            related_id: data[0].id,
            related_type: 'lifecycle_stage'
          });
        }
      }

      toast.success("Stage added successfully");
    } catch (error) {
      console.error("Error adding stage:", error);
      toast.error("Failed to add stage");
    }
  };

  const handleUpdateStage = async (stageId: string, updatedStage: Partial<LifecycleStageProps>) => {
    try {
      const updateData: any = {};
      if (updatedStage.name) updateData.name = updatedStage.name;
      if (updatedStage.status) updateData.status = updatedStage.status;
      if (updatedStage.owner?.id) updateData.owner_id = updatedStage.owner.id;
      if (updatedStage.deadline !== undefined) updateData.deadline = updatedStage.deadline;
      if (updatedStage.notes !== undefined) updateData.notes = updatedStage.notes;
      if (updatedStage.category !== undefined) updateData.category = updatedStage.category;

      const { error } = await supabase
        .from('lifecycle_stages')
        .update(updateData)
        .eq('id', stageId);

      if (error) {
        console.error("Error details:", error);
        throw error;
      }

      const currentStage = stages.find(stage => stage.id === stageId);
      
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

      await createNotification({
        type: 'lifecycle',
        title: 'Lifecycle Stage Updated',
        message: `Stage "${updatedStage.name || currentStage?.name}" for ${customerName} has been updated`,
        related_id: stageId,
        related_type: 'lifecycle_stage'
      });

      if (updatedStage.owner && (!currentStage?.owner || currentStage.owner.id !== updatedStage.owner.id)) {
        await createNotification({
          type: 'lifecycle',
          title: 'Lifecycle Stage Assigned',
          message: `"${updatedStage.name || currentStage?.name}" for ${customerName} has been assigned to ${updatedStage.owner.name}`,
          related_id: stageId,
          related_type: 'lifecycle_stage'
        });
      }

      if (updatedStage.status === 'done' && currentStage?.status !== 'done') {
        await createNotification({
          type: 'lifecycle',
          title: 'Lifecycle Stage Completed',
          message: `"${updatedStage.name || currentStage?.name}" for ${customerName} has been marked as complete`,
          related_id: stageId,
          related_type: 'lifecycle_stage'
        });
      }

      if (updatedStage.deadline && (!currentStage?.deadline || currentStage.deadline !== updatedStage.deadline)) {
        await createNotification({
          type: 'deadline',
          title: 'Deadline Updated',
          message: `Deadline for "${updatedStage.name || currentStage?.name}" (${customerName}) has been updated to ${new Date(updatedStage.deadline).toLocaleDateString()}`,
          related_id: stageId,
          related_type: 'lifecycle_stage'
        });
      }

      toast.success("Stage updated successfully");
    } catch (error) {
      console.error("Error updating stage:", error);
      toast.error("Failed to update stage");
    }
  };

  const handleAddDefaultStages = async () => {
    try {
      const stagesWithIcons = defaultLifecycleStages.map(convertDefaultStageToProps);
      
      setStages([...stages, ...stagesWithIcons]);
      toast.success("Default stages loaded");
      
      const dbCustomerId = getDbCustomerId();
      const stagesToInsert = defaultLifecycleStages.map(stage => ({
        customer_id: dbCustomerId,
        name: stage.name,
        status: stage.status,
        owner_id: stage.owner.id,
        notes: stage.notes,
        category: stage.category
      }));
      
      const { error } = await supabase
        .from('lifecycle_stages')
        .insert(stagesToInsert);
      
      if (error) {
        console.error("Error details:", error);
        throw error;
      }
      
      await fetchLifecycleStages();
    } catch (error) {
      console.error("Error adding default stages:", error);
      toast.error("Failed to add default stages");
    }
  };

  const fetchLifecycleStages = async () => {
    if (!customerId) return;
    
    try {
      const dbCustomerId = getDbCustomerId();
      console.log("Fetching lifecycle stages for customer ID:", customerId, "DB ID:", dbCustomerId);

      const { data, error } = await supabase
        .from('lifecycle_stages')
        .select(`
          *,
          staff(id, name, role)
        `)
        .eq('customer_id', dbCustomerId);

      if (error) {
        console.error("Error details:", error);
        throw error;
      }

      if (data) {
        console.log("Fetched lifecycle stages:", data);
        const formattedStages: LifecycleStageProps[] = data.map((stage: any) => {
          const defaultStage = defaultLifecycleStages.find(
            ds => ds.name === stage.name && (stage.category ? ds.category === stage.category : true)
          );
          
          const IconComponent = defaultStage ? icons[defaultStage.iconName] : undefined;
          
          return {
            id: stage.id,
            name: stage.name,
            status: stage.status as LifecycleStageProps["status"],
            category: stage.category || defaultStage?.category || "",
            owner: stage.staff ? {
              id: stage.staff.id,
              name: stage.staff.name,
              role: stage.staff.role
            } : {
              id: "00000000-0000-0000-0000-000000000001",
              name: "Ahmed Abdullah",
              role: "Account Executive"
            },
            deadline: stage.deadline,
            notes: stage.notes,
            icon: IconComponent ? <IconComponent className="h-5 w-5" /> : undefined
          };
        });

        setStages(formattedStages);
        setHasFetchedStages(true);
        
        if (onStagesUpdate) {
          onStagesUpdate(formattedStages);
        }
      }
    } catch (error) {
      console.error("Error fetching lifecycle stages:", error);
      toast.error("Failed to load lifecycle stages");
    }
  };
  
  useEffect(() => {
    if (customerId) {
      fetchLifecycleStages();
    }
  }, [customerId, onStagesUpdate]);
  
  useEffect(() => {
    if (hasFetchedStages && stages.length === 0) {
      console.log("No stages found after fetch, using default stages");
      handleAddDefaultStages();
    }
  }, [hasFetchedStages, stages.length]);

  const filteredStages = activeCategory === 'All' 
    ? stages 
    : stages.filter(stage => stage.category === activeCategory);

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
        <Tabs defaultValue="All" value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
          <TabsList className="mb-4">
            {STAGE_CATEGORIES.map(category => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStages.map((stage, index) => (
            <div key={stage.id} className="animate-slide-in" style={{ animationDelay: `${index * 0.05}s` }}>
              <LifecycleStageComponent 
                {...stage} 
                onUpdate={handleUpdateStage}
              />
            </div>
          ))}
          
          {filteredStages.length === 0 && (
            <div className="col-span-3 text-center py-8">
              <p className="text-muted-foreground">
                {stages.length === 0 
                  ? "No lifecycle stages defined. Add your first stage!" 
                  : `No ${activeCategory} stages found. Switch category or add a new stage.`}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
