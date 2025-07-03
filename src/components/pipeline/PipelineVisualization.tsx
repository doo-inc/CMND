
import React from "react";
import { usePipelineData } from "@/hooks/usePipelineData";
import { PipelineStage } from "./PipelineStage";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export const PipelineVisualization = () => {
  const { pipelineData, isLoading, error } = usePipelineData();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4">
            {Array(6).fill(0).map((_, index) => (
              <div key={index} className="flex-shrink-0">
                <div className="h-32 w-48 bg-gray-200 animate-pulse rounded-lg"></div>
                {index < 5 && <div className="h-1 w-12 bg-gray-200 animate-pulse mt-16 ml-48"></div>}
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </Card>
    );
  }

  const totalPipelineValue = pipelineData.reduce((sum, stage) => sum + stage.totalValue, 0);
  const totalCustomers = pipelineData.reduce((sum, stage) => sum + stage.customerCount, 0);

  return (
    <div className="space-y-6">
      {/* Pipeline Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Pipeline Value</div>
          <div className="text-2xl font-bold text-green-600">
            ${(totalPipelineValue / 1000000).toFixed(2)}M
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Customers</div>
          <div className="text-2xl font-bold text-blue-600">{totalCustomers}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Active Stages</div>
          <div className="text-2xl font-bold text-purple-600">
            {pipelineData.filter(stage => stage.customerCount > 0).length}
          </div>
        </Card>
      </div>

      {/* Pipeline Visualization */}
      <div className="relative">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-0 pb-4 min-h-[200px]">
            {pipelineData.map((stage, index) => (
              <div key={stage.stageName} className="flex items-center flex-shrink-0">
                <PipelineStage 
                  stage={stage} 
                  stageIndex={index}
                  totalStages={pipelineData.length}
                />
                {index < pipelineData.length - 1 && (
                  <div className="w-8 h-1 bg-gradient-to-r from-purple-400 to-purple-300 mx-2 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
};
