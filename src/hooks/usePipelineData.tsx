
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CustomerData } from "@/types/customers";
import { canonicalizeStageName, createStageNameMap } from "@/utils/stageNames";
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

export const usePipelineData = () => {
  const [pipelineData, setPipelineData] = useState<PipelineStageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchPipelineData = useCallback(async (skipSync = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Only run pipeline sync on initial load or manual refresh, not on every real-time update
      if (!skipSync) {
        // console.log('Running pipeline sync before fetching data...');
        await syncCustomerPipelineStages();
      }

      // Fetch only needed columns for pipeline, excluding churned customers
      const { data: customers, error: fetchError } = await supabase
        .from('customers')
        .select('id, name, segment, country, stage, status, contract_size, estimated_deal_value, owner_id, logo, updated_at')
        .or('status.neq.churned,status.is.null');

      if (fetchError) {
        throw fetchError;
      }

      // Fetch lifecycle stages more efficiently - only for non-churned customers
      const customerIds = (customers || []).map(c => c.id);

      let lifecycleStages: any[] = [];

      // Fetch in batches if there are many customers
      if (customerIds.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < customerIds.length; i += batchSize) {
          const batch = customerIds.slice(i, i + batchSize);

          const { data: batchStages, error: stagesError } = await supabase
            .from('lifecycle_stages')
            .select('customer_id, name, status')
            .in('customer_id', batch);

          if (stagesError) {
            throw stagesError;
          }

          if (batchStages) {
            lifecycleStages = lifecycleStages.concat(batchStages);
          }
        }
      }

      // console.log(`Lifecycle stages fetched (paginated): ${lifecycleStages.length}`);

      // Transform customers to CustomerData format with pipeline stage determination
      const transformedCustomers: CustomerData[] = (customers || []).map(customer => {
        const customerStages = (lifecycleStages || []).filter(
          (stage) => stage.customer_id === customer.id
        );

        const pipelineStage = resolvePipelineStageFromLifecycleStages(customerStages as any[], {
          includeInProgress: true,
        });
        
        return {
          id: customer.id,
          name: customer.name,
          logo: customer.logo || undefined,
          segment: customer.segment || "Unknown Segment",
          country: customer.country || "Unknown Country",
          stage: pipelineStage,
          status: (customer.status as "not-started" | "in-progress" | "done" | "blocked") || "not-started",
          contractSize: customer.estimated_deal_value || customer.contract_size || 0,
          updated_at: customer.updated_at,
          owner: {
            id: customer.owner_id || "unknown",
            name: "Unassigned",
            role: "Unassigned"
          }
        };
      });

      // Group customers by pipeline stage
      const stageGroups: Record<string, CustomerData[]> = {};
      
      // Initialize all pipeline stages
      PIPELINE_STAGES.forEach(stage => {
        stageGroups[stage] = [];
      });

      // Group customers by their pipeline stage
      transformedCustomers.forEach(customer => {
        const pipelineStage = customer.stage;
        if (stageGroups[pipelineStage]) {
          stageGroups[pipelineStage].push(customer);
        }
      });

      // Create pipeline data in order
      const pipelineStages: PipelineStageData[] = PIPELINE_STAGES.map(stageName => {
        const customers = stageGroups[stageName] || [];
        const totalValue = customers.reduce((sum, customer) => sum + customer.contractSize, 0);
        
        return {
          stageName,
          totalValue,
          customerCount: customers.length,
          customers
        };
      });


      setPipelineData(pipelineStages);
    } catch (err) {
      console.error("Error fetching pipeline data:", err);
      setError("Failed to load pipeline data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced fetch for real-time updates (skip sync for performance)
  const debouncedFetch = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      fetchPipelineData(true); // Skip sync on real-time updates for better performance
    }, 2000); // Increased to 2 seconds to reduce update frequency
  }, [fetchPipelineData]);

  useEffect(() => {
    fetchPipelineData();
  }, [fetchPipelineData]);

  // Real-time subscription for live updates across users
  useEffect(() => {
    const channel = supabase
      .channel('pipeline-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers'
        },
        () => {
          console.log('🔄 Pipeline: Customer change detected');
          debouncedFetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lifecycle_stages'
        },
        () => {
          console.log('🔄 Pipeline: Lifecycle stage change detected');
          debouncedFetch();
        }
      )
      .subscribe((status) => {
        console.log('📡 Pipeline realtime subscription status:', status);
      });

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      supabase.removeChannel(channel);
    };
  }, [debouncedFetch]);

  return { pipelineData, isLoading, error, refetch: fetchPipelineData };
};
