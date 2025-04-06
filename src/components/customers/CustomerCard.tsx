
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface CustomerOwner {
  id: string;
  name: string;
  role: string;
}

export interface CustomerData {
  id: string;
  name: string;
  logo?: string;
  segment: string;
  region: string;
  stage: string;
  status: "not-started" | "in-progress" | "done" | "blocked";
  contractSize: number;
  owner: CustomerOwner;
  description?: string;
  lifecyclePercentage?: number;
}

interface CustomerCardProps {
  customer: CustomerData;
  showEditOptions?: boolean;
  isDetailed?: boolean;
}

export function CustomerCard({ customer, showEditOptions = false, isDetailed = false }: CustomerCardProps) {
  const getStatusClass = (status: string) => {
    switch (status) {
      case "not-started":
        return "status-badge status-not-started";
      case "in-progress":
        return "status-badge status-in-progress";
      case "done":
        return "status-badge status-done";
      case "blocked":
        return "status-badge status-blocked";
      default:
        return "status-badge status-not-started";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200 bg-card relative">
      {customer.lifecyclePercentage !== undefined && (
        <div className="absolute top-0 right-0 m-3">
          <Badge variant="outline" className="bg-doo-purple-100 text-doo-purple-800 dark:bg-doo-purple-900/30 dark:text-doo-purple-300 border-doo-purple-200">
            {customer.lifecyclePercentage}% Complete
          </Badge>
        </div>
      )}
      <CardContent className="p-0">
        <div className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={customer.logo} alt={customer.name} />
              <AvatarFallback className="bg-doo-purple-100 text-doo-purple-800 dark:bg-doo-purple-800 dark:text-doo-purple-100">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{customer.name}</h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>{customer.segment}</span>
                <span>•</span>
                <span>{customer.region}</span>
              </div>
            </div>
          </div>
          
          {customer.description && (
            <div className="mt-3">
              <p className="text-sm text-muted-foreground">{customer.description}</p>
            </div>
          )}
          
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div>
              <p className="text-sm text-muted-foreground">Current Stage</p>
              <p className="font-medium">{customer.stage}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Contract Size</p>
              <p className="font-medium">${customer.contractSize.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            <span className={getStatusClass(customer.status)}>
              {customer.status.replace("-", " ")}
            </span>
            <div className="flex items-center text-xs text-muted-foreground">
              <User className="h-3 w-3 mr-1" />
              <span>{customer.owner.name}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
