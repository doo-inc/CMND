import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { TrendingUp, ExternalLink } from "lucide-react";

interface PipelineCustomer {
  id: string;
  name: string;
  estimated_deal_value: number;
}

interface DealsPipelineDetailProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const DealsPipelineDetail = ({ countries, dateFrom, dateTo }: DealsPipelineDetailProps) => {
  const [customers, setCustomers] = useState<PipelineCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPipelineCustomers = async () => {
      try {
        let query = supabase
          .from('customers')
          .select('id, name, estimated_deal_value, country, created_at')
          .or('status.is.null,status.neq.churned.and.status.neq.done');
        
        if (countries && countries.length > 0) {
          query = query.in('country', countries);
        }
        
        if (dateFrom) {
          query = query.gte('created_at', dateFrom.toISOString());
        }
        
        if (dateTo) {
          query = query.lte('created_at', dateTo.toISOString());
        }
        
        const { data, error } = await query.order('estimated_deal_value', { ascending: false });

        if (error) throw error;

        const formattedCustomers = (data || []).map(customer => ({
          id: customer.id,
          name: customer.name,
          estimated_deal_value: customer.estimated_deal_value || 0
        }));

        const total = formattedCustomers.reduce((sum, c) => sum + c.estimated_deal_value, 0);

        setCustomers(formattedCustomers);
        setTotalValue(total);
      } catch (error) {
        console.error("Error fetching pipeline customers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPipelineCustomers();
  }, [countries, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        {Array(8).fill(0).map((_, i) => (
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
            <TrendingUp className="h-5 w-5" />
            Total Pipeline Value: {formatCurrency(totalValue)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{customers.length} deals in pipeline</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {customers.map(customer => (
          <Card 
            key={customer.id}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate(`/customers/${customer.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium flex-1">{customer.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold">{formatCurrency(customer.estimated_deal_value)}</p>
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
