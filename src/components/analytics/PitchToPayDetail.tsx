import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { Clock, User, Calendar, TrendingUp, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface PitchToPayData {
  customer_id: string;
  customer_name: string;
  segment: string;
  country: string;
  estimated_deal_value: number;
  discovery_date: string;
  payment_date: string;
  days_to_pay: number;
}

interface PitchToPayStats {
  averageDays: number;
  totalCustomers: number;
  fastestTime: number;
  slowestTime: number;
  bySegment: Record<string, { average: number; count: number; totalDays: number }>;
  timeDistribution: { range: string; count: number; percentage: number }[];
}

interface PitchToPayDetailProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const PitchToPayDetail = ({ countries, dateFrom, dateTo }: PitchToPayDetailProps) => {
  const [data, setData] = useState<PitchToPayData[]>([]);
  const [stats, setStats] = useState<PitchToPayStats>({
    averageDays: 0,
    totalCustomers: 0,
    fastestTime: 0,
    slowestTime: 0,
    bySegment: {},
    timeDistribution: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPitchToPayData = async () => {
      try {
        // Get all Discovery Call stages that are done
        const { data: discoveryStages, error: discoveryError } = await supabase
          .from('lifecycle_stages')
          .select('customer_id, status_changed_at')
          .eq('name', 'Discovery Call')
          .eq('status', 'done')
          .not('status_changed_at', 'is', null);

        // Get all Payment Processed stages that are done
        const { data: paymentStages, error: paymentError } = await supabase
          .from('lifecycle_stages')
          .select('customer_id, status_changed_at')
          .eq('name', 'Payment Processed')
          .eq('status', 'done')
          .not('status_changed_at', 'is', null);

        if (discoveryError || paymentError) {
          throw discoveryError || paymentError;
        }

        if (!discoveryStages || !paymentStages) return;

        // Get customer details
        let customersQuery = supabase
          .from('customers')
          .select('id, name, segment, country, estimated_deal_value, created_at');
        
        if (countries && countries.length > 0) {
          customersQuery = customersQuery.in('country', countries);
        }
        
        if (dateFrom) {
          customersQuery = customersQuery.gte('created_at', dateFrom.toISOString());
        }
        
        if (dateTo) {
          customersQuery = customersQuery.lte('created_at', dateTo.toISOString());
        }
        
        const { data: customers, error: customersError } = await customersQuery;

        if (customersError) throw customersError;

        // Match discovery and payment stages with customer data
        const pitchToPayData: PitchToPayData[] = [];

        discoveryStages.forEach(discovery => {
          const payment = paymentStages.find(p => p.customer_id === discovery.customer_id);
          const customer = customers?.find(c => c.id === discovery.customer_id);
          
          if (payment && customer && discovery.status_changed_at && payment.status_changed_at) {
            const discoveryDate = new Date(discovery.status_changed_at);
            const paymentDate = new Date(payment.status_changed_at);
            
            // Only include if payment came after discovery
            if (paymentDate > discoveryDate) {
              const diffTime = paymentDate.getTime() - discoveryDate.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              pitchToPayData.push({
                customer_id: customer.id,
                customer_name: customer.name,
                segment: customer.segment || 'Unknown',
                country: customer.country || 'Unknown',
                estimated_deal_value: customer.estimated_deal_value || 0,
                discovery_date: discovery.status_changed_at,
                payment_date: payment.status_changed_at,
                days_to_pay: diffDays
              });
            }
          }
        });

        // Calculate statistics
        const dayValues = pitchToPayData.map(d => d.days_to_pay);
        const average = dayValues.length > 0 ? dayValues.reduce((sum, days) => sum + days, 0) / dayValues.length : 0;
        const fastest = dayValues.length > 0 ? Math.min(...dayValues) : 0;
        const slowest = dayValues.length > 0 ? Math.max(...dayValues) : 0;

        // Group by segment
        const segmentGroups = pitchToPayData.reduce((acc, item) => {
          const segment = item.segment;
          if (!acc[segment]) acc[segment] = { count: 0, average: 0, totalDays: 0 };
          acc[segment].totalDays += item.days_to_pay;
          acc[segment].count++;
          acc[segment].average = acc[segment].totalDays / acc[segment].count;
          return acc;
        }, {} as Record<string, { average: number; count: number; totalDays: number }>);

        // Time distribution
        const ranges = [
          { range: '0-30 days', min: 0, max: 30 },
          { range: '31-60 days', min: 31, max: 60 },
          { range: '61-90 days', min: 61, max: 90 },
          { range: '91-180 days', min: 91, max: 180 },
          { range: '180+ days', min: 181, max: Infinity }
        ];

        const distribution = ranges.map(({ range, min, max }) => {
          const count = dayValues.filter(value => value >= min && value <= max).length;
          return {
            range,
            count,
            percentage: dayValues.length > 0 ? (count / dayValues.length) * 100 : 0
          };
        });

        setData(pitchToPayData.sort((a, b) => b.days_to_pay - a.days_to_pay));
        setStats({
          averageDays: Math.round(average),
          totalCustomers: pitchToPayData.length,
          fastestTime: fastest,
          slowestTime: slowest,
          bySegment: segmentGroups,
          timeDistribution: distribution
        });

      } catch (error) {
        console.error("Error fetching pitch to pay data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPitchToPayData();
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
            <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-primary">{stats.averageDays}</p>
            <p className="text-sm text-muted-foreground">Average Days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <User className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.totalCustomers}</p>
            <p className="text-sm text-muted-foreground">Total Customers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{stats.fastestTime}</p>
            <p className="text-sm text-muted-foreground">Fastest (days)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <p className="text-2xl font-bold text-red-600">{stats.slowestTime}</p>
            <p className="text-sm text-muted-foreground">Slowest (days)</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Pitch to Pay Time Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.timeDistribution.map((range) => (
              <div key={range.range} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{range.range}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{range.count} customers</Badge>
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

      {/* Average Time by Segment */}
      <Card>
        <CardHeader>
          <CardTitle>Average Pitch to Pay Time by Segment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.bySegment)
              .sort(([,a], [,b]) => a.average - b.average)
              .map(([segment, segmentStats]) => (
                <div key={segment} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="font-medium">{segment}</span>
                      <Badge variant="outline">{segmentStats.count} customers</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{Math.round(segmentStats.average)} days</p>
                    <p className="text-sm text-muted-foreground">Average</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Individual Customer Details */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Pitch to Pay Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((customer) => (
              <div key={customer.customer_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{customer.customer_name}</span>
                    <Badge variant="outline">{customer.segment}</Badge>
                    <span className="text-sm text-muted-foreground">🌍 {customer.country}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Discovery: {format(new Date(customer.discovery_date), 'MMM dd, yyyy')}</span>
                    <span>Payment: {format(new Date(customer.payment_date), 'MMM dd, yyyy')}</span>
                    <span>Value: {formatCurrency(customer.estimated_deal_value)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{customer.days_to_pay}</p>
                    <p className="text-sm text-muted-foreground">days</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/customers/${customer.customer_id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {data.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No customers found with both Discovery Call and Payment Processed stages completed</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};