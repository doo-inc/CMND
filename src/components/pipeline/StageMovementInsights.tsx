import React from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MovementInsight {
  type: "moved" | "new" | "stalled" | "value_gained" | "value_lost";
  count: number;
  value?: number;
  customers: Array<{ id: string; name: string }>;
}

interface StageMovementInsightsProps {
  insights: {
    movedThisWeek: MovementInsight;
    newCustomers: MovementInsight;
    stalledCustomers: MovementInsight;
    valueGained: MovementInsight;
    valueLost: MovementInsight;
  };
  onInsightClick: (type: MovementInsight['type']) => void;
}

export const StageMovementInsights: React.FC<StageMovementInsightsProps> = ({
  insights,
  onInsightClick,
}) => {
  const insightCards = [
    {
      ...insights.movedThisWeek,
      type: "moved" as const,
      title: "Moved This Week",
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
    },
    {
      ...insights.newCustomers,
      type: "new" as const,
      title: "New Customers",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800",
    },
    {
      ...insights.stalledCustomers,
      type: "stalled" as const,
      title: "Stalled (14+ Days)",
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      borderColor: "border-orange-200 dark:border-orange-800",
    },
    {
      ...insights.valueGained,
      type: "value_gained" as const,
      title: "Value Gained",
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      borderColor: "border-emerald-200 dark:border-emerald-800",
    },
    {
      ...insights.valueLost,
      type: "value_lost" as const,
      title: "Value Lost",
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950/30",
      borderColor: "border-red-200 dark:border-red-800",
    },
  ];

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {insightCards.map((insight) => {
        const Icon = insight.icon;
        return (
          <Card
            key={insight.type}
            className={`${insight.bgColor} ${insight.borderColor} border-2 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 animate-fade-in`}
            onClick={() => onInsightClick(insight.type)}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className={`h-5 w-5 ${insight.color}`} />
                <Badge variant="secondary" className="text-xs">
                  {insight.count}
                </Badge>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {insight.title}
              </h3>
              {insight.value !== undefined && (
                <p className={`text-xl font-bold ${insight.color}`}>
                  {formatCurrency(insight.value)}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
