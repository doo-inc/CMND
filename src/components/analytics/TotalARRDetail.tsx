import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { TrendingUp, Building2, DollarSign, ExternalLink } from "lucide-react";

interface ARRCustomer {
  id: string;
  name: string;
  logo: string | null;
  segment: string | null;
  country: string | null;
  annual_revenue: number;
  contract_count: number;
  percentage_of_total: number;
}

export const TotalARRDetail = () => {
  const [customers, setCustomers] = useState<ARRCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalARR, setTotalARR] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchARRDetails = async () => {
      try {
        // Use the same logic as dashboard - get ARR from contracts (annual_rate only)
        const { data: contractsData, error: contractsError } = await supabase
          .from('contracts')
          .select(`
            annual_rate,
            customer_id,
            customers!inner(
              id,
              name,
              logo,
              segment,
              country,
              owner_id,
              status,
              stage
            )
          `)
          .or('status.eq.active,status.eq.pending,status.is.null')
          .gt('end_date', new Date().toISOString());

        if (contractsError) throw contractsError;

        const customerARRMap = new Map<string, ARRCustomer>();
        (contractsData || []).forEach(contract => {
          const customer = contract.customers;
          const customerId = customer.id;
          
          // Skip churned customers
          if (customer.status === 'churned') {
            return;
          }
          
          if (!customerARRMap.has(customerId)) {
            customerARRMap.set(customerId, {
              id: customer.id,
              name: customer.name,
              logo: customer.logo,
              segment: customer.segment,
              country: customer.country,
              annual_revenue: 0,
              contract_count: 0,
              percentage_of_total: 0
            });
          }
          
          const existingCustomer = customerARRMap.get(customerId)!;
          // ARR excludes setup fees and one-time payments - only annual_rate counts
          existingCustomer.annual_revenue += contract.annual_rate || 0;
          existingCustomer.contract_count += 1;
        });

        const arrCustomers = Array.from(customerARRMap.values()).filter(customer => customer.annual_revenue > 0);
        const total = arrCustomers.reduce((sum, customer) => sum + customer.annual_revenue, 0);

        // Calculate percentages
        arrCustomers.forEach(customer => {
          customer.percentage_of_total = total > 0 ? (customer.annual_revenue / total) * 100 : 0;
        });

        // Sort by annual revenue descending
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
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        {Array(8).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const averageARR = totalARR / customers.length || 0;
  const topCustomers = customers.slice(0, 5);
  const topCustomersARR = topCustomers.reduce((sum, customer) => sum + customer.annual_revenue, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{formatCurrency(totalARR)}</p>
            <p className="text-sm text-muted-foreground">Total ARR</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{customers.length}</p>
            <p className="text-sm text-muted-foreground">Contributing Customers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{formatCurrency(averageARR)}</p>
            <p className="text-sm text-muted-foreground">Average ARR</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{formatCurrency(topCustomersARR)}</p>
            <p className="text-sm text-muted-foreground">Top 5 Customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers Highlight */}
      <Card>
        <CardHeader>
          <CardTitle>Top Revenue Contributors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCustomers.map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">#{index + 1}</Badge>
                  <span className="font-medium">{customer.name}</span>
                  <Badge variant="secondary">{customer.segment || "Unknown"}</Badge>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(customer.annual_revenue)}</p>
                  <p className="text-sm text-muted-foreground">{customer.percentage_of_total.toFixed(1)}% of total</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Customers List */}
      <Card>
        <CardHeader>
          <CardTitle>All ARR Contributors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{customer.name}</h3>
                      <Badge variant="outline">{customer.segment || "Unknown"}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>🌍 {customer.country || "Unknown"}</span>
                      <span>{customer.contract_count} contract{customer.contract_count !== 1 ? 's' : ''}</span>
                      <span>{customer.percentage_of_total.toFixed(1)}% of total ARR</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(customer.annual_revenue)}
                    </p>
                    <p className="text-sm text-muted-foreground">Annual Revenue</p>
                  </div>
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
            <p className="text-muted-foreground">No ARR data found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};