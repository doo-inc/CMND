import React, { useState } from "react";
import { PipelineStageData } from "@/hooks/usePipelineData";
import { CustomerDot } from "./CustomerDot";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PipelineStageProps {
  stage: PipelineStageData;
  viewMode: "value" | "count";
  stageIndex: number;
  totalStages: number;
}

export const PipelineStage: React.FC<PipelineStageProps> = ({ 
  stage, 
  viewMode, 
  stageIndex,
  totalStages 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const INITIAL_DISPLAY_COUNT = 12;

  const getStageColor = (index: number, total: number) => {
    const ratio = index / (total - 1);
    if (ratio <= 0.33) return "from-purple-500 to-purple-400";
    if (ratio <= 0.66) return "from-blue-500 to-blue-400";
    return "from-green-500 to-green-400";
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const isEmpty = stage.customerCount === 0;
  const gradientClass = getStageColor(stageIndex, totalStages);
  const hasOverflow = stage.customers.length > INITIAL_DISPLAY_COUNT;
  const overflowCount = stage.customers.length - INITIAL_DISPLAY_COUNT;

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card className={`
      relative w-96 p-6 transition-all duration-300 hover:shadow-lg overflow-visible
      ${isEmpty ? 'bg-gray-50 dark:bg-gray-800 border-dashed' : ''}
      ${isExpanded ? 'min-h-[600px]' : 'min-h-[220px]'}
    `}>
      {/* Stage Header */}
      <div className="mb-6">
        <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 mb-4">
          {stage.stageName}
        </h3>
        <div className={`
          inline-block px-5 py-3 rounded-full text-white text-sm font-medium
          bg-gradient-to-r ${gradientClass} shadow-sm
        `}>
          {viewMode === "value" 
            ? formatValue(stage.totalValue)
            : `${stage.customerCount} customers`
          }
        </div>
      </div>

      {/* Customer Content */}
      <div className="flex-1 overflow-visible">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-24 text-gray-500 dark:text-gray-400">
            <div className="text-sm text-center">
              No customers in this stage
            </div>
            <div className="text-xs mt-2">$0 value</div>
          </div>
        ) : (
          <div className="space-y-6 overflow-visible">
            {/* Initial Customer Dots */}
            <div className="overflow-visible">
              <div className="flex flex-wrap gap-3 p-2 overflow-visible">
                {stage.customers.slice(0, INITIAL_DISPLAY_COUNT).map((customer) => (
                  <CustomerDot key={customer.id} customer={customer} />
                ))}
              </div>
              
              {hasOverflow && !isExpanded && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-5 text-sm bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 dark:from-gray-800 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-600 border-blue-200 dark:border-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={toggleExpansion}
                  >
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Show {overflowCount} more customers
                  </Button>
                </div>
              )}
            </div>

            {/* Expanded Customer List */}
            {isExpanded && hasOverflow && (
              <div className="animate-fade-in space-y-5 overflow-visible">
                <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-5 font-medium uppercase tracking-wide">
                    Additional Customers ({overflowCount})
                  </div>
                  
                  <ScrollArea className="h-72 w-full overflow-visible">
                    <div className="flex flex-wrap gap-3 p-2 pb-5 overflow-visible">
                      {stage.customers.slice(INITIAL_DISPLAY_COUNT).map((customer) => (
                        <CustomerDot key={customer.id} customer={customer} />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Collapse Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-10 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 border border-gray-200 dark:border-gray-700"
                  onClick={toggleExpansion}
                >
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Hide Additional Customers
                </Button>
              </div>
            )}
            
            {/* Additional Info */}
            <div className="text-sm text-gray-600 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-700">
              {viewMode === "value" ? (
                <span>{stage.customerCount} customers</span>
              ) : (
                <span>{formatValue(stage.totalValue)} total</span>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
