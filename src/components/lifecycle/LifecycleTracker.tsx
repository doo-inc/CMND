
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LifecycleStage, LifecycleStageProps } from "./LifecycleStage";

interface LifecycleTrackerProps {
  customerId: string;
  customerName: string;
  stages: LifecycleStageProps[];
}

export function LifecycleTracker({
  customerId,
  customerName,
  stages,
}: LifecycleTrackerProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle>Lifecycle Tracker: {customerName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stages.map((stage) => (
            <LifecycleStage key={stage.id} {...stage} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
