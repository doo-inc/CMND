
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface CustomerCardProps {
  customer: {
    id: string;
    name: string;
    logo?: string;
    segment: string;
    region: string;
    stage: string;
    status: "not-started" | "in-progress" | "done" | "blocked";
  };
}

export function CustomerCard({ customer }: CustomerCardProps) {
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
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-0">
        <div className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={customer.logo} alt={customer.name} />
              <AvatarFallback className="bg-blue-100 text-blue-800">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{customer.name}</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{customer.segment}</span>
                <span>•</span>
                <span>{customer.region}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current Stage</p>
              <p className="font-medium">{customer.stage}</p>
            </div>
            <span className={getStatusClass(customer.status)}>
              {customer.status.replace("-", " ")}
            </span>
          </div>
        </div>
        <div className="border-t p-3 bg-gray-50 flex justify-end">
          <Button variant="ghost" size="sm" className="text-sm">
            View Details <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
