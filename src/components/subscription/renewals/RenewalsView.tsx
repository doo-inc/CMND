
import React, { useState } from "react";
import { MonthlyRenewal } from "../types";
import { MonthlyBlock } from "./MonthlyBlock";
import { CustomerSidePanel } from "./CustomerSidePanel";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";

interface RenewalsViewProps {
  monthlyRenewals: MonthlyRenewal[];
  isLoading: boolean;
}

export const RenewalsView: React.FC<RenewalsViewProps> = ({ monthlyRenewals, isLoading }) => {
  const [selectedMonth, setSelectedMonth] = useState<MonthlyRenewal | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleMonthClick = (monthData: MonthlyRenewal) => {
    setSelectedMonth(monthData);
    setIsPanelOpen(true);
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setSelectedMonth(null);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (monthlyRenewals.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No upcoming renewals
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No customers have renewals scheduled in the coming months.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {monthlyRenewals.map((monthData) => (
          <MonthlyBlock
            key={`${monthData.month}-${monthData.year}`}
            monthData={monthData}
            onClick={() => handleMonthClick(monthData)}
          />
        ))}
      </div>

      <CustomerSidePanel
        monthData={selectedMonth}
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
      />
    </>
  );
};
