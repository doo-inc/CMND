import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Users, DollarSign } from "lucide-react";

interface TrendData {
  month: string;
  totalValue: number;
  customerCount: number;
  avgDealSize: number;
}

interface PipelineValueTrendProps {
  trendData: TrendData[];
}

export const PipelineValueTrend: React.FC<PipelineValueTrendProps> = ({
  trendData,
}) => {
  const [activeMetrics, setActiveMetrics] = useState({
    totalValue: true,
    customerCount: true,
    avgDealSize: false,
  });

  const toggleMetric = (metric: keyof typeof activeMetrics) => {
    setActiveMetrics((prev) => ({ ...prev, [metric]: !prev[metric] }));
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 backdrop-blur-sm">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-semibold">
                {entry.name === "Customer Count"
                  ? entry.value
                  : formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6 backdrop-blur-sm bg-card/50 border-border/50 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Pipeline Value Trend
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            12-month historical pipeline performance
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeMetrics.totalValue ? "default" : "outline"}
            size="sm"
            onClick={() => toggleMetric("totalValue")}
            className="hover-scale transition-all"
          >
            <DollarSign className="h-3 w-3 mr-1" />
            Total Value
          </Button>
          <Button
            variant={activeMetrics.customerCount ? "default" : "outline"}
            size="sm"
            onClick={() => toggleMetric("customerCount")}
            className="hover-scale transition-all"
          >
            <Users className="h-3 w-3 mr-1" />
            Customers
          </Button>
          <Button
            variant={activeMetrics.avgDealSize ? "default" : "outline"}
            size="sm"
            onClick={() => toggleMetric("avgDealSize")}
            className="hover-scale transition-all"
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Avg Deal Size
          </Button>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trendData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="opacity-30"
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="circle"
              formatter={(value) => (
                <span className="text-sm text-muted-foreground">{value}</span>
              )}
            />
            {activeMetrics.totalValue && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="totalValue"
                name="Total Value"
                stroke="hsl(var(--chart-1))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--chart-1))", r: 4 }}
                activeDot={{ r: 6 }}
                animationDuration={1000}
              />
            )}
            {activeMetrics.customerCount && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="customerCount"
                name="Customer Count"
                stroke="hsl(var(--chart-2))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
                activeDot={{ r: 6 }}
                animationDuration={1000}
              />
            )}
            {activeMetrics.avgDealSize && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avgDealSize"
                name="Avg Deal Size"
                stroke="hsl(var(--chart-3))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--chart-3))", r: 4 }}
                activeDot={{ r: 6 }}
                animationDuration={1000}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border/50">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Current Total</p>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(trendData[trendData.length - 1]?.totalValue || 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Active Customers</p>
          <p className="text-lg font-bold text-chart-2">
            {trendData[trendData.length - 1]?.customerCount || 0}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Avg Deal Size</p>
          <p className="text-lg font-bold text-chart-3">
            {formatCurrency(trendData[trendData.length - 1]?.avgDealSize || 0)}
          </p>
        </div>
      </div>
    </Card>
  );
};
