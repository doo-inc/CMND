import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { FileText, ExternalLink, Calendar, DollarSign, Info } from "lucide-react";

interface ContractDetail {
  id: string;
  name: string;
  customer_id: string;
  customer_name: string;
  customer_logo: string | null;
  status: string | null;
  value: number;
  setup_fee: number;
  annual_rate: number;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  created_at: string;
}

interface TotalContractsDetailProps {
  countries?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export const TotalContractsDetail = ({ countries, dateFrom, dateTo }: TotalContractsDetailProps) => {
  const [contracts, setContracts] = useState<ContractDetail[]>([]);
  const [excludedContracts, setExcludedContracts] = useState<ContractDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    noStatus: 0,
    totalValue: 0,
    excluded: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        let query = supabase
          .from('contracts')
          .select(`
            id,
            name,
            customer_id,
            status,
            value,
            setup_fee,
            annual_rate,
            start_date,
            end_date,
            renewal_date,
            created_at,
            customers!inner (
              name,
              logo,
              country,
              status
            )
          `);
        
        if (countries && countries.length > 0) {
          query = query.in('customers.country', countries);
        }
        
        if (dateFrom) {
          query = query.gte('created_at', dateFrom.toISOString());
        }
        
        if (dateTo) {
          query = query.lte('created_at', dateTo.toISOString());
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const allContracts = (data || []).map(contract => ({
          id: contract.id,
          name: contract.name,
          customer_id: contract.customer_id,
          customer_name: (contract.customers as any)?.name || 'Unknown Customer',
          customer_logo: (contract.customers as any)?.logo || null,
          customer_status: (contract.customers as any)?.status || null,
          status: contract.status,
          value: contract.value,
          setup_fee: contract.setup_fee || 0,
          annual_rate: contract.annual_rate || 0,
          start_date: contract.start_date,
          end_date: contract.end_date,
          renewal_date: contract.renewal_date,
          created_at: contract.created_at
        }));

        // Match dashboard logic exactly:
        // Include contracts with status active, pending, or null
        // Exclude contracts from churned customers
        const counted = allContracts.filter(c => {
          const contractStatus = c.status?.toLowerCase();
          const isValidStatus = contractStatus === 'active' || contractStatus === 'pending' || c.status === null;
          const isCustomerNotChurned = c.customer_status !== 'churned';
          return isValidStatus && isCustomerNotChurned;
        });

        const excluded = allContracts.filter(c => {
          const contractStatus = c.status?.toLowerCase();
          const isValidStatus = contractStatus === 'active' || contractStatus === 'pending' || c.status === null;
          const isCustomerNotChurned = c.customer_status !== 'churned';
          return !(isValidStatus && isCustomerNotChurned);
        });

        // Calculate stats from counted contracts only
        const active = counted.filter(c => c.status?.toLowerCase() === 'active').length;
        const pending = counted.filter(c => c.status?.toLowerCase() === 'pending').length;
        const noStatus = counted.filter(c => c.status === null).length;
        const totalValue = counted.reduce((sum, c) => {
          const contractValue = (c.setup_fee > 0 || c.annual_rate > 0)
            ? c.setup_fee + c.annual_rate
            : (c.value || 0);
          return sum + contractValue;
        }, 0);

        setStats({ total: counted.length, active, pending, noStatus, totalValue, excluded: excluded.length });
        setContracts(counted);
        setExcludedContracts(excluded);
      } catch (error) {
        console.error("Error fetching contracts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [countries, dateFrom, dateTo]);

  const getStatusBadge = (status: string | null) => {
    if (status === 'active') return <Badge variant="default">Active</Badge>;
    if (status === 'pending') return <Badge className="bg-yellow-500">Pending</Badge>;
    if (status === 'expired') return <Badge variant="destructive">Expired</Badge>;
    return <Badge variant="secondary">{status || 'No Status'}</Badge>;
  };

  const getContractValue = (contract: ContractDetail) => {
    return (contract.setup_fee > 0 || contract.annual_rate > 0)
      ? contract.setup_fee + contract.annual_rate
      : (contract.value || 0);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        {Array(10).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
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
          Count of contracts with status "active", "pending", or unset — excluding contracts from churned customers.
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-2 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Contracts</p>
            <p className="text-xs text-muted-foreground mt-1">(matches dashboard)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{stats.noStatus}</p>
            <p className="text-sm text-muted-foreground">No Status</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-lg font-bold">{formatCurrency(stats.totalValue)}</p>
            <p className="text-sm text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
      </div>

      {stats.excluded > 0 && (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
          {stats.excluded} contract{stats.excluded !== 1 ? 's' : ''} excluded (expired/cancelled status or from churned customers)
        </div>
      )}

      {/* Contracts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Counted Contracts ({contracts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={contract.customer_logo || undefined} alt={contract.customer_name} />
                    <AvatarFallback>
                      {contract.customer_name.split(' ').map(word => word[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{contract.name}</h3>
                      {getStatusBadge(contract.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>🏢 {contract.customer_name}</span>
                      {contract.start_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Start: {new Date(contract.start_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {contract.end_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>End: {new Date(contract.end_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="font-bold text-primary">
                        {formatCurrency(getContractValue(contract))}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Contract Value</p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/customers/${contract.customer_id}`)}
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

      {contracts.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No contracts found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
