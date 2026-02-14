import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { TrendingUp, ExternalLink, Info } from "lucide-react";

interface PipelineCustomer {
  id: string;
  name: string;
  estimated_deal_value: number;
  stage: string | null;
  segment: string | null;
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
        // Match dashboard logic exactly:
        // Pipeline = customers NOT churned, NOT lost stage, NOT live (no active contracts)
        // Value = estimated_deal_value || contract_size

        // Step 1: Get all customers
        let customersQuery = supabase
          .from('customers')
          .select('id, name, estimated_deal_value, contract_size, stage, status, segment, country, created_at');

        if (countries && countries.length > 0) {
          customersQuery = customersQuery.in('country', countries);
        }
        if (dateFrom) {
          customersQuery = customersQuery.gte('created_at', dateFrom.toISOString());
        }
        if (dateTo) {
          customersQuery = customersQuery.lte('created_at', dateTo.toISOString());
        }

        // Step 2: Get active contracts to identify live customer IDs
        let contractsQuery = supabase
          .from('contracts')
          .select('customer_id')
          .eq('status', 'active');

        const [customersResult, contractsResult] = await Promise.all([
          customersQuery,
          contractsQuery
        ]);

        if (customersResult.error) throw customersResult.error;
        if (contractsResult.error) throw contractsResult.error;

        // Build set of live customer IDs (those with active contracts)
        const liveCustomerIds = new Set(
          (contractsResult.data || []).map(c => c.customer_id).filter(Boolean)
        );

        const isLostStage = (stage?: string | null) => stage?.toLowerCase() === 'lost';

        // Filter: not churned, not lost, not live — matches dashboard
        const pipelineCustomers = (customersResult.data || [])
          .filter(c =>
            c.status !== 'churned' &&
            !isLostStage(c.stage) &&
            !liveCustomerIds.has(c.id)
          )
          .map(c => ({
            id: c.id,
            name: c.name,
            estimated_deal_value: c.estimated_deal_value || c.contract_size || 0,
            stage: c.stage,
            segment: c.segment
          }));

        // Sort by value descending
        pipelineCustomers.sort((a, b) => b.estimated_deal_value - a.estimated_deal_value);

        const total = pipelineCustomers.reduce((sum, c) => sum + c.estimated_deal_value, 0);

        setCustomers(pipelineCustomers);
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
      {/* Calculation Explanation */}
      <div className="flex items-start gap-3 bg-muted/50 border border-border rounded-lg p-4">
        <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">How it's calculated:</span>{" "}
          Sum of estimated deal value (or contract size) for customers who are not churned, not in "Lost" stage, and not yet live (no active contracts).
        </div>
      </div>

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
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{customer.name}</p>
                    {customer.stage && <Badge variant="outline" className="text-xs">{customer.stage}</Badge>}
                    {customer.segment && <Badge variant="secondary" className="text-xs">{customer.segment}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold">{formatCurrency(customer.estimated_deal_value)}</p>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {customers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No deals in pipeline</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
