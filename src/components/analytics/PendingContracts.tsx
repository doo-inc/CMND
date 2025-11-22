import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ContractCard } from "@/components/contracts/ContractCard";
import { FileText } from "lucide-react";
import { buildFilteredUrl } from "@/utils/filterUtils";

interface PendingContract {
  id: string;
  name: string;
  value: number;
  start_date?: string;
  end_date?: string;
  status: string;
  customer_name: string;
  customer_id: string;
  created_at: string;
}

export function PendingContracts({ isRefreshing, countries, dateFrom, dateTo }: { isRefreshing?: boolean; countries?: string[]; dateFrom?: Date; dateTo?: Date }) {
  const [contracts, setContracts] = useState<PendingContract[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingContracts();
  }, [isRefreshing, countries, dateFrom, dateTo]);

  const fetchPendingContracts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('contracts')
        .select(`
          id,
          name,
          value,
          start_date,
          end_date,
          status,
          created_at,
          customers!inner(
            id,
            name,
            country
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(7);

      if (countries && countries.length > 0) {
        query = query.in('customers.country', countries);
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedContracts = (data || []).map(contract => ({
        id: contract.id,
        name: contract.name,
        value: contract.value || 0,
        start_date: contract.start_date,
        end_date: contract.end_date,
        status: contract.status || 'pending',
        customer_name: (contract.customers as any)?.name || 'Unknown',
        customer_id: (contract.customers as any)?.id || '',
        created_at: contract.created_at
      }));

      setContracts(formattedContracts);
    } catch (error) {
      console.error("Error fetching pending contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-[500px] flex flex-col overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Pending Contracts</CardTitle>
            <CardDescription className="text-xs">Awaiting signature or activation</CardDescription>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate(buildFilteredUrl('/contracts', countries, dateFrom, dateTo))}
        >
          View All →
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-6 overflow-hidden">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No pending contracts</p>
          </div>
        ) : (
          <ScrollArea className="h-full pr-4">
            <div className="space-y-3">
              {contracts.map(contract => (
                <ContractCard key={contract.id} contract={contract} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
