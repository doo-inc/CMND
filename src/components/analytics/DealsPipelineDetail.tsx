import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { TrendingUp, Building2, ExternalLink, AlertCircle, Clock } from "lucide-react";

interface PipelineCustomer {
  id: string;
  name: string;
  logo: string | null;
  segment: string | null;
  country: string | null;
  stage: string | null;
  status: string | null;
  estimated_deal_value: number;
  created_at: string;
  owner_id: string | null;
  days_in_pipeline: number;
}

export const DealsPipelineDetail = () => {
  const [customers, setCustomers] = useState<PipelineCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalValue: 0,
    totalDeals: 0,
    averageDealSize: 0,
    averageDaysInPipeline: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPipelineCustomers = async () => {
      try {
        // Get customers that are not churned (include NULL status) and exclude 'done' status
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .or('status.neq.churned,status.is.null')
          .neq('status', 'done')
          .order('estimated_deal_value', { ascending: false });

        if (error) throw error;

        const now = new Date();
        const formattedCustomers = (data || []).map(customer => {
          const createdAt = new Date(customer.created_at);
          const daysInPipeline = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            id: customer.id,
            name: customer.name,
            logo: customer.logo,
            segment: customer.segment,
            country: customer.country,
            stage: customer.stage,
            status: customer.status,
            estimated_deal_value: customer.estimated_deal_value || 0,
            created_at: customer.created_at,
            owner_id: customer.owner_id,
            days_in_pipeline: daysInPipeline
          };
        });

        // Calculate stats
        const totalValue = formattedCustomers.reduce((sum, c) => sum + c.estimated_deal_value, 0);
        const totalDeals = formattedCustomers.length;
        const averageDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;
        const averageDaysInPipeline = totalDeals > 0 
          ? formattedCustomers.reduce((sum, c) => sum + c.days_in_pipeline, 0) / totalDeals 
          : 0;

        setStats({ totalValue, totalDeals, averageDealSize, averageDaysInPipeline });
        setCustomers(formattedCustomers);
      } catch (error) {
        console.error("Error fetching pipeline customers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPipelineCustomers();
  }, []);

  const getStatusBadge = (status: string | null) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      'not-started': { variant: 'outline', label: 'Not Started' },
      'in-progress': { variant: 'default', label: 'In Progress' },
      'blocked': { variant: 'destructive', label: 'Blocked' },
    };
    
    const config = statusConfig[status || 'not-started'];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUrgencyIndicator = (daysInPipeline: number) => {
    if (daysInPipeline > 90) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    } else if (daysInPipeline > 60) {
      return <Clock className="h-4 w-4 text-orange-500" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        {Array(8).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
            <p className="text-sm text-muted-foreground">Total Pipeline Value</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.totalDeals}</p>
            <p className="text-sm text-muted-foreground">Active Deals</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{formatCurrency(stats.averageDealSize)}</p>
            <p className="text-sm text-muted-foreground">Average Deal Size</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{Math.round(stats.averageDaysInPipeline)}</p>
            <p className="text-sm text-muted-foreground">Avg Days in Pipeline</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const stageGroups = customers.reduce((acc, customer) => {
              const stage = customer.stage || 'Unknown';
              if (!acc[stage]) {
                acc[stage] = { count: 0, value: 0, customers: [] };
              }
              acc[stage].count++;
              acc[stage].value += customer.estimated_deal_value;
              acc[stage].customers.push(customer);
              return acc;
            }, {} as Record<string, { count: number; value: number; customers: PipelineCustomer[] }>);

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(stageGroups).map(([stage, data]) => (
                  <div key={stage} className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">{stage}</h3>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-primary">{formatCurrency(data.value)}</p>
                      <p className="text-sm text-muted-foreground">{data.count} deal{data.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Deals List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Pipeline Deals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{customer.name}</h3>
                      {getStatusBadge(customer.status)}
                      {customer.segment && (
                        <Badge variant="outline">{customer.segment}</Badge>
                      )}
                      {getUrgencyIndicator(customer.days_in_pipeline)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>🌍 {customer.country || "Unknown"}</span>
                      <span>📍 {customer.stage || "Unknown Stage"}</span>
                      <span>{customer.days_in_pipeline} days in pipeline</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(customer.estimated_deal_value)}
                    </p>
                    <p className="text-sm text-muted-foreground">Estimated Value</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {customers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No active pipeline deals found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};