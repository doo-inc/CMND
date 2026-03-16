
import React from "react";
import { CustomerData } from "@/types/customers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";

interface CustomerDotProps {
  customer: CustomerData;
  readOnly?: boolean;
}

export const CustomerDot: React.FC<CustomerDotProps> = ({ customer, readOnly = false }) => {
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done": return "ring-green-400";
      case "in-progress": return "ring-blue-400";
      case "blocked": return "ring-red-400";
      default: return "ring-gray-400";
    }
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

  const handleClick = () => {
    if (readOnly) return;
    navigate(`/customers/${customer.id}`);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              ${readOnly ? "cursor-default" : "cursor-pointer transition-transform hover:scale-110"}
              ring-2 ${getStatusColor(customer.status || "not-started")}
              rounded-full
            `}
            onClick={handleClick}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={customer.logo} alt={customer.name} />
              <AvatarFallback className="text-xs bg-gradient-to-br from-purple-400 to-blue-500 text-white">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </TooltipTrigger>
        <TooltipContent className="p-3 max-w-xs">
          <div className="space-y-2">
            <div className="font-semibold text-sm">{customer.name}</div>
            <div className="text-xs text-muted-foreground dark:text-gray-300">
              <div>Contract: {formatValue(customer.contractSize)}</div>
              <div>Owner: {customer.owner.name}</div>
              <div>Country: {customer.country}</div>
              <div>Status: <span className="capitalize">{customer.status?.replace('-', ' ')}</span></div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
