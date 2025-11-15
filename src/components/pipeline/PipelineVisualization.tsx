
import React, { useMemo } from "react";
import { usePipelineData } from "@/hooks/usePipelineData";
import { PipelineStage } from "./PipelineStage";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface PipelineVisualizationProps {
  selectedCountries?: string[];
  filteredCustomerIds?: string[];
}

export const PipelineVisualization: React.FC<PipelineVisualizationProps> = ({
  selectedCountries = [],
  filteredCustomerIds = [],
}) => {
  const { pipelineData, isLoading, error } = usePipelineData();

  // Filter pipeline data based on selected filters
  const filteredPipelineData = useMemo(() => {
    return pipelineData.map((stage) => {
      let filteredCustomers = stage.customers;

      // Apply country filter
      if (selectedCountries.length > 0) {
        filteredCustomers = filteredCustomers.filter((customer) =>
          selectedCountries.includes(customer.country)
        );
      }

      // Apply customer ID filter (from insights)
      if (filteredCustomerIds.length > 0) {
        filteredCustomers = filteredCustomers.filter((customer) =>
          filteredCustomerIds.includes(customer.id)
        );
      }

      const totalValue = filteredCustomers.reduce(
        (sum, customer) => sum + (customer.contractSize || 0),
        0
      );

      return {
        ...stage,
        customers: filteredCustomers,
        customerCount: filteredCustomers.length,
        totalValue,
      };
    });
  }, [pipelineData, selectedCountries, filteredCustomerIds]);

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

  const totalPipelineValue = filteredPipelineData.reduce((sum, stage) => sum + stage.totalValue, 0);
  const totalCustomers = filteredPipelineData.reduce((sum, stage) => sum + stage.customerCount, 0);

  return (
    <div className="space-y-6">
      {/* Pipeline Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 backdrop-blur-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800 animate-fade-in hover:shadow-lg transition-all">
          <div className="text-sm text-muted-foreground font-medium mb-2">Total Pipeline Value</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            ${(totalPipelineValue / 1000000).toFixed(2)}M
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {filteredPipelineData.filter(s => s.totalValue > 0).length} active stages
          </div>
        </Card>
        <Card className="p-6 backdrop-blur-sm bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800 animate-fade-in hover:shadow-lg transition-all">
          <div className="text-sm text-muted-foreground font-medium mb-2">Total Customers</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalCustomers}</div>
          <div className="text-xs text-muted-foreground mt-1">
            across {filteredPipelineData.filter(s => s.customerCount > 0).length} stages
          </div>
        </Card>
        <Card className="p-6 backdrop-blur-sm bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800 animate-fade-in hover:shadow-lg transition-all">
          <div className="text-sm text-muted-foreground font-medium mb-2">Avg Deal Size</div>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            ${totalCustomers > 0 ? ((totalPipelineValue / totalCustomers) / 1000).toFixed(0) : 0}K
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            per customer
          </div>
        </Card>
      </div>

      {/* Pipeline Visualization */}
      <Card className="p-4 backdrop-blur-sm bg-card/50 border-border/50 animate-fade-in">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-0 pb-4 min-h-[200px]">
            {filteredPipelineData.map((stage, index) => (
              <div key={stage.stageName} className="flex items-center flex-shrink-0 animate-scale-in">
                <PipelineStage 
                  stage={stage} 
                  stageIndex={index}
                  totalStages={filteredPipelineData.length}
                />
                {index < filteredPipelineData.length - 1 && (
                  <div className="w-8 h-1 bg-gradient-to-r from-primary/60 to-primary/30 mx-2 flex-shrink-0 animate-pulse" />
                )}
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Card>
    </div>
  );
};
