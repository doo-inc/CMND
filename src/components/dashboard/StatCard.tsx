
import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  icon?: React.ReactNode;
  description?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, change, icon, description, onClick }: StatCardProps) {
  return (
    <Card 
      className="group relative overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] min-h-[160px] flex flex-col justify-between border-0 bg-gradient-to-br from-card to-card/80" 
      onClick={onClick}
    >
      {/* Gradient accent bar on top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="p-6 flex-1">
        <div className="flex items-start justify-between h-full">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <h3 className="text-3xl font-bold mt-3 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              {value}
            </h3>
            {change && (
              <div className="flex items-center mt-2">
                {change.type === "increase" ? (
                  <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span
                  className={
                    change.type === "increase"
                      ? "text-xs font-medium text-green-500"
                      : "text-xs font-medium text-red-500"
                  }
                >
                  {change.value}%
                </span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-2">{description}</p>
            )}
          </div>
          
          {/* Icon with gradient background */}
          {icon && (
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <div className="text-primary w-7 h-7">
                {icon}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
