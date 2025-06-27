import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LifecycleStageComponent, LifecycleStageProps } from "./LifecycleStage";
import { AddEditStage } from "./AddEditStage";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { defaultLifecycleStages } from "@/data/defaultLifecycleStages";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LifecycleProgress } from "./LifecycleProgress";
import { createNotification } from "@/utils/notificationHelpers";
import { checkForDuplicateStages } from "@/utils/customerDataSync";
import { 
  FileCheck, Users, Briefcase, DollarSign, Calendar,
  BookOpen, HeartHandshake, Medal, Zap, CheckSquare
} from "lucide-react";

interface LifecycleTrackerProps {
  customerId: string;
  customerName: string;
  stages: LifecycleStageProps[];
  onStagesUpdate?: (stages: LifecycleStageProps[]) => void;
}

const STAGE_CATEGORIES = [
  "All",
  "Pre-Sales",
  "Sales", 
  "Implementation",
  "Finance"
];

// Icon mapping for stages
const stageIcons: Record<string, React.ReactNode> = {
  "Prospect": <Users className="h-5 w-5" />,
  "Qualified Lead": <CheckSquare className="h-5 w-5" />,
  "Meeting Set": <Calendar className="h-5 w-5" />,
  "Discovery Call": <Calendar className="h-5 w-5" />,
  "Proposal Sent": <FileCheck className="h-5 w-5" />,
  "Proposal Approved": <CheckSquare className="h-5 w-5" />,
  "Contract Sent": <FileCheck className="h-5 w-5" />,
  "Contract Signed": <CheckSquare className="h-5 w-5" />,
  "Onboarding": <Users className="h-5 w-5" />,
  "Technical Setup": <Zap className="h-5 w-5" />,
  "Training": <BookOpen className="h-5 w-5" />,
  "Go Live": <Zap className="h-5 w-5" />,
  "Payment Processed": <DollarSign className="h-5 w-5" />
};

