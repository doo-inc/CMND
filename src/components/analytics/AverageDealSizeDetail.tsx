import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { DollarSign, TrendingUp, Building2, Target, Info } from "lucide-react";

interface DealSizeData {
  averageDealSize: number;
  totalDeals: number;
  totalValue: number;
  median: number;
  bySegment: Record<string, { average: number; count: number; total: number }>;
  byCountry: Record<string, { average: number; count: number; total: number }>;
  sizeDistribution: { range: string; count: number; percentage: number }[];
}

interface AverageDealSizeDetailProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const AverageDealSizeDetail = ({ countries, dateFrom, dateTo }: AverageDealSizeDetailProps) => {
  const [data, setData] = useState<DealSizeData>({
    averageDealSize: 0,
    totalDeals: 0,
    totalValue: 0,
    median: 0,
    bySegment: {},
    byCountry: {},
    sizeDistribution: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDealSizeData = async () => {
      try {
        // Match dashboard logic exactly:
        // Pipeline = customers NOT churned, NOT lost stage, NOT live (no active contracts)
        // Average = pipelineValue / pipelineCount

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

        const liveCustomerIds = new Set(
          (contractsResult.data || []).map(c => c.customer_id).filter(Boolean)
        );

        const isLostStage = (stage?: string | null) => stage?.toLowerCase() === 'lost';

        // Pipeline customers: not churned, not lost, not live — matches dashboard
        const deals = (customersResult.data || []).filter(c =>
          c.status !== 'churned' &&
          !isLostStage(c.stage) &&
          !liveCustomerIds.has(c.id)
        );

        // Use estimated_deal_value || contract_size — matches dashboard
        const dealValues = deals
          .map(d => d.estimated_deal_value || d.contract_size || 0)
          .sort((a, b) => a - b);
        
        const total = dealValues.reduce((sum, value) => sum + value, 0);
        const average = deals.length > 0 ? Math.round(total / deals.length) : 0;
        const median = deals.length > 0 ? dealValues[Math.floor(dealValues.length / 2)] : 0;

        // Group by segment
        const segmentGroups = deals.reduce((acc, deal) => {
          const segment = deal.segment || 'Unknown';
          const value = deal.estimated_deal_value || deal.contract_size || 0;
          if (!acc[segment]) acc[segment] = { total: 0, count: 0, average: 0 };
          acc[segment].total += value;
          acc[segment].count++;
          acc[segment].average = acc[segment].total / acc[segment].count;
          return acc;
        }, {} as Record<string, { average: number; count: number; total: number }>);

        // Group by country
        const countryGroups = deals.reduce((acc, deal) => {
          const country = deal.country || 'Unknown';
          const value = deal.estimated_deal_value || deal.contract_size || 0;
          if (!acc[country]) acc[country] = { total: 0, count: 0, average: 0 };
          acc[country].total += value;
          acc[country].count++;
          acc[country].average = acc[country].total / acc[country].count;
          return acc;
        }, {} as Record<string, { average: number; count: number; total: number }>);

        // Size distribution
        const ranges = [
          { range: '$0 - $10K', min: 0, max: 10000 },
          { range: '$10K - $50K', min: 10000, max: 50000 },
          { range: '$50K - $100K', min: 50000, max: 100000 },
          { range: '$100K - $500K', min: 100000, max: 500000 },
          { range: '$500K+', min: 500000, max: Infinity }
        ];

        const distribution = ranges.map(({ range, min, max }) => {
          const count = dealValues.filter(value => value >= min && value < max).length;
          return {
            range,
            count,
            percentage: deals.length > 0 ? (count / deals.length) * 100 : 0
          };
        });

        setData({
          averageDealSize: average,
          totalDeals: deals.length,
          totalValue: total,
          median,
          bySegment: segmentGroups,
          byCountry: countryGroups,
          sizeDistribution: distribution
        });
      } catch (error) {
        console.error("Error fetching deal size data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDealSizeData();
  }, [countries, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        {Array(6).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
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
          Total pipeline value divided by number of pipeline customers. Pipeline = customers who are not churned, not in "Lost" stage, and not yet live (no active contracts).
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-primary/20">
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-primary">{formatCurrency(data.averageDealSize)}</p>
            <p className="text-sm text-muted-foreground">Average Deal Size</p>
            <p className="text-xs text-muted-foreground mt-1">(matches dashboard)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{formatCurrency(data.median)}</p>
            <p className="text-sm text-muted-foreground">Median Deal Size</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{data.totalDeals}</p>
            <p className="text-sm text-muted-foreground">Total Pipeline Deals</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{formatCurrency(data.totalValue)}</p>
            <p className="text-sm text-muted-foreground">Total Pipeline Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Deal Size Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Size Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.sizeDistribution.map((range) => (
              <div key={range.range} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{range.range}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{range.count} deals</Badge>
                    <span className="text-sm font-bold">{range.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${range.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Average Deal Size by Segment */}
      <Card>
        <CardHeader>
          <CardTitle>Average Deal Size by Segment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data.bySegment)
              .sort(([,a], [,b]) => b.average - a.average)
              .map(([segment, stats]) => (
                <div key={segment} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{segment}</span>
                      <Badge variant="outline">{stats.count} deals</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total value: {formatCurrency(stats.total)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{formatCurrency(stats.average)}</p>
                    <p className="text-sm text-muted-foreground">Average</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Average Deal Size by Country */}
      <Card>
        <CardHeader>
          <CardTitle>Average Deal Size by Country</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data.byCountry)
              .filter(([,stats]) => stats.count >= 2)
              .sort(([,a], [,b]) => b.average - a.average)
              .slice(0, 10)
              .map(([country, stats]) => (
                <div key={country} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">🌍 {country}</span>
                      <Badge variant="outline">{stats.count} deals</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total value: {formatCurrency(stats.total)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{formatCurrency(stats.average)}</p>
                    <p className="text-sm text-muted-foreground">Average</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {data.totalDeals === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No pipeline deals found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
