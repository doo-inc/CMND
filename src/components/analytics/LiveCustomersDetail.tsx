import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { Building2, DollarSign, Calendar, ExternalLink } from "lucide-react";

interface LiveCustomer {
  id: string;
  name: string;
  logo: string | null;
  segment: string | null;
  country: string | null;
  go_live_date: string | null;
  contract_count: number;
  total_value: number;
  annual_rate: number;
  setup_fee: number;
}

interface LiveCustomersDetailProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const LiveCustomersDetail = ({ countries, dateFrom, dateTo }: LiveCustomersDetailProps) => {
  const [customers, setCustomers] = useState<LiveCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLiveCustomers = async () => {
      try {
        // Use the same logic as dashboard - get ARR data from contracts
        let query = supabase
          .from('contracts')
          .select(`
            annual_rate,
            setup_fee,
            value,
            customer_id,
            status,
            end_date,
            created_at,
            customers!inner(
              id,
              name,
              logo,
              segment,
              country,
              go_live_date,
              status,
              stage
            )
          `)
          .or('status.eq.active,status.eq.pending,status.is.null')
          .gt('end_date', new Date().toISOString());
        
        if (countries && countries.length > 0) {
          query = query.in('customers.country', countries);
        }
        
        if (dateFrom) {
          query = query.gte('created_at', dateFrom.toISOString());
        }
        
        if (dateTo) {
          query = query.lte('created_at', dateTo.toISOString());
        }
        
        const { data: contractsData, error } = await query;

        if (error) throw error;

        const customerARRMap = new Map();
        (contractsData || []).forEach(contract => {
          const customer = contract.customers;
          const customerId = customer.id;
          
          // Only include customers with active contracts (exclude churned)
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
              go_live_date: customer.go_live_date,
              contract_count: 0,
              total_value: 0,
              annual_rate: 0,
              setup_fee: 0
            });
          }
          
          const existingCustomer = customerARRMap.get(customerId);
          existingCustomer.contract_count += 1;
          existingCustomer.annual_rate += contract.annual_rate || 0;
          existingCustomer.setup_fee += contract.setup_fee || 0;
          existingCustomer.total_value += (contract.setup_fee > 0 || contract.annual_rate > 0) 
            ? (contract.setup_fee || 0) + (contract.annual_rate || 0)
            : (contract.value || 0);
        });

        const liveCustomers = Array.from(customerARRMap.values());
        
        // Sort by total value descending
        liveCustomers.sort((a, b) => b.total_value - a.total_value);
        
        setCustomers(liveCustomers);
      } catch (error) {
        console.error("Error fetching live customers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveCustomers();
  }, [countries, dateFrom, dateTo]);

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

  const totalRevenue = customers.reduce((sum, customer) => sum + customer.total_value, 0);
  const averageRevenue = totalRevenue / customers.length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Live Customers Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{customers.length}</p>
              <p className="text-sm text-muted-foreground">Live Customers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{formatCurrency(averageRevenue)}</p>
              <p className="text-sm text-muted-foreground">Average Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {customers.reduce((sum, customer) => sum + customer.contract_count, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Active Contracts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Grid */}
      <div className="grid gap-4">
        {customers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={customer.logo || undefined} alt={customer.name} />
                    <AvatarFallback>
                      {customer.name.split(' ').map(word => word[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{customer.name}</h3>
                      <Badge variant="outline">{customer.segment || "Unknown"}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>🌍 {customer.country || "Unknown"}</span>
                      <span>{customer.contract_count} contract{customer.contract_count !== 1 ? 's' : ''}</span>
                    </div>
                    
                    {customer.go_live_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Live since {new Date(customer.go_live_date).toLocaleDateString()}</span>
                      </div>
                    )}

                    {customer.setup_fee > 0 && customer.annual_rate > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Setup: </span>
                        <span className="font-medium">{formatCurrency(customer.setup_fee)}</span>
                        <span className="text-muted-foreground ml-4">Annual: </span>
                        <span className="font-medium">{formatCurrency(customer.annual_rate)}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right space-y-2">
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(customer.total_value)}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {customers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No live customers found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};