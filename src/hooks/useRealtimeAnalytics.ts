
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { syncCustomerPipelineStages } from "@/utils/pipelineSync";

export const useRealtimeAnalytics = (onUpdate?: () => void) => {
  useEffect(() => {
    const channel = supabase
      .channel('analytics-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lifecycle_stages'
        },
        async (payload) => {
          console.log('Lifecycle stage changed:', payload);
          // Sync pipeline stages when lifecycle stages change
          await syncCustomerPipelineStages();
          // Trigger callback to refresh dashboard
          if (onUpdate) {
            onUpdate();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers'
        },
        (payload) => {
          console.log('Customer changed:', payload);
          // Trigger callback to refresh dashboard
          if (onUpdate) {
            onUpdate();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
};
