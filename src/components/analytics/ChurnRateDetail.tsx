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
  churn_date: string;
}

interface ChurnRateDetailProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const ChurnRateDetail = ({ countries, dateFrom, dateTo }: ChurnRateDetailProps) => {
  const [customers, setCustomers] = useState<ChurnedCustomer[]>([]);
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
        let churnedQuery = supabase
          .from('customers')
          .select('id, name, churn_date, country, created_at')
          .eq('status', 'churned')
          .not('churn_date', 'is', null)
          .gte('churn_date', thirtyDaysAgo.toISOString());
        
        if (countries && countries.length > 0) {
          allCustomersQuery = allCustomersQuery.in('country', countries);
          churnedQuery = churnedQuery.in('country', countries);
        }
        
        if (dateFrom) {
          allCustomersQuery = allCustomersQuery.gte('created_at', dateFrom.toISOString());
          churnedQuery = churnedQuery.gte('created_at', dateFrom.toISOString());
        }
        
        if (dateTo) {
          allCustomersQuery = allCustomersQuery.lte('created_at', dateTo.toISOString());
          churnedQuery = churnedQuery.lte('created_at', dateTo.toISOString());
        }

        const { data: allCustomers, error: allError } = await allCustomersQuery;
        if (allError) throw allError;

        const { data: churnedCustomers, error: churnError } = await churnedQuery.order('churn_date', { ascending: false });

        if (churnError) throw churnError;

        const total = allCustomers?.length || 0;
        const churned = churnedCustomers?.length || 0;
        const rate = total > 0 ? (churned / total) * 100 : 0;

        setCustomers(churnedCustomers || []);
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

  if (customers.length === 0) {
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
            <p className="text-muted-foreground">No customers churned in the last 30 days</p>
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
          <p className="text-muted-foreground">{customers.length} churned / {totalCustomers} total customers</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Churned Customers (Last 30 Days)</h3>
        {customers.map(customer => (
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
                    {format(new Date(customer.churn_date), 'MMM dd, yyyy')}
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
