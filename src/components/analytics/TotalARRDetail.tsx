import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { TrendingUp, ExternalLink, Info } from "lucide-react";

interface ARRCustomer {
  id: string;
  name: string;
  annual_revenue: number;
  contract_count: number;
}

interface TotalARRDetailProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const TotalARRDetail = ({ countries, dateFrom, dateTo }: TotalARRDetailProps) => {
  const [customers, setCustomers] = useState<ARRCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalARR, setTotalARR] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchARRDetails = async () => {
      try {
        // Match dashboard logic exactly:
        // Contracts with status active/pending/null, from non-churned customers
        // ARR = sum of annual_rate
        let query = supabase
          .from('contracts')
          .select(`
            annual_rate,
            customer_id,
            created_at,
            customers!inner(id, name, status, country)
          `)
          .or('status.eq.active,status.eq.pending,status.is.null');
        
        if (countries && countries.length > 0) {
          query = query.in('customers.country', countries);
        }
        
        if (dateFrom) {
          query = query.gte('created_at', dateFrom.toISOString());
        }
        
        if (dateTo) {
          query = query.lte('created_at', dateTo.toISOString());
        }
        
        const { data: contractsData, error: contractsError } = await query;

        if (contractsError) throw contractsError;

        const customerARRMap = new Map<string, ARRCustomer>();
        (contractsData || []).forEach(contract => {
          const customer = contract.customers as any;
          const customerId = customer.id;
          
          // Exclude churned customers — matches dashboard
          if (customer.status === 'churned') return;
          
          if (!customerARRMap.has(customerId)) {
            customerARRMap.set(customerId, {
              id: customer.id,
              name: customer.name,
              annual_revenue: 0,
              contract_count: 0
            });
          }
          
          const existingCustomer = customerARRMap.get(customerId)!;
          existingCustomer.annual_revenue += contract.annual_rate || 0;
          existingCustomer.contract_count += 1;
        });

        const arrCustomers = Array.from(customerARRMap.values()).filter(customer => customer.annual_revenue > 0);
        const total = arrCustomers.reduce((sum, customer) => sum + customer.annual_revenue, 0);

        arrCustomers.sort((a, b) => b.annual_revenue - a.annual_revenue);

        setCustomers(arrCustomers);
        setTotalARR(total);
      } catch (error) {
        console.error("Error fetching ARR details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchARRDetails();
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
          Sum of annual_rate from all contracts with status "active", "pending", or unset — excluding churned customers.
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Total ARR: {formatCurrency(totalARR)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{customers.length} customers with ARR • {customers.reduce((s, c) => s + c.contract_count, 0)} contracts</p>
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
                  <p className="text-lg font-bold">{formatCurrency(customer.annual_revenue)}/year</p>
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
