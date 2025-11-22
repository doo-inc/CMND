import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { DollarSign, TrendingUp, Building2, Target } from "lucide-react";

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
        // Get pipeline customers (not live, not churned) with estimated deal values
        let query = supabase
          .from('customers')
          .select('*')
          .not('status', 'eq', 'done')
          .not('status', 'eq', 'churned')
          .gt('estimated_deal_value', 0);
        
        if (countries && countries.length > 0) {
          query = query.in('country', countries);
        }
        
        if (dateFrom) {
          query = query.gte('created_at', dateFrom.toISOString());
        }
        
        if (dateTo) {
          query = query.lte('created_at', dateTo.toISOString());
        }
        
        const { data: customers, error } = await query;

        if (error) throw error;

        const deals = customers || [];
        const dealValues = deals.map(d => d.estimated_deal_value).sort((a, b) => a - b);
        
        const total = dealValues.reduce((sum, value) => sum + value, 0);
        const average = deals.length > 0 ? total / deals.length : 0;
        const median = deals.length > 0 ? dealValues[Math.floor(dealValues.length / 2)] : 0;

        // Group by segment
        const segmentGroups = deals.reduce((acc, deal) => {
          const segment = deal.segment || 'Unknown';
          if (!acc[segment]) acc[segment] = { total: 0, count: 0, average: 0 };
          acc[segment].total += deal.estimated_deal_value;
          acc[segment].count++;
          acc[segment].average = acc[segment].total / acc[segment].count;
          return acc;
        }, {} as Record<string, { average: number; count: number; total: number }>);

        // Group by country
        const countryGroups = deals.reduce((acc, deal) => {
          const country = deal.country || 'Unknown';
          if (!acc[country]) acc[country] = { total: 0, count: 0, average: 0 };
          acc[country].total += deal.estimated_deal_value;
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
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-primary">{formatCurrency(data.averageDealSize)}</p>
            <p className="text-sm text-muted-foreground">Average Deal Size</p>
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
                <div className="w-full bg-gray-200 rounded-full h-2">
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
              .filter(([,stats]) => stats.count >= 2) // Only show countries with at least 2 deals
              .sort(([,a], [,b]) => b.average - a.average)
              .slice(0, 10) // Show top 10
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
            <p className="text-muted-foreground">No pipeline deals with estimated values found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};