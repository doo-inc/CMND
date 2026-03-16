
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CustomerData } from "@/types/customers";
import { syncCustomerPipelineStages } from "@/utils/pipelineSync";

export interface PipelineStageData {
  stageName: string;
  totalValue: number;
  customerCount: number;
  customers: CustomerData[];
}

// Use centralized pipeline rules
import { PIPELINE_STAGE_ORDER, resolvePipelineStageFromLifecycleStages } from "@/utils/pipelineRules";

const PIPELINE_STAGES = PIPELINE_STAGE_ORDER;

// ── Module-level cache shared across all hook instances on the same page ─────
// Prevents duplicate fetches when PipelineVisualization and PipelineMap both
// call usePipelineData() independently.
interface PipelineCache {
  data: PipelineStageData[];
  timestamp: number;
}
let _cache: PipelineCache | null = null;
let _inflightPromise: Promise<PipelineStageData[]> | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds — short enough to reflect DOO updates

function getCached(): PipelineStageData[] | null {
  return _cache && Date.now() - _cache.timestamp < CACHE_TTL_MS ? _cache.data : null;
}
function setCache(data: PipelineStageData[]) {
  _cache = { data, timestamp: Date.now() };
}
function invalidateCache() {
  _cache = null;
}
// ─────────────────────────────────────────────────────────────────────────────

const doFetchPipelineData = async (skipSync: boolean): Promise<PipelineStageData[]> => {
  if (!skipSync) {
    await syncCustomerPipelineStages();
  }

  // Fetch customers — only the columns needed for pipeline rendering
  const { data: customers, error: fetchError } = await supabase
    .from('customers')
    .select('id, name, segment, country, stage, status, contract_size, estimated_deal_value, owner_id, logo, updated_at')
    .or('status.neq.churned,status.is.null');

  if (fetchError) throw fetchError;

  const customerIds = (customers || []).map(c => c.id);

  if (customerIds.length === 0) {
    return PIPELINE_STAGES.map(stageName => ({
      stageName, totalValue: 0, customerCount: 0, customers: [],
    }));
  }

  // Batch into 500-item chunks (5× fewer round-trips than batchSize=100)
  const batchSize = 500;
  const batches: string[][] = [];
  for (let i = 0; i < customerIds.length; i += batchSize) {
    batches.push(customerIds.slice(i, i + batchSize));
  }

  // Fetch lifecycle_stages AND contracts in PARALLEL — both use independent
  // indexes on customer_id so they don't block each other.
  const [stagesResults, contractsResults] = await Promise.all([
    Promise.all(
      batches.map(batch =>
        supabase
          .from('lifecycle_stages')
          .select('customer_id, name, status')
          .in('customer_id', batch)
      )
    ),
    Promise.all(
      batches.map(batch =>
        supabase
          .from('contracts')
          .select('customer_id, value, status')
          .in('customer_id', batch)
          .in('status', ['active', 'pending'])
      )
    ),
  ]);

  const lifecycleStages = stagesResults.flatMap(r => r.data || []);
  const contracts = contractsResults.flatMap(r => r.data || []);

  // Build O(1) lookup maps — eliminates the O(n×m) filter loop that was
  // iterating all stages for every customer (200 customers × 2000 stages
  // = 400k comparisons per load).
  const stagesByCustomer: Record<string, any[]> = {};
  lifecycleStages.forEach(stage => {
    if (!stagesByCustomer[stage.customer_id]) stagesByCustomer[stage.customer_id] = [];
    stagesByCustomer[stage.customer_id].push(stage);
  });

  const contractValuesByCustomer: Record<string, number> = {};
  contracts.forEach(contract => {
    contractValuesByCustomer[contract.customer_id] =
      (contractValuesByCustomer[contract.customer_id] || 0) + (contract.value || 0);
  });

  // Transform customers with O(1) lookups
  const transformedCustomers: CustomerData[] = (customers || []).map(customer => {
    const customerStages = stagesByCustomer[customer.id] || [];
    const pipelineStage = resolvePipelineStageFromLifecycleStages(customerStages as any[], {
      includeInProgress: true,
    });

    const contractValue = contractValuesByCustomer[customer.id];
    const displayValue = contractValue || customer.estimated_deal_value || customer.contract_size || 0;

    return {
      id: customer.id,
      name: customer.name,
      logo: customer.logo || undefined,
      segment: customer.segment || "Unknown Segment",
      country: customer.country || "Unknown Country",
      stage: pipelineStage,
      status: (customer.status as "not-started" | "in-progress" | "done" | "blocked") || "not-started",
      contractSize: displayValue,
      updated_at: customer.updated_at,
      owner: {
        id: customer.owner_id || "unknown",
        name: "Unassigned",
        role: "Unassigned",
      },
    };
  });

  // Group by stage in a single pass
  const stageGroups: Record<string, CustomerData[]> = {};
  PIPELINE_STAGES.forEach(stage => { stageGroups[stage] = []; });
  transformedCustomers.forEach(customer => {
    if (stageGroups[customer.stage]) stageGroups[customer.stage].push(customer);
  });

  return PIPELINE_STAGES.map(stageName => {
    const stageCustomers = stageGroups[stageName] || [];
    return {
      stageName,
      totalValue: stageCustomers.reduce((sum, c) => sum + c.contractSize, 0),
      customerCount: stageCustomers.length,
      customers: stageCustomers,
    };
  });
};

export const usePipelineData = () => {
  const cached = getCached();
  const [pipelineData, setPipelineData] = useState<PipelineStageData[]>(cached ?? []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchPipelineData = useCallback(async (skipSync = false) => {
    // Real-time refresh: skip if cache is still warm
    if (skipSync) {
      const cached = getCached();
      if (cached) {
        setPipelineData(cached);
        return;
      }
    }

    // Deduplicate concurrent initial loads (e.g. PipelineMap + PipelineVisualization
    // both calling usePipelineData on the same render cycle).
    if (!skipSync && _inflightPromise) {
      try {
        setIsLoading(true);
        const data = await _inflightPromise;
        setPipelineData(data);
      } catch {
        setError("Failed to load pipeline data");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    if (!skipSync) {
      _inflightPromise = doFetchPipelineData(false);
    }

    try {
      const data = skipSync
        ? await doFetchPipelineData(true)
        : await _inflightPromise!;
      setCache(data);
      setPipelineData(data);
    } catch (err) {
      console.error("Error fetching pipeline data:", err);
      setError("Failed to load pipeline data");
    } finally {
      if (!skipSync) _inflightPromise = null;
      setIsLoading(false);
    }
  }, []);

  // Debounced real-time refresh — invalidates cache so fresh data is fetched
  const debouncedFetch = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      invalidateCache();
      fetchPipelineData(true);
    }, 2000);
  }, [fetchPipelineData]);

  useEffect(() => {
    fetchPipelineData();
  }, [fetchPipelineData]);

  // Real-time subscription for live updates across users
  useEffect(() => {
    const channel = supabase
      .channel('pipeline-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lifecycle_stages' }, debouncedFetch)
      .subscribe();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase.removeChannel(channel);
    };
  }, [debouncedFetch]);

  return { pipelineData, isLoading, error, refetch: fetchPipelineData };
};
