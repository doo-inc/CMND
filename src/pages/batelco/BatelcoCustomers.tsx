import React, { useState, useEffect, useMemo } from "react";
import { BatelcoLayout } from "@/components/batelco/BatelcoLayout";
import { CustomerCard } from "@/components/customers/CustomerCard";
import { Button } from "@/components/ui/button";
import { Plus, Search, RefreshCw, Filter } from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CustomerData } from "@/types/customers";
import { toast } from "sonner";
import { resolvePipelineStageFromLifecycleStages } from "@/utils/pipelineRules";
import { sortStagesByOrder } from "@/utils/stageOrdering";

const BatelcoCustomers = () => {
  const navigate = useNavigate();
  const [countryFilter, setCountryFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [uniqueCountries, setUniqueCountries] = useState<string[]>([]);
  const [uniqueStages, setUniqueStages] = useState<string[]>([]);
  const [uniqueSegments, setUniqueSegments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const formatCustomer = (dbCustomer: any, lifecycleStages: any[] = [], contractValue?: number): CustomerData => {
    const completedStages = lifecycleStages
      .filter((s) => s.status === "done" || s.status === "completed" || s.status === "not-applicable")
      .map((s) => s.name);

    let pipelineStage: string;
    if (lifecycleStages.length === 0) {
      pipelineStage = dbCustomer.stage || "Lead";
    } else {
      pipelineStage = resolvePipelineStageFromLifecycleStages(lifecycleStages, { includeInProgress: true });
    }

    const furthestCompletedStage = completedStages.length
      ? sortStagesByOrder(completedStages.map((name: string) => ({ name }))).slice(-1)[0]?.name
      : undefined;

    const displayValue = contractValue || dbCustomer.estimated_deal_value || dbCustomer.contract_size || 0;

    const cardLifecycleStages = lifecycleStages.map((s: any) => ({
      id: s.id,
      name: s.name,
      status: s.status || "not-started",
      category: s.category || null,
      updated_at: s.updated_at || s.created_at,
    }));

    return {
      id: dbCustomer.id,
      name: dbCustomer.name,
      logo: dbCustomer.logo || undefined,
      segment: dbCustomer.segment || "Unknown Segment",
      country: dbCustomer.country || "Bahrain",
      stage: pipelineStage,
      status: dbCustomer.status || "not-started",
      contractSize: displayValue,
      completedStages,
      furthestCompletedStage,
      owner: { id: dbCustomer.owner_id || "unknown", name: "Unassigned", role: "Unassigned" },
      description: dbCustomer.description || undefined,
      lifecycleStages: cardLifecycleStages,
      partner_label: dbCustomer.partner_label || undefined,
      last_contacted_at: dbCustomer.last_contacted_at ?? null,
    };
  };

  const fetchCustomers = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      // Batelco portal only shows customers that were added through the Batelco portal (partner_label = 'batelco').
      const { data: allRows, error } = await supabase
        .from("customers")
        .select("*")
        .eq("partner_label", "batelco");
      if (error) throw error;

      const dbCustomers: any[] = allRows || [];

      if (dbCustomers.length === 0) {
        setCustomers([]);
        setUniqueCountries([]);
        return;
      }

      const customerIds = dbCustomers.map((c: any) => c.id);

      // Batch fetch lifecycle stages (paginate to avoid Supabase 1000-row default limit)
      let allStages: any[] = [];
      const batchSize = 50;
      for (let i = 0; i < customerIds.length; i += batchSize) {
        const batch = customerIds.slice(i, i + batchSize);
        const { data: batchStages } = await supabase
          .from("lifecycle_stages")
          .select("id, customer_id, name, status, category, updated_at, created_at")
          .in("customer_id", batch)
          .limit(batch.length * 20);
        if (batchStages) allStages = allStages.concat(batchStages);
      }

      // Batch fetch contracts
      const { data: allContracts } = await supabase
        .from("contracts")
        .select("customer_id, value, status")
        .in("customer_id", customerIds)
        .in("status", ["active", "pending"]);

      const stagesByCustomer: Record<string, any[]> = {};
      (allStages || []).forEach((s) => {
        if (!stagesByCustomer[s.customer_id]) stagesByCustomer[s.customer_id] = [];
        stagesByCustomer[s.customer_id].push(s);
      });

      const contractValues: Record<string, number> = {};
      (allContracts || []).forEach((c) => {
        contractValues[c.customer_id] = (contractValues[c.customer_id] || 0) + (c.value || 0);
      });

      const formatted = dbCustomers.map((c: any) =>
        formatCustomer(c, stagesByCustomer[c.id] || [], contractValues[c.id])
      );

      setCustomers(formatted);

      const countries = [...new Set(formatted.map((c: CustomerData) => c.country).filter(Boolean))] as string[];
      setUniqueCountries(countries.sort());

      const pipelineStages = [...new Set(formatted.map((c: CustomerData) => c.stage).filter(Boolean))] as string[];
      const sortedPipelineStages = sortStagesByOrder(
        pipelineStages.map((name) => ({ name }))
      ).map((s) => s.name);
      setUniqueStages(sortedPipelineStages);

      const segments = [...new Set(formatted.map((c: CustomerData) => c.segment).filter((s) => s && s !== "Unknown Segment"))] as string[];
      setUniqueSegments(segments.sort());
    } catch (error) {
      console.error("Error fetching Batelco customers:", error);
      toast.error("Failed to load customers");
      setCustomers([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (countryFilter !== "all" && c.country !== countryFilter) return false;
      if (stageFilter !== "all" && c.stage !== stageFilter) return false;
      if (segmentFilter !== "all" && c.segment !== segmentFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [customers, countryFilter, stageFilter, segmentFilter, statusFilter, searchTerm]);

  const activeFilterCount =
    (countryFilter !== "all" ? 1 : 0) +
    (stageFilter !== "all" ? 1 : 0) +
    (segmentFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  return (
    <BatelcoLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Batelco partner customers
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchCustomers(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => navigate("/batelco/customers/new")} className="bg-red-600 hover:bg-red-700">
              <Plus className="mr-2 h-4 w-4" /> Add Customer
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFilterCount}
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
                      setCountryFilter("all");
                      setStageFilter("all");
                      setSegmentFilter("all");
                      setStatusFilter("all");
                    }}
                    className="h-8 text-xs"
                  >
                    Clear All
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                      {uniqueCountries.map((country) => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
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
                      {uniqueStages.map((stage) => (
                        <SelectItem key={stage} value={stage}>{stage}</SelectItem>
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
                      {uniqueSegments.map((segment) => (
                        <SelectItem key={segment} value={segment}>{segment}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? "s" : ""}
        </div>

        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
            {isLoading ? (
              Array(6)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="h-48 bg-muted animate-pulse rounded-md" />
                ))
            ) : filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <CustomerCard key={customer.id} customer={customer} onStageUpdate={() => fetchCustomers(false)} />
              ))
            ) : (
              <div className="col-span-3 py-16 text-center">
                <p className="text-muted-foreground">No customers found.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

    </BatelcoLayout>
  );
};

export default BatelcoCustomers;
