import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, Search, Filter, Calendar as CalendarIcon, DollarSign } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types/customers";
import { toast } from "@/hooks/use-toast";
import { format, addYears } from "date-fns";
import { cn } from "@/lib/utils";

const SubscriptionTracker = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("renewal_date");
  const [displayFormat, setDisplayFormat] = useState<"months_days" | "days_only">("months_days");
  
  // Dialog states
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined);

  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['subscription-tracker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('stage', 'Went Live')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Customer[];
    }
  });

  // Mutation to update subscription end date
  const updateEndDateMutation = useMutation({
    mutationFn: async ({ customerId, endDate }: { customerId: string; endDate: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update({ subscription_end_date: endDate })
        .eq('id', customerId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription-tracker'] });
      toast({
        title: "Success",
        description: `Subscription end date updated for ${data.name}`,
      });
      setIsDateDialogOpen(false);
      setSelectedCustomer(null);
      setSelectedEndDate(undefined);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update subscription end date. Please try again.",
        variant: "destructive",
      });
      console.error('Error updating end date:', error);
    }
  });

  const handleSetEndDate = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedEndDate(customer.subscription_end_date ? new Date(customer.subscription_end_date) : undefined);
    setIsDateDialogOpen(true);
  };

  const handleSaveEndDate = () => {
    if (!selectedCustomer || !selectedEndDate) return;

    const endDateString = format(selectedEndDate, 'yyyy-MM-dd');
    updateEndDateMutation.mutate({
      customerId: selectedCustomer.id,
      endDate: endDateString
    });
  };

  // Quick date shortcuts for subscription dates
  const handleQuickDateSelect = (years: number) => {
    if (!selectedCustomer?.go_live_date) return;
    
    const startDate = new Date(selectedCustomer.go_live_date);
    const endDate = addYears(startDate, years);
    setSelectedEndDate(endDate);
  };

  // Calculate time left and status for each customer
  const processCustomers = (customers: Customer[]) => {
    return customers.map(customer => {
      const today = new Date();
      const endDate = customer.subscription_end_date ? new Date(customer.subscription_end_date) : null;
      
      let timeLeft = "";
      let status: "active" | "expiring_soon" | "expired" | "missing_date" = "missing_date";
      let delta = 0;

      if (endDate) {
        delta = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (delta > 30) {
          status = "active";
          if (displayFormat === "months_days") {
            const months = Math.floor(delta / 30);
            const days = delta % 30;
            timeLeft = days > 0 ? `${months} months, ${days} days left` : `${months} months left`;
          } else {
            timeLeft = `${delta} days left`;
          }
        } else if (delta > 0) {
          status = "expiring_soon";
          timeLeft = `${delta} days left`;
        } else if (delta === 0) {
          status = "expiring_soon";
          timeLeft = "Renew today";
        } else {
          status = "expired";
          timeLeft = "To Be Renewed";
        }
      } else {
        timeLeft = "End date not set";
      }

      return {
        ...customer,
        timeLeft,
        status,
        delta: endDate ? delta : -999999 // Sort missing dates last
      };
    });
  };

  const processedCustomers = processCustomers(customers);

  // Filter customers
  const filteredCustomers = processedCustomers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.country?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSegment = segmentFilter === "all" || customer.segment === segmentFilter;
    const matchesCountry = countryFilter === "all" || customer.country === countryFilter;
    
    return matchesSearch && matchesSegment && matchesCountry;
  });

  // Sort customers
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case "renewal_date":
        return a.delta - b.delta; // Soonest renewals first
      case "customer_name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'expiring_soon':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'missing_date':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'expiring_soon':
        return 'Expiring Soon';
      case 'expired':
        return 'Expired';
      case 'missing_date':
        return 'Missing Data';
      default:
        return 'Unknown';
    }
  };

  // Get unique values for filters
  const uniqueSegments = Array.from(new Set(customers.map(c => c.segment).filter(Boolean)));
  const uniqueCountries = Array.from(new Set(customers.map(c => c.country).filter(Boolean)));

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
              Monitor live customers' subscription renewals
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={displayFormat} onValueChange={(value: "months_days" | "days_only") => setDisplayFormat(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="months_days">Months + Days</SelectItem>
                <SelectItem value="days_only">Days Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="All Segments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  {uniqueSegments.map(segment => (
                    <SelectItem key={segment} value={segment}>{segment}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {uniqueCountries.map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="renewal_date">Renewal Date</SelectItem>
                  <SelectItem value="customer_name">Customer Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Customers Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedCustomers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No subscriptions found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || segmentFilter !== "all" || countryFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "No live customers with subscription data found."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCustomers.map((customer) => (
              <Card key={customer.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {customer.logo && (
                        <img src={customer.logo} alt={customer.name} className="h-10 w-10 rounded-lg object-cover" />
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {customer.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span>{customer.country || 'Global'}</span>
                          {customer.segment && <span>• {customer.segment}</span>}
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusBadgeColor(customer.status)}>
                      {getStatusLabel(customer.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="space-y-2">
                    {customer.go_live_date && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          Start Date:
                        </span>
                        <span className="font-medium">
                          {new Date(customer.go_live_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    {customer.subscription_end_date && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          End Date:
                        </span>
                        <span className="font-medium">
                          {new Date(customer.subscription_end_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Time Left:
                      </span>
                      <span className={`font-medium ${
                        customer.status === 'expired' ? 'text-red-600 dark:text-red-400' :
                        customer.status === 'expiring_soon' ? 'text-orange-600 dark:text-orange-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {customer.timeLeft}
                      </span>
                    </div>
                    
                    {customer.annual_rate && customer.annual_rate > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Annual Rate:
                        </span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          ${(customer.annual_rate / 100).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {(customer.status === 'expiring_soon' || customer.status === 'expired') && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        Mark as Renewed
                      </Button>
                      <Button size="sm" className="flex-1 bg-doo-purple-600 hover:bg-doo-purple-700">
                        Renew Now
                      </Button>
                    </div>
                  )}
                  
                  {customer.status === 'missing_date' && (
                    <div className="pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleSetEndDate(customer)}
                      >
                        Set End Date
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Set End Date Dialog */}
        <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Set Subscription End Date</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Customer: <span className="font-medium text-gray-900 dark:text-gray-100">{selectedCustomer?.name}</span>
                </p>
                {selectedCustomer?.go_live_date && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Start Date: {new Date(selectedCustomer.go_live_date).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Quick Duration Shortcuts */}
              {selectedCustomer?.go_live_date && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quick Select Duration</label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateSelect(1)}
                      className="text-xs"
                    >
                      1 Year
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateSelect(2)}
                      className="text-xs"
                    >
                      2 Years
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateSelect(3)}
                      className="text-xs"
                    >
                      3 Years
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateSelect(5)}
                      className="text-xs"
                    >
                      5 Years
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Subscription End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedEndDate ? format(selectedEndDate, "PPP") : <span>Select end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center" side="top">
                    <Calendar
                      mode="single"
                      selected={selectedEndDate}
                      onSelect={setSelectedEndDate}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        
                        // If there's a start date, prevent selecting before it
                        if (selectedCustomer?.go_live_date) {
                          const startDate = new Date(selectedCustomer.go_live_date);
                          startDate.setHours(0, 0, 0, 0);
                          return date < startDate;
                        }
                        
                        // Otherwise, just prevent past dates
                        return date < today;
                      }}
                      initialFocus
                      compact={true}
                    />
                  </PopoverContent>
                </Popover>
                
                {selectedEndDate && selectedCustomer?.go_live_date && (
                  <p className="text-xs text-muted-foreground">
                    Duration: {Math.ceil((selectedEndDate.getTime() - new Date(selectedCustomer.go_live_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} year(s)
                  </p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsDateDialogOpen(false)}
                disabled={updateEndDateMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveEndDate}
                disabled={!selectedEndDate || updateEndDateMutation.isPending}
                className="bg-doo-purple-600 hover:bg-doo-purple-700"
              >
                {updateEndDateMutation.isPending ? "Saving..." : "Save End Date"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionTracker;
