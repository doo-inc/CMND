import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Target, ExternalLink, Info } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  status: string | null;
  stage: string | null;
  isLive: boolean;
}

interface ConversionRateDetailProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const ConversionRateDetail = ({ countries, dateFrom, dateTo }: ConversionRateDetailProps) => {
  const [liveCustomers, setLiveCustomers] = useState<Customer[]>([]);
  const [pipelineCustomers, setPipelineCustomers] = useState<Customer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversionData = async () => {
      try {
        // Match dashboard logic exactly:
        // totalCustomers = customers NOT churned AND NOT lost stage
        // liveCustomers = unique customers with at least one active contract (not churned)
        // conversionRate = liveCustomers / totalCustomers * 100

        // Step 1: Get all customers
        let customersQuery = supabase
          .from('customers')
          .select('id, name, status, stage, country, created_at');
        
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

        const liveCustomerIds = new Set(
          (contractsResult.data || []).map(c => c.customer_id).filter(Boolean)
        );

        const isLostStage = (stage?: string | null) => stage?.toLowerCase() === 'lost';

        // Total customers: not churned, not lost — matches dashboard
        const activeCustomers = (customersResult.data || []).filter(c =>
          c.status !== 'churned' && !isLostStage(c.stage)
        );

        const total = activeCustomers.length;

        // Live customers: those in activeCustomers that have active contracts
        const live = activeCustomers
          .filter(c => liveCustomerIds.has(c.id))
          .map(c => ({ ...c, isLive: true }));

        // Pipeline customers: not live
        const pipeline = activeCustomers
          .filter(c => !liveCustomerIds.has(c.id))
          .map(c => ({ ...c, isLive: false }));

        const rate = total > 0 ? (live.length / total) * 100 : 0;

        setLiveCustomers(live);
        setPipelineCustomers(pipeline);
        setTotalCustomers(total);
        setConversionRate(rate);
      } catch (error) {
        console.error("Error fetching conversion data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversionData();
  }, [countries, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        {Array(6).fill(0).map((_, i) => (
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
          Live customers (those with active contracts) divided by total customers (excluding churned and "Lost" stage). Formula: {liveCustomers.length} / {totalCustomers} = {conversionRate.toFixed(1)}%
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Conversion Rate: {conversionRate.toFixed(1)}%
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{liveCustomers.length}</p>
              <p className="text-sm text-muted-foreground">Live Customers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{pipelineCustomers.length}</p>
              <p className="text-sm text-muted-foreground">Pipeline Customers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{totalCustomers}</p>
              <p className="text-sm text-muted-foreground">Total Customers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Live Customers ({liveCustomers.length}) — counted as converted</h3>
        {liveCustomers.map(customer => (
          <Card 
            key={customer.id}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate(`/customers/${customer.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-medium flex-1">{customer.name}</p>
                  <Badge variant="default">Live</Badge>
                  {customer.stage && <Badge variant="outline" className="text-xs">{customer.stage}</Badge>}
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Pipeline Customers ({pipelineCustomers.length}) — not yet converted</h3>
        {pipelineCustomers.map(customer => (
          <Card 
            key={customer.id}
            className="cursor-pointer hover:bg-accent/50 transition-colors opacity-70"
            onClick={() => navigate(`/customers/${customer.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-medium flex-1">{customer.name}</p>
                  <Badge variant="secondary">Pipeline</Badge>
                  {customer.stage && <Badge variant="outline" className="text-xs">{customer.stage}</Badge>}
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
