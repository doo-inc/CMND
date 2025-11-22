import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { DollarSign, ExternalLink } from "lucide-react";

interface ContractDetail {
  id: string;
  name: string;
  customer_name: string;
  customer_id: string;
  value: number;
}

interface TotalRevenueDetailProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const TotalRevenueDetail = ({ countries, dateFrom, dateTo }: TotalRevenueDetailProps) => {
  const [contracts, setContracts] = useState<ContractDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        let query = supabase
          .from('contracts')
          .select(`
            id,
            name,
            value,
            setup_fee,
            annual_rate,
            created_at,
            customers!inner(id, name, country)
          `)
          .or('status.eq.active,status.eq.pending,status.is.null');
        
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

        const formattedContracts = (data || []).map(contract => {
          const contractValue = (contract.setup_fee > 0 || contract.annual_rate > 0) 
            ? (contract.setup_fee || 0) + (contract.annual_rate || 0)
            : (contract.value || 0);

          return {
            id: contract.id,
            name: contract.name,
            customer_name: (contract.customers as any).name,
            customer_id: (contract.customers as any).id,
            value: contractValue
          };
        });

        const total = formattedContracts.reduce((sum, contract) => sum + contract.value, 0);

        setContracts(formattedContracts.sort((a, b) => b.value - a.value));
        setTotalRevenue(total);
      } catch (error) {
        console.error("Error fetching revenue details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [countries, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Total Revenue: {formatCurrency(totalRevenue)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{contracts.length} contracts contributing</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {contracts.map(contract => (
          <Card 
            key={contract.id}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate(`/customers/${contract.customer_id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{contract.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{contract.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold">{formatCurrency(contract.value)}</p>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
