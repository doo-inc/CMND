
import React from "react";
import { LifecycleStageComponent, LifecycleStageProps } from "./LifecycleStage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface CategorySectionProps {
  categoryName: string;
  stages: LifecycleStageProps[];
  customerId: string;
  customerName: string;
  onStageUpdate: (stageId: string, updatedStage: Partial<LifecycleStageProps>) => void;
}

export function CategorySection({ 
  categoryName, 
  stages, 
  customerId, 
  customerName, 
  onStageUpdate 
}: CategorySectionProps) {
  const completedStages = stages.filter(stage => stage.status === 'done' || stage.status === 'not-applicable').length;
  const totalStages = stages.filter(stage => stage.status !== 'not-applicable').length;
  const progressPercentage = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Pre-Sales":
        return "from-blue-500 to-blue-400";
      case "Sales":
        return "from-green-500 to-green-400";
      case "Implementation":
        return "from-purple-500 to-purple-400";
      case "Finance":
        return "from-orange-500 to-orange-400";
      default:
        return "from-gray-500 to-gray-400";
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "Pre-Sales":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "Sales":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "Implementation":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "Finance":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      default:
        return "bg-muted text-foreground dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  if (stages.length === 0) return null;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-background to-muted/30">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getCategoryColor(categoryName)} flex-shrink-0`} />
              <span>{categoryName} Overview</span>
            </CardTitle>
            <Badge className={`${getCategoryBadgeColor(categoryName)} text-xs whitespace-nowrap`}>
              {completedStages}/{totalStages} completed
            </Badge>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-medium">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {stages.map((stage) => (
          <div key={stage.id} className="min-h-[300px]">
            <LifecycleStageComponent
              {...stage}
              customerId={customerId}
              customerName={customerName}
              onUpdate={onStageUpdate}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
