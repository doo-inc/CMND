
import React, { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { LifecycleStageProps } from "./LifecycleStage";
import { Card, CardContent } from "@/components/ui/card";

interface LifecycleProgressProps {
  stages: LifecycleStageProps[];
}

export function LifecycleProgress({ stages }: LifecycleProgressProps) {
  const { completedPercentage, statusCount } = useMemo(() => {
    if (!stages || stages.length === 0) {
      return { completedPercentage: 0, statusCount: { total: 0, completed: 0 } };
    }

    const totalStages = stages.filter(s => s.status !== 'not-applicable').length;
    const completedStages = stages.filter(s => s.status === 'done' || s.status === 'not-applicable').length;
    
    const percentage = totalStages > 0 
      ? Math.round((completedStages / totalStages) * 100) 
      : 0;

    return {
      completedPercentage: percentage,
      statusCount: {
        total: totalStages,
        completed: completedStages
      }
    };
  }, [stages]);

  return (
    <Card className="glass-card animate-fade-in mb-4">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">Customer Lifecycle Progress</p>
            <span className="text-sm font-bold">{completedPercentage}%</span>
          </div>
          <Progress value={completedPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {statusCount.completed} of {statusCount.total} stages completed
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
