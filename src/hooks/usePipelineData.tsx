
import { useState, useEffect } from "react";
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

// Use centralized pipeline rules and status helpers
import { PIPELINE_STAGE_ORDER, LIFECYCLE_TO_PIPELINE_MAPPING } from "@/utils/pipelineRules";
import { isCompletedLike, isInProgressLike } from "@/utils/stageStatus";

const PIPELINE_STAGES = PIPELINE_STAGE_ORDER;

// Determine the furthest pipeline stage from a list of lifecycle stage names
const getFurthestPipelineStage = (reachedStageNames: string[]): string => {
  const mapped = reachedStageNames
    .map(name => LIFECYCLE_TO_PIPELINE_MAPPING[canonicalizeStageName(name)] || LIFECYCLE_TO_PIPELINE_MAPPING[name])
    .filter(Boolean) as string[];

  if (mapped.length === 0) return "Lead";

  let furthestIdx = -1;
  for (const stage of mapped) {
    const idx = PIPELINE_STAGE_ORDER.indexOf(stage);
    if (idx > furthestIdx) furthestIdx = idx;
  }
  return furthestIdx >= 0 ? PIPELINE_STAGE_ORDER[furthestIdx] : "Lead";
};

export const usePipelineData = () => {
  const [pipelineData, setPipelineData] = useState<PipelineStageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const fetchPipelineData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Run pipeline sync to ensure database is up to date
      console.log('Running pipeline sync before fetching data...');
      await syncCustomerPipelineStages();

      // Fetch all customers with estimated deal values, excluding churned customers (include NULL status)
      const { data: customers, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .or('status.neq.churned,status.is.null');

      if (fetchError) {
        throw fetchError;
      }

      // Fetch all lifecycle stages (not just completed ones)
      const { data: lifecycleStages, error: stagesError } = await supabase
        .from('lifecycle_stages')
        .select('customer_id, name, status');

      if (stagesError) {
        throw stagesError;
      }

      console.log('Lifecycle stages fetched:', lifecycleStages);

      // Group lifecycle stages by customer ID (count completed OR in-progress as reached)
      const stagesByCustomer: Record<string, string[]> = {};
      lifecycleStages?.forEach(stage => {
        if (isCompletedLike(stage.status) || isInProgressLike(stage.status)) {
          if (!stagesByCustomer[stage.customer_id]) {
            stagesByCustomer[stage.customer_id] = [];
          }
          // Store canonical name for consistent mapping
          const canonicalName = canonicalizeStageName(stage.name);
          stagesByCustomer[stage.customer_id].push(canonicalName);
        }
      });
      
      // Debug Gulf Air specifically in usePipelineData
      const gulfAirCustomer = customers?.find(c => c.name?.toLowerCase().includes('gulf air'));
      if (gulfAirCustomer) {
        console.log('🔍 GULF AIR DEBUG IN usePipelineData:');
        console.log('  Customer ID:', gulfAirCustomer.id);
        console.log('  All lifecycle stages for Gulf Air:', 
          lifecycleStages?.filter(s => s.customer_id === gulfAirCustomer.id)
            .map(s => ({ name: s.name, status: s.status, canonical: canonicalizeStageName(s.name) }))
        );
        console.log('  Filtered stages (completed/in-progress):', stagesByCustomer[gulfAirCustomer.id]);
      }

      // Transform customers to CustomerData format with pipeline stage determination
      const transformedCustomers: CustomerData[] = (customers || []).map(customer => {
        const completedStages = stagesByCustomer[customer.id] || [];
        const pipelineStage = getFurthestPipelineStage(completedStages);
        
        console.log(`Customer ${customer.name}: stages=${completedStages.join(', ')} -> ${pipelineStage}`);
        
        return {
          id: customer.id,
          name: customer.name,
          logo: customer.logo || undefined,
          segment: customer.segment || "Unknown Segment",
          country: customer.country || "Unknown Country",
          stage: pipelineStage,
          status: (customer.status as "not-started" | "in-progress" | "done" | "blocked") || "not-started",
          contractSize: customer.estimated_deal_value || 0,
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

      console.log('Pipeline data with all customers:', {
        totalCustomers: transformedCustomers.length,
        stageDistribution: pipelineStages.map(s => `${s.stageName}: ${s.customerCount}`).join(', ')
      });

      setPipelineData(pipelineStages);
    } catch (err) {
      console.error("Error fetching pipeline data:", err);
      setError("Failed to load pipeline data");
    } finally {
      setIsLoading(false);
    }
  };

  return { pipelineData, isLoading, error, refetch: fetchPipelineData };
};
