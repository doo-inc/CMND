import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { Building2, ExternalLink, Calendar, DollarSign } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    live: 0,
    pipeline: 0,
    churned: 0,
    totalValue: 0
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

        const formattedCustomers = (data || []).map(customer => ({
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

        // Calculate stats
        const total = formattedCustomers.length;
        const live = formattedCustomers.filter(c => c.status === 'done' || c.status === null).length;
        const pipeline = formattedCustomers.filter(c => c.status && !['done', 'churned'].includes(c.status)).length;
        const churned = formattedCustomers.filter(c => c.status === 'churned').length;
        const totalValue = formattedCustomers.reduce((sum, c) => sum + (c.contract_size || 0), 0);

        setStats({ total, live, pipeline, churned, totalValue });
        setCustomers(formattedCustomers);
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [countries, dateFrom, dateTo]);

  const getStatusBadge = (status: string | null) => {
    if (!status || status === 'done') return <Badge variant="default">Live</Badge>;
    if (status === 'churned') return <Badge variant="destructive">Churned</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  const getSegmentColor = (segment: string | null) => {
    const colors: Record<string, string> = {
      'Enterprise': 'bg-purple-100 text-purple-800',
      'Mid-Market': 'bg-blue-100 text-blue-800',
      'SMB': 'bg-green-100 text-green-800',
      'Startup': 'bg-orange-100 text-orange-800'
    };
    return colors[segment || ''] || 'bg-gray-100 text-gray-800';
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
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Customers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.live}</p>
            <p className="text-sm text-muted-foreground">Live</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.pipeline}</p>
            <p className="text-sm text-muted-foreground">In Pipeline</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.churned}</p>
            <p className="text-sm text-muted-foreground">Churned</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-lg font-bold">{formatCurrency(stats.totalValue)}</p>
            <p className="text-sm text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Customers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Customers
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
                      {getStatusBadge(customer.status)}
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