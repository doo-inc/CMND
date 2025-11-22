import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { TrendingUp, ExternalLink } from "lucide-react";

interface ARRCustomer {
  id: string;
  name: string;
  annual_revenue: number;
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
          
          if (customer.status === 'churned') return;
          
          if (!customerARRMap.has(customerId)) {
            customerARRMap.set(customerId, {
              id: customer.id,
              name: customer.name,
              annual_revenue: 0
            });
          }
          
          const existingCustomer = customerARRMap.get(customerId)!;
          existingCustomer.annual_revenue += contract.annual_rate || 0;
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Total ARR: {formatCurrency(totalARR)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{customers.length} customers with ARR</p>
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
