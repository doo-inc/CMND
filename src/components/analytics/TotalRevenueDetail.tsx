import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { CalendarDays, Building2, DollarSign } from "lucide-react";

interface ContractDetail {
  id: string;
  name: string;
  customer_name: string;
  customer_id: string;
  value: number;
  setup_fee: number;
  annual_rate: number;
  start_date: string;
  end_date: string;
  status: string;
  payment_frequency: string;
}

export const TotalRevenueDetail = () => {
  const [contracts, setContracts] = useState<ContractDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const { data, error } = await supabase
          .from('contracts')
          .select(`
            id,
            name,
            value,
            setup_fee,
            annual_rate,
            start_date,
            end_date,
            status,
            payment_frequency,
            customers!inner(id, name)
          `)
          .or('status.eq.active,status.eq.pending,status.is.null');

        if (error) throw error;

        const formattedContracts = (data || []).map(contract => ({
          id: contract.id,
          name: contract.name,
          customer_name: (contract.customers as any).name,
          customer_id: (contract.customers as any).id,
          value: contract.value || 0,
          setup_fee: contract.setup_fee || 0,
          annual_rate: contract.annual_rate || 0,
          start_date: contract.start_date,
          end_date: contract.end_date,
          status: contract.status || 'active',
          payment_frequency: contract.payment_frequency || 'annual'
        }));

        console.log('TotalRevenueDetail: Fetched contracts:', formattedContracts.length);
        console.log('TotalRevenueDetail: Contract details:', formattedContracts.map(c => ({
          name: c.name,
          customer: c.customer_name,
          setup_fee: c.setup_fee,
          annual_rate: c.annual_rate,
          value: c.value,
          calculated: (c.setup_fee > 0 || c.annual_rate > 0) 
            ? (c.setup_fee || 0) + (c.annual_rate || 0)
            : (c.value || 0)
        })));

        const total = formattedContracts.reduce((sum, contract) => {
          // Use setup_fee + annual_rate if available, otherwise fallback to value
          const contractValue = (contract.setup_fee > 0 || contract.annual_rate > 0) 
            ? (contract.setup_fee || 0) + (contract.annual_rate || 0)
            : (contract.value || 0);
          return sum + contractValue;
        }, 0);

        console.log('TotalRevenueDetail: Calculated total:', total);
        setContracts(formattedContracts);
        setTotalRevenue(total);
      } catch (error) {
        console.error("Error fetching revenue details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Total Revenue Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{contracts.length}</p>
              <p className="text-sm text-muted-foreground">Active Contracts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue / contracts.length || 0)}</p>
              <p className="text-sm text-muted-foreground">Average Contract Value</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contracts List */}
      <div className="grid gap-4">
        {contracts.map((contract) => {
          const contractValue = (contract.setup_fee > 0 || contract.annual_rate > 0) 
            ? (contract.setup_fee || 0) + (contract.annual_rate || 0)
            : (contract.value || 0);
          
          return (
            <Card key={contract.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{contract.name}</h3>
                      <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
                        {contract.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{contract.customer_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      <span>
                        {new Date(contract.start_date).toLocaleDateString()} - {new Date(contract.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {contract.setup_fee > 0 && contract.annual_rate > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Setup: </span>
                        <span className="font-medium">{formatCurrency(contract.setup_fee)}</span>
                        <span className="text-muted-foreground ml-4">Annual: </span>
                        <span className="font-medium">{formatCurrency(contract.annual_rate)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(contractValue)}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {contract.payment_frequency} payment
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {contracts.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No active contracts found for this year</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};