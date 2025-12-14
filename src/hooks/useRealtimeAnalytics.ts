
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useRealtimeAnalytics = (onUpdate?: () => void) => {
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Debounce updates to avoid excessive re-renders
  const debouncedUpdate = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      if (onUpdate) {
        onUpdate();
      }
    }, 2000); // Wait 2 seconds before refreshing
  }, [onUpdate]);

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
        () => {
          // Debounced update - no heavy sync on every change
          debouncedUpdate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers'
        },
        () => {
          // Debounced update
          debouncedUpdate();
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      supabase.removeChannel(channel);
    };
  }, [debouncedUpdate]);
};
