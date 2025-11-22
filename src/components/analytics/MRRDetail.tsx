import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { TrendingUp, ExternalLink } from "lucide-react";

interface MRRCustomer {
  id: string;
  name: string;
  monthly_revenue: number;
}

interface MRRDetailProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const MRRDetail = ({ countries, dateFrom, dateTo }: MRRDetailProps) => {
  const [customers, setCustomers] = useState<MRRCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMRR, setTotalMRR] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMRRData = async () => {
      try {
        let query = supabase
          .from('customers')
          .select(`
            id,
            name,
            country,
            created_at,
            contracts!inner(annual_rate, status, end_date, created_at)
          `)
          .neq('status', 'churned');
        
        if (countries && countries.length > 0) {
          query = query.in('country', countries);
        }
        
        if (dateFrom) {
          query = query.gte('created_at', dateFrom.toISOString());
        }
        
        if (dateTo) {
          query = query.lte('created_at', dateTo.toISOString());
        }
        
        const { data, error } = await query;

        if (error) throw error;

        const mrrCustomers: MRRCustomer[] = [];
        let total = 0;

        (data || []).forEach(customer => {
          const activeContracts = (customer.contracts as any[]).filter(contract => 
            ['active', 'pending'].includes(contract.status) && 
            new Date(contract.end_date) > new Date()
          );

          if (activeContracts.length === 0) return;

          let customerMRR = 0;
          activeContracts.forEach(contract => {
            const annualRate = contract.annual_rate || 0;
            if (annualRate > 0) {
              customerMRR += annualRate / 12;
            }
          });

          if (customerMRR > 0) {
            mrrCustomers.push({
              id: customer.id,
              name: customer.name,
              monthly_revenue: customerMRR
            });
            total += customerMRR;
          }
        });

        mrrCustomers.sort((a, b) => b.monthly_revenue - a.monthly_revenue);

        setCustomers(mrrCustomers);
        setTotalMRR(total);
      } catch (error) {
        console.error("Error fetching MRR data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMRRData();
  }, [countries, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        {Array(8).fill(0).map((_, i) => (
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
            <TrendingUp className="h-5 w-5" />
            Monthly Recurring Revenue: {formatCurrency(totalMRR)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{customers.length} customers contributing</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
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
                  <p className="text-lg font-bold">{formatCurrency(customer.monthly_revenue)}/month</p>
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
