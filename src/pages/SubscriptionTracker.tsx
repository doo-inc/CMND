
import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Calendar, BarChart3, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useSubscriptionData } from "@/components/subscription/useSubscriptionData";
import { CustomerFilters } from "@/components/subscription/CustomerFilters";
import { TimelineView } from "@/components/subscription/timeline/TimelineView";
import { RenewalsView } from "@/components/subscription/renewals/RenewalsView";
import type { ViewMode } from "@/components/subscription/types";

const SubscriptionTracker = () => {
  const [activeView, setActiveView] = useState<ViewMode>("timeline");
  
  const {
    customers,
    isLoading,
    searchTerm,
    setSearchTerm,
    segmentFilter,
    setSegmentFilter,
    countryFilter,
    setCountryFilter,
    sortBy,
    setSortBy,
    uniqueSegments,
    uniqueCountries,
    handleRemindCustomer,
    handleUpdateDate,
    handleMarkAsPaid,
    refetch
  } = useSubscriptionData();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6 text-doo-purple-600" />
              Subscription Tracker
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor customers who have completed their Go Live stage
            </p>
          </div>
          <Button
            onClick={async () => {
              console.log('Refresh button clicked');
              await refetch();
            }}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Filters */}
        <CustomerFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          segmentFilter={segmentFilter}
          setSegmentFilter={setSegmentFilter}
          countryFilter={countryFilter}
          setCountryFilter={setCountryFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          uniqueSegments={uniqueSegments}
          uniqueCountries={uniqueCountries}
          viewMode={activeView}
        />

        {/* Tabbed Views */}
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as ViewMode)} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Timeline View
            </TabsTrigger>
            <TabsTrigger value="renewals" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Renewals & Payments
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-250px)]">
            <TabsContent value="timeline" className="space-y-6">
              <TimelineView customers={customers} isLoading={isLoading} />
            </TabsContent>

            <TabsContent value="renewals" className="space-y-6">
              <RenewalsView 
                customers={customers} 
                isLoading={isLoading}
                onRemind={handleRemindCustomer}
                onUpdateDate={handleUpdateDate}
                onMarkAsPaid={handleMarkAsPaid}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionTracker;
