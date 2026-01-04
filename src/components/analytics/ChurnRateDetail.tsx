import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TrendingDown, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface ChurnedCustomer {
  id: string;
  name: string;
  churn_date: string | null;
  updated_at?: string;
}

interface ChurnRateDetailProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const ChurnRateDetail = ({ countries, dateFrom, dateTo }: ChurnRateDetailProps) => {
  const [allChurnedCustomers, setAllChurnedCustomers] = useState<ChurnedCustomer[]>([]);
  const [recentChurnedCustomers, setRecentChurnedCustomers] = useState<ChurnedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [churnRate, setChurnRate] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChurnData = async () => {
      try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        let allCustomersQuery = supabase.from('customers').select('*, country, created_at');
        
        // Query for ALL churned customers (not just last 30 days)
        let allChurnedQuery = supabase
          .from('customers')
          .select('id, name, churn_date, updated_at, country, created_at')
          .eq('status', 'churned');
        
        if (countries && countries.length > 0) {
          allCustomersQuery = allCustomersQuery.in('country', countries);
          allChurnedQuery = allChurnedQuery.in('country', countries);
        }
        
        if (dateFrom) {
          allCustomersQuery = allCustomersQuery.gte('created_at', dateFrom.toISOString());
          allChurnedQuery = allChurnedQuery.gte('created_at', dateFrom.toISOString());
        }
        
        if (dateTo) {
          allCustomersQuery = allCustomersQuery.lte('created_at', dateTo.toISOString());
          allChurnedQuery = allChurnedQuery.lte('created_at', dateTo.toISOString());
        }

        const { data: allCustomers, error: allError } = await allCustomersQuery;
        if (allError) throw allError;

        const { data: churnedCustomers, error: churnError } = await allChurnedQuery.order('churn_date', { ascending: false, nullsFirst: false });

        if (churnError) throw churnError;

        // Calculate 30-day churn rate
        const recentChurned = (churnedCustomers || []).filter(c => 
          c.churn_date && new Date(c.churn_date) >= thirtyDaysAgo
        );

        const total = allCustomers?.length || 0;
        const recentChurnedCount = recentChurned.length;
        const rate = total > 0 ? (recentChurnedCount / total) * 100 : 0;

        setAllChurnedCustomers(churnedCustomers || []);
        setRecentChurnedCustomers(recentChurned);
        setChurnRate(rate);
        setTotalCustomers(total);
      } catch (error) {
        console.error("Error fetching churn data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChurnData();
  }, [countries, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const formatChurnDate = (customer: ChurnedCustomer) => {
    if (customer.churn_date) {
      return format(new Date(customer.churn_date), 'MMM dd, yyyy');
    }
    if (customer.updated_at) {
      return `~${format(new Date(customer.updated_at), 'MMM dd, yyyy')}`;
    }
    return 'Unknown date';
  };

  if (allChurnedCustomers.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Churn Rate (30 days): 0%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No customers churned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">Excellent retention! No churned customers.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Churn Rate (30 days): {churnRate.toFixed(1)}%
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {recentChurnedCustomers.length} churned in last 30 days / {totalCustomers} total customers
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Total churned customers: {allChurnedCustomers.length}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">All Churned Customers ({allChurnedCustomers.length})</h3>
        {allChurnedCustomers.map(customer => (
          <Card 
            key={customer.id}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate(`/customers/${customer.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium flex-1">{customer.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    {formatChurnDate(customer)}
                  </p>
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
