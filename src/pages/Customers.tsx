
import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CustomerCard } from "@/components/customers/CustomerCard";
import { Button } from "@/components/ui/button";
import { Plus, Search, ArrowUpDown, RefreshCw, Download } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CustomerData } from "@/types/customers";
import { toast } from "sonner";
import { syncCustomersToDatabase } from "@/utils/customerDataSync";

const Customers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "none">("none");
  const [sortBy, setSortBy] = useState<"name" | "contractSize">("name");
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [uniqueCountries, setUniqueCountries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Define lifecycle to pipeline stage mapping (same as in usePipelineData)
  const LIFECYCLE_TO_PIPELINE_MAPPING: Record<string, string> = {
    "Prospect": "Lead",
    "Qualified Lead": "Qualified", 
    "Meeting Set": "Qualified",
    "Demo": "Demo",
    "Discovery Call": "Demo",
    "Proposal Sent": "Proposal",
    "Proposal Approved": "Proposal", 
    "Contract Sent": "Contract",
    "Contract Signed": "Contract",
    "Onboarding": "Implementation",
    "Technical Setup": "Implementation",
    "Training": "Implementation",
    "Go Live": "Live"
  };

  const PIPELINE_STAGE_ORDER = ["Lead", "Qualified", "Demo", "Proposal", "Contract", "Implementation", "Live"];

  const getFurthestPipelineStage = (completedStages: string[]): string => {
    const pipelineStages = completedStages
      .map(stage => LIFECYCLE_TO_PIPELINE_MAPPING[stage])
      .filter(Boolean);
    
    if (pipelineStages.length === 0) return "Lead";
    
    let furthestStageIndex = -1;
    for (const stage of pipelineStages) {
      const index = PIPELINE_STAGE_ORDER.indexOf(stage);
      if (index > furthestStageIndex) {
        furthestStageIndex = index;
      }
    }
    
    return PIPELINE_STAGE_ORDER[furthestStageIndex] || "Lead";
  };

  const getCustomerStatus = (stage: string): "not-started" | "in-progress" | "done" | "blocked" => {
    if (stage === "Live") return "done";
    if (stage === "Lead") return "not-started";
    return "in-progress";
  };

  const formatDatabaseCustomer = (dbCustomer: any, completedStages: string[] = []): CustomerData => {
    const pipelineStage = getFurthestPipelineStage(completedStages);
    const derivedStatus = getCustomerStatus(pipelineStage);
    
    return {
      id: dbCustomer.id,
      name: dbCustomer.name,
      logo: dbCustomer.logo || undefined,
      segment: dbCustomer.segment || "Unknown Segment",
      country: dbCustomer.country || "Unknown Country",
      stage: pipelineStage,
      status: derivedStatus,
      contractSize: dbCustomer.contract_size || 0,
      owner: {
        id: dbCustomer.owner_id || "unknown",
        name: "Unassigned",
        role: "Unassigned"
      }
    };
  };

  const extractUniqueCountries = (customersData: CustomerData[]) => {
    const countries = customersData
      .map(customer => customer.country)
      .filter(country => country && country !== "Unknown Country")
      .filter((country, index, arr) => arr.indexOf(country) === index)
      .sort();
    
    setUniqueCountries(countries);
  };

  const fetchCustomers = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      console.log("Fetching customers from database...");
      
      // Fetch customers and their lifecycle stages
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*');

      if (customersError) {
        console.error("Supabase error:", customersError);
        throw customersError;
      }

      const { data: lifecycleStages, error: stagesError } = await supabase
        .from('lifecycle_stages')
        .select('customer_id, name, status')
        .eq('status', 'done');

      if (stagesError) {
        console.error("Lifecycle stages error:", stagesError);
        throw stagesError;
      }

      console.log("Customers data fetched:", customers);
      console.log("Lifecycle stages fetched:", lifecycleStages);

      if (customers && customers.length > 0) {
        // Group completed stages by customer
        const stagesByCustomer: Record<string, string[]> = {};
        lifecycleStages?.forEach(stage => {
          if (!stagesByCustomer[stage.customer_id]) {
            stagesByCustomer[stage.customer_id] = [];
          }
          stagesByCustomer[stage.customer_id].push(stage.name);
        });

        const formattedCustomers = customers.map(customer => 
          formatDatabaseCustomer(customer, stagesByCustomer[customer.id] || [])
        );
        
        setCustomers(formattedCustomers);
        extractUniqueCountries(formattedCustomers);
      } else {
        console.log("No customers found in database");
        setCustomers([]);
        setUniqueCountries([]);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
      setCustomers([]);
      setUniqueCountries([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleImportSampleData = async () => {
    try {
      setIsImporting(true);
      console.log("Importing sample customer data...");
      
      const success = await syncCustomersToDatabase();
      
      if (success) {
        toast.success("Sample data imported successfully");
        await fetchCustomers(true);
      } else {
        toast.error("Failed to import sample data");
      }
    } catch (error) {
      console.error("Error importing sample data:", error);
      toast.error("Failed to import sample data");
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    // Only fetch from database, no automatic sync
    fetchCustomers();
  }, []);

  // Refresh data when navigating back to this page
  useEffect(() => {
    if (location.state?.refresh || location.pathname === '/customers') {
      fetchCustomers(true);
    }
  }, [location.pathname, location.state]);

  React.useEffect(() => {
    const handleFocus = () => {
      fetchCustomers(true);
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleRefresh = () => {
    fetchCustomers(true);
  };

  const handleSort = (field: "name" | "contractSize") => {
    if (sortBy === field) {
      if (sortOrder === "none") setSortOrder("asc");
      else if (sortOrder === "asc") setSortOrder("desc");
      else setSortOrder("none");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getSortedCustomers = () => {
    let result = [...customers];
    
    if (sortOrder !== "none") {
      result.sort((a, b) => {
        if (sortBy === "contractSize") {
          return sortOrder === "asc" 
            ? a.contractSize - b.contractSize 
            : b.contractSize - a.contractSize;
        } else {
          return sortOrder === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
      });
    }
    
    return result;
  };

  const filteredCustomers = getSortedCustomers().filter((customer) => {
    if (filter !== "all" && customer.status !== filter) {
      return false;
    }
    
    if (countryFilter !== "all" && customer.country !== countryFilter) {
      return false;
    }
    
    if (
      searchTerm &&
      !customer.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Customers</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {customers.length === 0 && !isLoading && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleImportSampleData}
                disabled={isImporting}
              >
                <Download className={`mr-2 h-4 w-4 ${isImporting ? 'animate-spin' : ''}`} />
                Import Sample Data
              </Button>
            )}
            <Button onClick={() => navigate("/customers/new")}>
              <Plus className="mr-2 h-4 w-4" /> Add Customer
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search customers..."
              className="pl-8 pr-4 py-2 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="not-started">Not Started</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {uniqueCountries.map(country => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={() => handleSort("contractSize")}
            className="flex items-center gap-2"
          >
            <span>Sort by Contract Size</span>
            <ArrowUpDown className="h-4 w-4" />
            {sortBy === "contractSize" && sortOrder !== "none" && (
              <span className="text-xs">
                ({sortOrder === "asc" ? "Low to High" : "High to Low"})
              </span>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => handleSort("name")}
            className="flex items-center gap-2"
          >
            <span>Sort by Name</span>
            <ArrowUpDown className="h-4 w-4" />
            {sortBy === "name" && sortOrder !== "none" && (
              <span className="text-xs">
                ({sortOrder === "asc" ? "A to Z" : "Z to A"})
              </span>
            )}
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
            {isLoading ? (
              Array(6).fill(0).map((_, index) => (
                <div key={index} className="h-48 bg-gray-100 animate-pulse rounded-md"></div>
              ))
            ) : (
              filteredCustomers.map((customer) => (
                <CustomerCard key={customer.id} customer={customer} />
              ))
            )}
            
            {!isLoading && filteredCustomers.length === 0 && customers.length === 0 && (
              <div className="col-span-3 py-16 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No customers found in the database.</p>
                <Button onClick={handleImportSampleData} disabled={isImporting}>
                  <Download className={`mr-2 h-4 w-4 ${isImporting ? 'animate-spin' : ''}`} />
                  Import Sample Data
                </Button>
              </div>
            )}

            {!isLoading && filteredCustomers.length === 0 && customers.length > 0 && (
              <div className="col-span-3 py-16 text-center">
                <p className="text-gray-500 dark:text-gray-400">No customers match your current filters.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </DashboardLayout>
  );
};

export default Customers;
