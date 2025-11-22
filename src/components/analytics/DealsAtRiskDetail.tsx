import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { AlertTriangle, Clock, ExternalLink, Calendar } from "lucide-react";

interface RiskDeal {
  id: string;
  name: string;
  logo: string | null;
  segment: string | null;
  stage: string | null;
  estimated_deal_value: number;
  created_at: string;
  days_overdue: number;
  risk_level: 'high' | 'medium' | 'low';
  blocked_stages: Array<{
    stage_name: string;
    deadline: string;
    days_overdue: number;
  }>;
}

interface DealsAtRiskDetailProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const DealsAtRiskDetail = ({ countries, dateFrom, dateTo }: DealsAtRiskDetailProps) => {
  const [deals, setDeals] = useState<RiskDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAtRisk: 0,
    totalValue: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRiskDeals = async () => {
      try {
        // Get customers with blocked lifecycle stages that are past their deadline
        let query = supabase
          .from('lifecycle_stages')
          .select(`
            customer_id,
            name,
            status_changed_at,
            customers!inner(
              id,
              name,
              logo,
              segment,
              stage,
              estimated_deal_value,
              created_at,
              status,
              country
            )
          `)
          .eq('status', 'blocked')
          .not('status_changed_at', 'is', null)
          .lt('status_changed_at', new Date().toISOString())
          .not('customers.status', 'eq', 'done')
          .not('customers.status', 'eq', 'churned');
        
        if (countries && countries.length > 0) {
          query = query.in('customers.country', countries);
        }
        
        if (dateFrom) {
          query = query.gte('customers.created_at', dateFrom.toISOString());
        }
        
        if (dateTo) {
          query = query.lte('customers.created_at', dateTo.toISOString());
        }
        
        const { data: lifecycleData, error: lifecycleError } = await query;

        if (lifecycleError) throw lifecycleError;

        const now = new Date();
        const dealMap = new Map<string, RiskDeal>();

        (lifecycleData || []).forEach(stage => {
          const customer = (stage.customers as any);
          const customerId = customer.id;
          const deadline = new Date((stage as any).status_changed_at);
          const daysOverdue = Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));

          if (!dealMap.has(customerId)) {
            dealMap.set(customerId, {
              id: customerId,
              name: customer.name,
              logo: customer.logo,
              segment: customer.segment,
              stage: customer.stage,
              estimated_deal_value: customer.estimated_deal_value || 0,
              created_at: customer.created_at,
              days_overdue: daysOverdue,
              risk_level: 'low',
              blocked_stages: []
            });
          }

          const deal = dealMap.get(customerId)!;
          deal.blocked_stages.push({
            stage_name: stage.name,
            deadline: (stage as any).status_changed_at,
            days_overdue: daysOverdue
          });

          // Update overall days overdue to the highest
          deal.days_overdue = Math.max(deal.days_overdue, daysOverdue);
        });

        // Determine risk levels
        const riskDeals = Array.from(dealMap.values()).map(deal => {
          if (deal.days_overdue > 30) {
            deal.risk_level = 'high';
          } else if (deal.days_overdue > 14) {
            deal.risk_level = 'medium';
          } else {
            deal.risk_level = 'low';
          }
          return deal;
        });

        // Sort by days overdue descending
        riskDeals.sort((a, b) => b.days_overdue - a.days_overdue);

        // Calculate stats
        const totalValue = riskDeals.reduce((sum, deal) => sum + deal.estimated_deal_value, 0);
        const highRisk = riskDeals.filter(d => d.risk_level === 'high').length;
        const mediumRisk = riskDeals.filter(d => d.risk_level === 'medium').length;
        const lowRisk = riskDeals.filter(d => d.risk_level === 'low').length;

        setDeals(riskDeals);
        setStats({
          totalAtRisk: riskDeals.length,
          totalValue,
          highRisk,
          mediumRisk,
          lowRisk
        });
      } catch (error) {
        console.error("Error fetching deals at risk:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRiskDeals();
  }, [countries, dateFrom, dateTo]);

  const getRiskBadge = (riskLevel: string, daysOverdue: number) => {
    const variants = {
      high: { variant: 'destructive' as const, label: 'High Risk' },
      medium: { variant: 'secondary' as const, label: 'Medium Risk' },
      low: { variant: 'outline' as const, label: 'Low Risk' }
    };
    
    const config = variants[riskLevel as keyof typeof variants];
    return (
      <div className="flex items-center gap-2">
        <Badge variant={config.variant}>{config.label}</Badge>
        <span className="text-sm text-muted-foreground">{daysOverdue} days overdue</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        {Array(6).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold text-red-500">{stats.totalAtRisk}</p>
            <p className="text-sm text-muted-foreground">Total Deals at Risk</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <p className="text-2xl font-bold text-red-600">{stats.highRisk}</p>
            <p className="text-sm text-muted-foreground">High Risk</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold text-orange-500">{stats.mediumRisk}</p>
            <p className="text-sm text-muted-foreground">Medium Risk</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold text-yellow-600">{stats.lowRisk}</p>
            <p className="text-sm text-muted-foreground">Low Risk</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-lg font-bold">{formatCurrency(stats.totalValue)}</p>
            <p className="text-sm text-muted-foreground">Total Value at Risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Summary */}
      {stats.totalAtRisk > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Risk Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">High Risk (30+ days)</h3>
                <p className="text-2xl font-bold text-red-600">{stats.highRisk} deals</p>
                <p className="text-sm text-red-600">Require immediate attention</p>
              </div>
              
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-2">Medium Risk (14-30 days)</h3>
                <p className="text-2xl font-bold text-orange-600">{stats.mediumRisk} deals</p>
                <p className="text-sm text-orange-600">Need monitoring</p>
              </div>
              
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2">Low Risk (1-14 days)</h3>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowRisk} deals</p>
                <p className="text-sm text-yellow-600">Recently overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deals at Risk List */}
      <Card>
        <CardHeader>
          <CardTitle>Deals Requiring Attention</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {deals.map((deal) => (
              <div key={deal.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{deal.name}</h3>
                      {deal.segment && <Badge variant="outline">{deal.segment}</Badge>}
                    </div>
                    {getRiskBadge(deal.risk_level, deal.days_overdue)}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(deal.estimated_deal_value)}
                      </p>
                      <p className="text-sm text-muted-foreground">Estimated Value</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/customers/${deal.id}`)}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Blocked Stages:</h4>
                  <div className="grid gap-2">
                    {deal.blocked_stages.map((stage, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded text-sm">
                        <span className="font-medium">{stage.stage_name}</span>
                        <div className="flex items-center gap-2 text-red-600">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {new Date(stage.deadline).toLocaleDateString()}</span>
                          <span>({stage.days_overdue} days overdue)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {deals.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="space-y-2">
              <p className="text-lg font-medium text-green-600">🎉 Great news!</p>
              <p className="text-muted-foreground">No deals are currently at risk</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};