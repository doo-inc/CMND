import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { Building2, ExternalLink, Calendar, DollarSign, Info } from "lucide-react";

interface CustomerDetail {
  id: string;
  name: string;
  logo: string | null;
  segment: string | null;
  country: string | null;
  stage: string | null;
  status: string | null;
  contract_size: number | null;
  created_at: string;
  contact_email: string | null;
  owner_id: string | null;
}

interface TotalCustomersDetailProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const TotalCustomersDetail = ({ countries, dateFrom, dateTo }: TotalCustomersDetailProps) => {
  const [customers, setCustomers] = useState<CustomerDetail[]>([]);
  const [excludedCustomers, setExcludedCustomers] = useState<CustomerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    byStage: {} as Record<string, number>,
    totalValue: 0,
    excluded: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        let query = supabase
          .from('customers')
          .select('*');
        
        if (countries && countries.length > 0) {
          query = query.in('country', countries);
        }
        
        if (dateFrom) {
          query = query.gte('created_at', dateFrom.toISOString());
        }
        
        if (dateTo) {
          query = query.lte('created_at', dateTo.toISOString());
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const allCustomers = (data || []).map(customer => ({
          id: customer.id,
          name: customer.name,
          logo: customer.logo,
          segment: customer.segment,
          country: customer.country,
          stage: customer.stage,
          status: customer.status,
          contract_size: customer.contract_size,
          created_at: customer.created_at,
          contact_email: customer.contact_email,
          owner_id: customer.owner_id
        }));

        // Match dashboard logic exactly: exclude churned AND lost stage
        const isLostStage = (stage?: string | null) => stage?.toLowerCase() === 'lost';
        
        const counted = allCustomers.filter(c => 
          c.status !== 'churned' && !isLostStage(c.stage)
        );
        const excluded = allCustomers.filter(c => 
          c.status === 'churned' || isLostStage(c.stage)
        );

        // Group counted customers by stage
        const byStage: Record<string, number> = {};
        counted.forEach(c => {
          const stage = c.stage || 'No Stage';
          byStage[stage] = (byStage[stage] || 0) + 1;
        });

        const totalValue = counted.reduce((sum, c) => sum + (c.contract_size || 0), 0);

        setStats({ total: counted.length, byStage, totalValue, excluded: excluded.length });
        setCustomers(counted);
        setExcludedCustomers(excluded);
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [countries, dateFrom, dateTo]);

  const getStatusBadge = (status: string | null, stage: string | null) => {
    if (status === 'churned') return <Badge variant="destructive">Churned</Badge>;
    if (stage?.toLowerCase() === 'lost') return <Badge variant="destructive">Lost</Badge>;
    if (stage?.toLowerCase() === 'live') return <Badge variant="default">Live</Badge>;
    return <Badge variant="secondary">{stage || status || 'Unknown'}</Badge>;
  };

  const getSegmentColor = (segment: string | null) => {
    const colors: Record<string, string> = {
      'Enterprise': 'bg-purple-100 text-purple-800',
      'Mid-Market': 'bg-blue-100 text-blue-800',
      'SMB': 'bg-green-100 text-green-800',
      'Startup': 'bg-orange-100 text-orange-800'
    };
    return colors[segment || ''] || 'bg-muted text-foreground';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        {Array(10).fill(0).map((_, i) => (
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
          Count of all customers excluding those with status "churned" or stage "Lost".
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Customers</p>
            <p className="text-xs text-muted-foreground mt-1">(matches dashboard)</p>
          </CardContent>
        </Card>
        
        {Object.entries(stats.byStage)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 2)
          .map(([stage, count]) => (
            <Card key={stage}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm text-muted-foreground">{stage}</p>
              </CardContent>
            </Card>
          ))}
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-lg font-bold">{formatCurrency(stats.totalValue)}</p>
            <p className="text-sm text-muted-foreground">Total Contract Value</p>
          </CardContent>
        </Card>
      </div>

      {stats.excluded > 0 && (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
          {stats.excluded} customer{stats.excluded !== 1 ? 's' : ''} excluded (churned or lost)
        </div>
      )}

      {/* Customers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Counted Customers ({customers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={customer.logo || undefined} alt={customer.name} />
                    <AvatarFallback>
                      {customer.name.split(' ').map(word => word[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{customer.name}</h3>
                      {getStatusBadge(customer.status, customer.stage)}
                      {customer.segment && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSegmentColor(customer.segment)}`}>
                          {customer.segment}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>🌍 {customer.country || "Unknown"}</span>
                      {customer.stage && <span>📍 {customer.stage}</span>}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Added {new Date(customer.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {customer.contact_email && (
                      <div className="text-sm text-muted-foreground">
                        📧 {customer.contact_email}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {customer.contract_size && customer.contract_size > 0 && (
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="font-bold text-primary">
                          {formatCurrency(customer.contract_size)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Contract Value</p>
                    </div>
                  )}
                  
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

      {/* Excluded Customers */}
      {excludedCustomers.length > 0 && (
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-5 w-5" />
              Excluded Customers ({excludedCustomers.length})
              <Badge variant="outline" className="ml-2">Not counted</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {excludedCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={customer.logo || undefined} alt={customer.name} />
                      <AvatarFallback>
                        {customer.name.split(' ').map(word => word[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-sm">{customer.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {customer.status === 'churned' ? 'Churned' : `Stage: ${customer.stage}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {customers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No customers found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
