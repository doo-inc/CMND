import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ContractCard } from "@/components/contracts/ContractCard";
import { FileText, Loader2, Clock, DollarSign, ArrowRight, AlertCircle } from "lucide-react";
import { buildFilteredUrl } from "@/utils/filterUtils";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/customerUtils";

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
  const [totalValue, setTotalValue] = useState(0);
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
      setTotalValue(formattedContracts.reduce((sum, c) => sum + c.value, 0));
    } catch (error) {
      console.error("Error fetching pending contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-card/90 min-h-[500px] flex flex-col">
      <CardHeader className="border-b border-border/50 pb-4 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Pending Contracts</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Awaiting signature or activation</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate(buildFilteredUrl('/contracts', countries, dateFrom, dateTo))}
            className="hover:bg-primary/10"
        >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 flex flex-col gap-4">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading contracts...</p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <FileText className="h-12 w-12 mb-3 opacity-30 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">No pending contracts</p>
            <p className="text-sm text-muted-foreground">All contracts are active or completed</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-amber-500/10">
                <p className="text-lg font-bold text-amber-600">{contracts.length}</p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                <p className="text-lg font-bold text-emerald-600">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalValue)}</p>
                <p className="text-[10px] text-muted-foreground">Total Value</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-500/10">
                <p className="text-lg font-bold text-blue-600">
                  {contracts.length > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalValue / contracts.length) : '$0'}
                </p>
                <p className="text-[10px] text-muted-foreground">Avg Value</p>
              </div>
            </div>

            {/* Contracts List */}
            <ScrollArea className="flex-1">
              <div className="space-y-3 pr-2">
              {contracts.map(contract => (
                <ContractCard key={contract.id} contract={contract} />
              ))}
            </div>
          </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