export function LifecycleTracker({
  customerId,
  customerName,
  stages: initialStages,
  onStagesUpdate,
}: LifecycleTrackerProps) {
  const [stages, setStages] = useState<LifecycleStageProps[]>(initialStages && initialStages.length > 0 ? initialStages : []);
  const [hasFetchedStages, setHasFetchedStages] = useState(false);
  const [initialFetchComplete, setInitialFetchComplete] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [validStaffIds, setValidStaffIds] = useState<string[]>([]);
  const [isAddingDefaultStages, setIsAddingDefaultStages] = useState(false);

  const getDbCustomerId = () => {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      return customerId;
    }
    return `00000000-0000-0000-0000-${customerId.replace(/\D/g, '').padStart(12, '0')}`;
  };

  const convertDefaultStageToProps = (defaultStage: any): LifecycleStageProps => {
    return {
      ...defaultStage,
      icon: stageIcons[defaultStage.name] || <FileCheck className="h-5 w-5" />
    };
  };

  const fetchValidStaffIds = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id');
      
      if (error) {
        console.error("Error fetching staff IDs:", error);
        return [];
      }
      
      return data?.map(staff => staff.id) || [];
    } catch (error) {
      console.error("Error in fetchValidStaffIds:", error);
      return [];
    }
  };

  const addMissingPreSalesStages = async () => {
    try {
      const dbCustomerId = getDbCustomerId();
      
      // Check which pre-sales stages are missing
      const preSalesStages = ["Prospect", "Qualified Lead", "Meeting Set"];
      const { data: existingStages, error: fetchError } = await supabase
        .from('lifecycle_stages')
        .select('name')
        .eq('customer_id', dbCustomerId)
        .in('name', preSalesStages);
        
      if (fetchError) {
        console.error("Error checking existing pre-sales stages:", fetchError);
        return;
      }
      
      const existingNames = existingStages?.map(s => s.name) || [];
      const missingStages = preSalesStages.filter(name => !existingNames.includes(name));
      
      if (missingStages.length === 0) {
        console.log("All pre-sales stages already exist");
        return;
      }
      
      console.log("Adding missing pre-sales stages:", missingStages);
      
      const defaultStaffId = validStaffIds.length > 0 ? 
        validStaffIds[0] : "00000000-0000-0000-0000-000000000001";
        
      const stagesToAdd = missingStages.map(stageName => ({
        customer_id: dbCustomerId,
        name: stageName,
        status: "not-started",
        owner_id: defaultStaffId,
        category: "Pre-Sales",
        notes: null
      }));
      
      const { error: insertError } = await supabase
        .from('lifecycle_stages')
        .insert(stagesToAdd);
        
      if (insertError) {
        console.error("Error inserting missing pre-sales stages:", insertError);
      } else {
        console.log("Successfully added missing pre-sales stages");
        toast.success(`Added ${missingStages.length} pre-sales stages`);
        // Refresh stages after adding
        await fetchLifecycleStages();
      }
    } catch (error) {
      console.error("Error in addMissingPreSalesStages:", error);
    }
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
        const newStageData: LifecycleStageProps = {
          id: data[0].id,
          name: data[0].name,
          status: data[0].status as LifecycleStageProps["status"],
          category: data[0].category,
          owner: stageWithId.owner,
          deadline: data[0].deadline,
          notes: data[0].notes,
          icon: stageIcons[data[0].name] || <FileCheck className="h-5 w-5" />
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
      if (updatedStage.status !== undefined) updateData.status = updatedStage.status;
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

      if (updatedStage.name || updatedStage.owner || updatedStage.deadline || updatedStage.notes || updatedStage.category) {
        await createNotification({
          type: 'lifecycle',
          title: 'Lifecycle Stage Updated',
          message: `Stage "${updatedStage.name || currentStage?.name}" for ${customerName} has been updated`,
          related_id: stageId,
          related_type: 'lifecycle_stage'
        });
      }

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

      if (updatedStage.status && !updatedStage.name && !updatedStage.owner && !updatedStage.deadline && 
          updatedStage.notes === undefined && updatedStage.category === undefined) {
        toast.success(`Status updated to ${updatedStage.status.replace("-", " ")}`);
      } else {
        toast.success("Stage updated successfully");
      }
    } catch (error) {
      console.error("Error updating stage:", error);
      toast.error("Failed to update stage");
    }
  };

  const clearExistingStages = async () => {
    try {
      const dbCustomerId = getDbCustomerId();
      console.log("Clearing existing stages for customer:", dbCustomerId);
      
      const { error } = await supabase
        .from('lifecycle_stages')
        .delete()
        .eq('customer_id', dbCustomerId);
        
      if (error) {
        console.error("Error clearing existing stages:", error);
        throw error;
      }
      
      console.log("Successfully cleared existing stages");
      setStages([]);
    } catch (error) {
      console.error("Error in clearExistingStages:", error);
      toast.error("Failed to clear existing stages");
    }
  };

  const handleAddDefaultStages = async () => {
    try {
      console.log("Adding default lifecycle stages for customer:", customerId);
      setIsAddingDefaultStages(true);
      
      // First clear existing stages to start fresh
      await clearExistingStages();
      
      if (validStaffIds.length === 0) {
        const ids = await fetchValidStaffIds();
        setValidStaffIds(ids);
      }
      
      const dbCustomerId = getDbCustomerId();
      
      const stagesToAdd = defaultLifecycleStages;
      
      if (stagesToAdd.length === 0) {
        console.log("No default stages to add");
        return;
      }
      
      const defaultStaffId = validStaffIds.length > 0 ? 
        validStaffIds[0] : "00000000-0000-0000-0000-000000000001";
      
      const stagesToInsert = stagesToAdd.map(stage => ({
        customer_id: dbCustomerId,
        name: stage.name,
        status: stage.status || "not-started",
        owner_id: defaultStaffId,
        notes: null,
        category: stage.category || null
      }));
      
      console.log("Inserting stages:", stagesToInsert);
      
      for (let i = 0; i < stagesToInsert.length; i += 10) {
        const batch = stagesToInsert.slice(i, i + 10);
        const { error } = await supabase
          .from('lifecycle_stages')
          .insert(batch);
        
        if (error) {
          console.error(`Error inserting batch ${i}-${i+batch.length}:`, error);
        }
      }
      
      await fetchLifecycleStages();
      toast.success("Default lifecycle stages added");
    } catch (error) {
      console.error("Error adding default stages:", error);
      toast.error("Failed to add default stages");
    } finally {
      setIsAddingDefaultStages(false);
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
          staff:owner_id (id, name, role)
        `)
        .eq('customer_id', dbCustomerId);

      if (error) {
        console.error("Error details:", error);
        throw error;
      }

      if (data && Array.isArray(data)) {
        console.log("Fetched lifecycle stages:", data);
        const formattedStages: LifecycleStageProps[] = data.map((stage: any) => {
          return {
            id: stage.id,
            name: stage.name,
            status: stage.status as LifecycleStageProps["status"],
            category: stage.category || "",
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
            icon: stageIcons[stage.name] || <FileCheck className="h-5 w-5" />
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
    } finally {
      setInitialFetchComplete(true);
    }
  };
  
  useEffect(() => {
    if (customerId) {
      checkForDuplicateStages(customerId).then(() => {
        fetchLifecycleStages();
      });
    }
  }, [customerId]);
  
  useEffect(() => {
    if (initialFetchComplete && stages.length === 0 && !isAddingDefaultStages) {
      console.log("No stages found after initial fetch, adding default stages");
      handleAddDefaultStages();
    }
  }, [initialFetchComplete, stages.length, isAddingDefaultStages]);

  useEffect(() => {
    if (initialFetchComplete && stages.length > 0 && validStaffIds.length > 0) {
      // Since we've already populated all stages via SQL migration, we don't need this anymore
      console.log("Stages already exist, skipping pre-sales stage addition");
    }
  }, [initialFetchComplete, stages.length, validStaffIds]);

  const getCategoryKey = (tabCategory: string): string[] => {
    switch (tabCategory) {
      case "Pre-Sales":
        return ["Pre-Sales"];
      case "Sales":
        return ["Sales"];
      case "Implementation":
        return ["Implementation"];
      case "Finance":
        return ["Finance"];
      default:
        return [];
    }
  };

  const filteredStages = activeCategory === 'All' 
    ? stages 
    : stages.filter(stage => {
        const categoryKeys = getCategoryKey(activeCategory);
        const stageCategory = stage.category || "";
        return categoryKeys.includes(stageCategory);
      });

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
        <LifecycleProgress stages={stages} />
        
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
