import React, { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CustomerCard } from "@/components/customers/CustomerCard";
import { Button } from "@/components/ui/button";
import { Plus, Search, ArrowUpDown, RefreshCw, Download, Upload, FileDown, Filter, X } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CustomerData } from "@/types/customers";
import { toast } from "sonner";
import { syncCustomersToDatabase } from "@/utils/customerDataSync";
import { exportCustomersToExcel } from "@/utils/excelExport";
import { sortStagesByOrder } from "@/utils/stageOrdering";
import { resolvePipelineStageFromLifecycleStages } from "@/utils/pipelineRules";
import { syncCustomerPipelineStages } from "@/utils/pipelineSync";

const Customers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [dealOwnerFilter, setDealOwnerFilter] = useState("all");
  const [projectOwnerFilter, setProjectOwnerFilter] = useState("all");
  const [contactedFilter, setContactedFilter] = useState("all");
  const [contactedFrom, setContactedFrom] = useState("");
  const [contactedTo, setContactedTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "none">("none");
  const [sortBy, setSortBy] = useState<"name" | "contractSize">("name");
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [uniqueCountries, setUniqueCountries] = useState<string[]>([]);
  const [uniqueStages, setUniqueStages] = useState<string[]>([]);
  const [uniqueSegments, setUniqueSegments] = useState<string[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const itemsPerPage = 24; // Show 24 customers per page for 3-column grid

// Pipeline rules are centralized in utils/pipelineRules.ts

  // Normalize and interpret stage statuses from DB (case and synonym tolerant)
  const normalizeStatus = (s?: string) => (s ?? "").toString().trim().toLowerCase().replace(/[_\s]+/g, "-");
  const isCompletedLike = (s?: string) => {
    const n = normalizeStatus(s);
    return n === "done" || n === "completed" || n === "complete" || n === "finished" || n === "not-applicable";
  };
  const isInProgressLike = (s?: string) => {
    const n = normalizeStatus(s);
    return n === "in-progress" || n === "inprogress" || n === "ongoing";
  };
  const isBlockedLike = (s?: string) => normalizeStatus(s) === "blocked";

// getFurthestPipelineStage removed; using resolvePipelineStageFromLifecycleStages

// getOperationalStatus removed; using getOperationalStatusFromArray from utils/stageStatus

  const formatDatabaseCustomer = (dbCustomer: any, lifecycleStages: any[] = [], contractValue?: number, lastContactedAt?: string | null): CustomerData => {
    // Strictly completed stages (for filters and "furthestCompletedStage")
    const completedStages = lifecycleStages
      .filter(stage => isCompletedLike(stage.status))
      .map(stage => stage.name);

    // Derive pipeline stage from lifecycle stages (include in-progress)
    // BUT: If customer has no lifecycle stages, use the database stage (may have been manually set)
    let pipelineStage: string;
    if (lifecycleStages.length === 0) {
      // No lifecycle stages - use database stage or default to "Lead"
      pipelineStage = dbCustomer.stage || "Lead";
    } else {
      // Has lifecycle stages - compute from them
      pipelineStage = resolvePipelineStageFromLifecycleStages(lifecycleStages, {
        includeInProgress: true,
      });
    }

    // Debug logging for specific customers
    if (dbCustomer.name?.toLowerCase().includes('macqueen') ||
        dbCustomer.name?.toLowerCase().includes('bait al asaad') ||
        dbCustomer.name?.toLowerCase().includes('grip')) {
      // console.log(`🔵 ${dbCustomer.name} formatDatabaseCustomer:`);
      // console.log('   Lifecycle stages count:', lifecycleStages.length);
      // console.log('   DB stage:', dbCustomer.stage);
      // console.log('   Final stage used:', pipelineStage);
    }

    // Use the operational status from the database (maintained by trigger / sync)
    const operationalStatus = dbCustomer.status || "not-started";

    // Compute latest completed stage by defined stage order (not by timestamp)
    const furthestCompletedStage = completedStages.length
      ? sortStagesByOrder(completedStages.map(name => ({ name }))).slice(-1)[0]?.name
      : undefined;

    // Compute last updated stage by timestamp (kept for reference, not used for filtering)
    const lastUpdatedStage = lifecycleStages && lifecycleStages.length > 0
      ? [...lifecycleStages]
          .sort((a, b) => {
            const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
            const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
            return bTime - aTime;
          })[0]?.name
      : undefined;

    // Use contract value if available, otherwise use estimated_deal_value or contract_size from profile
    const displayValue = contractValue || dbCustomer.estimated_deal_value || dbCustomer.contract_size || 0;

    // Compute last updated timestamp (most recent of customer updated_at and any stage updated_at)
    const timestamps = [
      dbCustomer.updated_at,
      ...lifecycleStages.map((s: any) => s.updated_at || s.created_at)
    ].filter(Boolean).map((t: string) => new Date(t).getTime());
    const lastUpdatedAt = timestamps.length > 0
      ? new Date(Math.max(...timestamps)).toISOString()
      : dbCustomer.updated_at || undefined;

    // Map lifecycle stages for card display
    const cardLifecycleStages = lifecycleStages.map((s: any) => ({
      id: s.id,
      name: s.name,
      status: s.status || 'not-started',
      category: s.category || null,
      updated_at: s.updated_at || s.created_at
    }));

    return {
      id: dbCustomer.id,
      name: dbCustomer.name,
      logo: dbCustomer.logo || undefined,
      segment: dbCustomer.segment || "Unknown Segment",
      country: dbCustomer.country || "Unknown Country",
      stage: pipelineStage,
      status: operationalStatus,
      contractSize: displayValue,
      completedStages,
      furthestCompletedStage,
      lastUpdatedStage,
      deal_owner: dbCustomer.deal_owner || null,
      project_owner: dbCustomer.project_owner || null,
      owner: {
        id: dbCustomer.owner_id || "unknown",
        name: "Unassigned",
        role: "Unassigned"
      },
      description: dbCustomer.description || undefined,
      lifecycleStages: cardLifecycleStages,
      lastUpdatedAt: lastUpdatedAt,
      last_contacted_at: lastContactedAt ?? null
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

  const extractUniqueStages = (allLifecycleStages: any[]) => {
    const stages = allLifecycleStages
      .map(stage => stage.name)
      .filter((stage, index, arr) => arr.indexOf(stage) === index)
      .map(name => ({ name }));
    
    const sortedStages = sortStagesByOrder(stages);
    setUniqueStages(sortedStages.map(stage => stage.name));
  };

  const extractUniqueSegments = (customersData: CustomerData[]) => {
    const segments = customersData
      .map(customer => customer.segment)
      .filter(segment => segment && segment !== "Unknown Segment")
      .filter((segment, index, arr) => arr.indexOf(segment) === index)
      .sort();
    
    setUniqueSegments(segments);
  };

  // Auto-fix customer stages on load
  const autoFixCustomerStages = async () => {
    try {
      // console.log("🔄 AUTO-FIX STARTING...");
      
      // Fetch all customers
      const { data: allCustomers, error: custErr } = await supabase
        .from('customers')
        .select('id, name, stage, status');
      
      if (custErr) {
        console.error("❌ Error fetching customers:", custErr);
        return;
      }
      
      if (!allCustomers || allCustomers.length === 0) return;
      
      // Fetch ALL lifecycle stages with pagination to avoid 1000 row limit
      let allStages: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data: pageStages, error: stagesErr } = await supabase
          .from('lifecycle_stages')
          .select('customer_id, name, status')
          .range(offset, offset + pageSize - 1);
        
        if (stagesErr) {
          console.error("❌ Error fetching stages:", stagesErr);
          break;
        }
        
        if (!pageStages || pageStages.length === 0) break;
        
        allStages = allStages.concat(pageStages);
        
        if (pageStages.length < pageSize) break;
        offset += pageSize;
      }
      
      // console.log(`📊 Found ${allCustomers.length} customers, ${allStages.length} lifecycle stages (paginated)`);
      
      // Group stages by customer
      const stagesByCustomer: Record<string, any[]> = {};
      allStages.forEach(stage => {
        if (!stagesByCustomer[stage.customer_id]) {
          stagesByCustomer[stage.customer_id] = [];
        }
        stagesByCustomer[stage.customer_id].push(stage);
      });
      
      // Stage template
      const stageTemplate = [
        { name: 'Prospect', category: 'Pre-Sales' },
        { name: 'Qualified Lead', category: 'Pre-Sales' },
        { name: 'Meeting Set', category: 'Pre-Sales' },
        { name: 'Discovery Call', category: 'Sales' },
        { name: 'Demo', category: 'Sales' },
        { name: 'Proposal Sent', category: 'Sales' },
        { name: 'Proposal Approved', category: 'Sales' },
        { name: 'Contract Sent', category: 'Sales' },
        { name: 'Contract Signed', category: 'Sales' },
        { name: 'Onboarding', category: 'Implementation' },
        { name: 'Technical Setup', category: 'Implementation' },
        { name: 'Training', category: 'Implementation' },
        { name: 'Go Live', category: 'Implementation' },
        { name: 'Payment Processed', category: 'Finance' }
      ];
      
      const stageProgress: Record<string, string[]> = {
        'Lead': [],
        'Qualified': ['Prospect', 'Qualified Lead', 'Meeting Set'],
        'Demo': ['Prospect', 'Qualified Lead', 'Meeting Set', 'Discovery Call', 'Demo'],
        'Proposal': ['Prospect', 'Qualified Lead', 'Meeting Set', 'Discovery Call', 'Demo', 'Proposal Sent'],
        'Contract': ['Prospect', 'Qualified Lead', 'Meeting Set', 'Discovery Call', 'Demo', 'Proposal Sent', 'Proposal Approved', 'Contract Sent', 'Contract Signed'],
        'Implementation': ['Prospect', 'Qualified Lead', 'Meeting Set', 'Discovery Call', 'Demo', 'Proposal Sent', 'Proposal Approved', 'Contract Sent', 'Contract Signed', 'Onboarding'],
        'Live': ['Prospect', 'Qualified Lead', 'Meeting Set', 'Discovery Call', 'Demo', 'Proposal Sent', 'Proposal Approved', 'Contract Sent', 'Contract Signed', 'Onboarding', 'Technical Setup', 'Training', 'Go Live', 'Payment Processed']
      };
      
      // Get default owner
      const { data: staffData } = await supabase.from('staff').select('id').limit(1);
      const defaultOwnerId = staffData?.[0]?.id || null;
      
      let createdCount = 0;
      let fixedCount = 0;
      
      // Process each customer
      for (const customer of allCustomers) {
        const existingStages = stagesByCustomer[customer.id] || [];
        const existingStageNames = existingStages.map(s => s.name?.toLowerCase());
        
        // Find missing stages for this customer
        const missingStages = stageTemplate.filter(
          t => !existingStageNames.includes(t.name.toLowerCase())
        );
        
        // Create missing stages
        if (missingStages.length > 0 && missingStages.length < 14) {
          // Customer has some stages but missing others - add missing ones
          const completedStages = stageProgress[customer.stage] || [];
          const stagesToInsert = missingStages.map(stage => ({
            customer_id: customer.id,
            name: stage.name,
            status: completedStages.includes(stage.name) ? 'done' : 'not-started',
            category: stage.category,
            owner_id: defaultOwnerId
          }));
          
          const { error } = await supabase.from('lifecycle_stages').insert(stagesToInsert);
          if (!error) {
            // console.log(`➕ Added ${missingStages.length} missing stages for ${customer.name}`);
            createdCount++;
            // Update local cache
            stagesToInsert.forEach(s => {
              if (!stagesByCustomer[customer.id]) stagesByCustomer[customer.id] = [];
              stagesByCustomer[customer.id].push(s);
            });
          }
        } else if (existingStages.length === 0) {
          // Customer has NO stages - create all
          const completedStages = stageProgress[customer.stage] || [];
          const stagesToInsert = stageTemplate.map(stage => ({
            customer_id: customer.id,
            name: stage.name,
            status: completedStages.includes(stage.name) ? 'done' : 'not-started',
            category: stage.category,
            owner_id: defaultOwnerId
          }));
          
          const { error } = await supabase.from('lifecycle_stages').insert(stagesToInsert);
          if (!error) {
            // console.log(`✅ Created all stages for ${customer.name} (${completedStages.length} marked done)`);
            createdCount++;
            stagesByCustomer[customer.id] = stagesToInsert;
          } else {
            console.error(`❌ Error creating stages for ${customer.name}:`, error.message);
          }
        }
        
        // Now compute and fix pipeline stage using current stages
        const currentStages = stagesByCustomer[customer.id] || [];
        if (currentStages.length > 0) {
          const computedStage = resolvePipelineStageFromLifecycleStages(currentStages, { includeInProgress: true });
          
          if (customer.stage !== computedStage) {
            const { error } = await supabase
              .from('customers')
              .update({ stage: computedStage })
              .eq('id', customer.id);
            
            if (!error) {
              // console.log(`🔄 Fixed ${customer.name}: "${customer.stage}" → "${computedStage}"`);
              fixedCount++;
            }
          }
        }
      }
      
      // console.log(`🔄 AUTO-FIX COMPLETE: Created stages for ${createdCount} customers, fixed ${fixedCount} pipeline stages`);
      
      if (createdCount > 0 || fixedCount > 0) {
        toast.success(`Auto-fix: ${createdCount} customers got stages, ${fixedCount} stages corrected`);
      }
      
    } catch (err) {
      console.error('❌ Auto-fix error:', err);
    }
  };

  const fetchCustomers = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      // Single query for all customer columns including last_contacted_at
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, name, logo, segment, country, stage, status, contract_size, deal_owner, project_owner, owner_id, industry, description, updated_at, estimated_deal_value, last_contacted_at');

      if (customersError) {
        console.error("Supabase error:", customersError);
        throw customersError;
      }

      if (!customers || customers.length === 0) {
        setCustomers([]);
        setUniqueCountries([]);
        setUniqueStages([]);
        setUniqueSegments([]);
        return;
      }

      const customerIds = customers.map(c => c.id);

      // Build all batch promises for stages and contracts in parallel
      const batchSize = 50;
      const stagePromises: PromiseLike<any>[] = [];
      const contractPromises: PromiseLike<any>[] = [];

      for (let i = 0; i < customerIds.length; i += batchSize) {
        const batch = customerIds.slice(i, i + batchSize);
        stagePromises.push(
          supabase
            .from('lifecycle_stages')
            .select('id, customer_id, name, status, category, updated_at, created_at')
            .in('customer_id', batch)
            .limit(batch.length * 20)
            .then(res => res)
        );
        contractPromises.push(
          supabase
            .from('contracts')
            .select('customer_id, value, status')
            .in('customer_id', batch)
            .in('status', ['active', 'pending'])
            .then(res => res)
        );
      }

      // Fire all stage + contract batches at once
      const [stageResults, contractResults] = await Promise.all([
        Promise.all(stagePromises),
        Promise.all(contractPromises),
      ]);

      const allLifecycleStages = stageResults.flatMap(r => r.data || []);
      const allContracts = contractResults.flatMap(r => r.data || []);

      // Group stages by customer
      const stagesByCustomer: Record<string, any[]> = {};
      allLifecycleStages.forEach(stage => {
        if (!stagesByCustomer[stage.customer_id]) stagesByCustomer[stage.customer_id] = [];
        stagesByCustomer[stage.customer_id].push(stage);
      });

      // Sum contract values by customer
      const contractValuesByCustomer: Record<string, number> = {};
      allContracts.forEach(contract => {
        contractValuesByCustomer[contract.customer_id] = (contractValuesByCustomer[contract.customer_id] || 0) + (contract.value || 0);
      });

      const formattedCustomers = customers.map(customer =>
        formatDatabaseCustomer(
          customer,
          stagesByCustomer[customer.id] || [],
          contractValuesByCustomer[customer.id],
          (customer as any).last_contacted_at ?? null
        )
      );
      
      setCustomers(formattedCustomers);
      extractUniqueCountries(formattedCustomers);
      extractUniqueStages(allLifecycleStages);
      extractUniqueSegments(formattedCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
      setCustomers([]);
      setUniqueCountries([]);
      setUniqueStages([]);
      setUniqueSegments([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleImportSampleData = async () => {
    try {
      setIsImporting(true);
      // console.log("Importing sample customer data...");
      
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

  const handleExportToExcel = async (exportAll = false) => {
    try {
      const dataToExport = exportAll ? customers : filteredCustomers;
      if (dataToExport.length === 0) {
        toast.error("No customers to export");
        return;
      }
      
      // Fetch fresh lifecycle stages data for accurate export
      const { data: lifecycleStages } = await supabase
        .from('lifecycle_stages')
        .select('*');
      
      exportCustomersToExcel(dataToExport, lifecycleStages || []);
      const label = exportAll ? "all" : "filtered";
      toast.success(`Exported ${dataToExport.length} ${label} customers to Excel`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export customers to Excel");
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      
      if (error) {
        console.error('Error fetching users:', error);
        return;
      }
      setUsers(data?.filter(u => u.full_name) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchUsers();
  }, []);

  // Debounced realtime subscription — coalesces rapid changes into a single refetch
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const debouncedRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchCustomers(false), 1500);
    };

    const channel = supabase
      .channel('customers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lifecycle_stages' }, debouncedRefetch)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  // Only refresh when explicitly requested via location state
  useEffect(() => {
    if (location.state?.refresh) {
      fetchCustomers(true);
    }
  }, [location.state?.refresh]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, countryFilter, stageFilter, segmentFilter, dealOwnerFilter, projectOwnerFilter, contactedFilter, contactedFrom, contactedTo]);

  // Removed window focus auto-refresh for performance

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        autoFixCustomerStages(),
        syncCustomerPipelineStages(),
      ]);
    } catch (error) {
      console.error("Refresh sync failed:", error);
    }
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

  // Memoize filtered and sorted customers to avoid recalculation on every render
  const filteredCustomers = useMemo(() => {
    // First filter
    let result = customers.filter((customer) => {
      if (filter !== "all" && customer.status !== filter) {
        return false;
      }

      if (countryFilter !== "all" && customer.country !== countryFilter) {
        return false;
      }

      if (stageFilter !== "all" && customer.furthestCompletedStage !== stageFilter) {
        return false;
      }

      if (segmentFilter !== "all" && customer.segment !== segmentFilter) {
        return false;
      }

      if (dealOwnerFilter !== "all" && customer.deal_owner !== dealOwnerFilter) {
        return false;
      }

      if (projectOwnerFilter !== "all" && customer.project_owner !== projectOwnerFilter) {
        return false;
      }

      if (
        searchTerm &&
        !customer.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Last Contacted filter
      if (contactedFilter !== "all") {
        const contacted = customer.last_contacted_at;
        if (contactedFilter === "never") {
          if (contacted) return false;
        } else if (contactedFilter === "custom") {
          if (!contacted) return false;
          const contactedDate = new Date(contacted).getTime();
          if (contactedFrom) {
            const from = new Date(contactedFrom);
            from.setHours(0, 0, 0, 0);
            if (contactedDate < from.getTime()) return false;
          }
          if (contactedTo) {
            const to = new Date(contactedTo);
            to.setHours(23, 59, 59, 999);
            if (contactedDate > to.getTime()) return false;
          }
        } else {
          // Preset: week, month, 3months
          if (!contacted) return false;
          const now = Date.now();
          const contactedDate = new Date(contacted).getTime();
          const daysMap: Record<string, number> = { week: 7, month: 30, "3months": 90 };
          const days = daysMap[contactedFilter];
          if (days && now - contactedDate > days * 86400000) return false;
        }
      }

      return true;
    });

    // Then sort
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
  }, [customers, filter, countryFilter, stageFilter, segmentFilter, dealOwnerFilter, projectOwnerFilter, contactedFilter, contactedFrom, contactedTo, searchTerm, sortOrder, sortBy]);

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
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading || customers.length === 0}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-2" align="end">
                <div className="space-y-1">
                  <button
                    onClick={() => handleExportToExcel(false)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                  >
                    Filtered ({filteredCustomers.length})
                  </button>
                  <button
                    onClick={() => handleExportToExcel(true)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                  >
                    All Customers ({customers.length})
                  </button>
                </div>
              </PopoverContent>
            </Popover>
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
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search customers..."
              className="pl-8 pr-4 py-2 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Consolidated Filters Button */}
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {(filter !== "all" || countryFilter !== "all" || stageFilter !== "all" || 
                  segmentFilter !== "all" || dealOwnerFilter !== "all" || projectOwnerFilter !== "all" || contactedFilter !== "all") && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {[filter, countryFilter, stageFilter, segmentFilter, dealOwnerFilter, projectOwnerFilter, contactedFilter]
                      .filter(f => f !== "all").length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setFilter("all");
                      setCountryFilter("all");
                      setStageFilter("all");
                      setSegmentFilter("all");
                      setDealOwnerFilter("all");
                      setProjectOwnerFilter("all");
                      setContactedFilter("all");
                      setContactedFrom("");
                      setContactedTo("");
                    }}
                    className="h-8 text-xs"
                  >
                    Clear All
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={filter} onValueChange={setFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="not-started">Not Started</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Country</Label>
                    <Select value={countryFilter} onValueChange={setCountryFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Countries" />
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
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Stage</Label>
                    <Select value={stageFilter} onValueChange={setStageFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Stages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stages</SelectItem>
                        {uniqueStages.map(stage => (
                          <SelectItem key={stage} value={stage}>
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Segment</Label>
                    <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Segments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Segments</SelectItem>
                        {uniqueSegments.map(segment => (
                          <SelectItem key={segment} value={segment}>
                            {segment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Deal Owner</Label>
                    <Select value={dealOwnerFilter} onValueChange={setDealOwnerFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Deal Owners" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Deal Owners</SelectItem>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.full_name}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Project Owner</Label>
                    <Select value={projectOwnerFilter} onValueChange={setProjectOwnerFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All Project Owners" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Project Owners</SelectItem>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.full_name}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Last Contacted</Label>
                    <Select value={contactedFilter} onValueChange={(val) => {
                      setContactedFilter(val);
                      if (val !== "custom") {
                        setContactedFrom("");
                        setContactedTo("");
                      }
                    }}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Any Time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Time</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last 30 Days</SelectItem>
                        <SelectItem value="3months">Last 90 Days</SelectItem>
                        <SelectItem value="never">Never Contacted</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                    {contactedFilter === "custom" && (
                      <div className="flex gap-2 mt-1.5">
                        <div className="flex-1">
                          <Label className="text-[10px] text-muted-foreground">From</Label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={contactedFrom}
                            onChange={(e) => setContactedFrom(e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-[10px] text-muted-foreground">To</Label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={contactedTo}
                            onChange={(e) => setContactedTo(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
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

        {/* Pagination Info */}
        {!isLoading && filteredCustomers.length > 0 && (
          <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
            <span>
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredCustomers.length)} - {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} customers
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-3">
                Page {currentPage} of {Math.ceil(filteredCustomers.length / itemsPerPage)}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredCustomers.length / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(filteredCustomers.length / itemsPerPage)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-350px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
            {isLoading ? (
              Array(6).fill(0).map((_, index) => (
                <div key={index} className="h-48 bg-muted animate-pulse rounded-md"></div>
              ))
            ) : (
              filteredCustomers
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((customer) => (
                <CustomerCard key={customer.id} customer={customer} onStageUpdate={fetchCustomers} />
              ))
            )}
            
            {!isLoading && filteredCustomers.length === 0 && customers.length === 0 && (
              <div className="col-span-3 py-16 text-center">
                <p className="text-muted-foreground dark:text-muted-foreground mb-4">No customers found in the database.</p>
                <Button onClick={handleImportSampleData} disabled={isImporting}>
                  <Download className={`mr-2 h-4 w-4 ${isImporting ? 'animate-spin' : ''}`} />
                  Import Sample Data
                </Button>
              </div>
            )}

            {!isLoading && filteredCustomers.length === 0 && customers.length > 0 && (
              <div className="col-span-3 py-16 text-center">
                <p className="text-muted-foreground dark:text-muted-foreground">No customers match your current filters.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </DashboardLayout>
  );
};

export default Customers;
