import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Target, ExternalLink } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  status: string | null;
}

interface ConversionRateDetailProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const ConversionRateDetail = ({ countries, dateFrom, dateTo }: ConversionRateDetailProps) => {
  const [liveCustomers, setLiveCustomers] = useState<Customer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversionData = async () => {
      try {
        let query = supabase
          .from('customers')
          .select('id, name, status, country, created_at');
        
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

        const total = customers?.length || 0;
        const live = customers?.filter(c => c.status === 'done' || c.status === null) || [];
        const rate = total > 0 ? (live.length / total) * 100 : 0;

        setLiveCustomers(live);
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Conversion Rate: {conversionRate.toFixed(1)}%
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{liveCustomers.length} live customers / {totalCustomers} total customers</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Live Customers ({liveCustomers.length})</h3>
        {liveCustomers.map(customer => (
          <Card 
            key={customer.id}
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate(`/customers/${customer.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium flex-1">{customer.name}</p>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
