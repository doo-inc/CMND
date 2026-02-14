import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { TrendingUp, ExternalLink, Info } from "lucide-react";

interface MRRCustomer {
  id: string;
  name: string;
  monthly_revenue: number;
  contract_count: number;
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
        const today = new Date();

        // Match dashboard logic exactly:
        // Contracts with status active/pending/null, from non-churned customers,
        // with end_date in the future
        // MRR = sum(annual_rate) / 12
        let query = supabase
          .from('contracts')
          .select(`
            annual_rate,
            customer_id,
            status,
            end_date,
            created_at,
            customers!inner(id, name, status, country)
          `)
          .or('status.eq.active,status.eq.pending,status.is.null')
          .gt('end_date', today.toISOString());
        
        if (countries && countries.length > 0) {
          query = query.in('customers.country', countries);
        }
        
        if (dateFrom) {
          query = query.gte('created_at', dateFrom.toISOString());
        }
        
        if (dateTo) {
          query = query.lte('created_at', dateTo.toISOString());
        }
        
        const { data, error } = await query;

        if (error) throw error;

        const customerMap = new Map<string, MRRCustomer>();
        let total = 0;

        (data || []).forEach(contract => {
          const customer = contract.customers as any;
          
          // Exclude churned customers — matches dashboard
          if (customer.status === 'churned') return;

          const annualRate = contract.annual_rate || 0;
          if (annualRate <= 0) return;

          const monthlyAmount = annualRate / 12;

          if (!customerMap.has(customer.id)) {
            customerMap.set(customer.id, {
              id: customer.id,
              name: customer.name,
              monthly_revenue: 0,
              contract_count: 0
            });
          }

          const existing = customerMap.get(customer.id)!;
          existing.monthly_revenue += monthlyAmount;
          existing.contract_count += 1;
          total += monthlyAmount;
        });

        const mrrCustomers = Array.from(customerMap.values());
        mrrCustomers.sort((a, b) => b.monthly_revenue - a.monthly_revenue);

        setCustomers(mrrCustomers);
        setTotalMRR(Math.round(total));
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
      {/* Calculation Explanation */}
      <div className="flex items-start gap-3 bg-muted/50 border border-border rounded-lg p-4">
        <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">How it's calculated:</span>{" "}
          Sum of (annual_rate / 12) from active/pending contracts where end_date is in the future, from non-churned customers.
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Recurring Revenue: {formatCurrency(totalMRR)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{customers.length} customers contributing • {customers.reduce((s, c) => s + c.contract_count, 0)} contracts</p>
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
                <div className="flex-1">
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.contract_count} contract{customer.contract_count !== 1 ? 's' : ''}</p>
                </div>
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
