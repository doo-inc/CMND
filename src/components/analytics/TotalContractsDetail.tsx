import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/customerUtils";
import { FileText, ExternalLink, Calendar, DollarSign } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    expired: 0,
    totalValue: 0
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
              country
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

        const formattedContracts = (data || []).map(contract => ({
          id: contract.id,
          name: contract.name,
          customer_id: contract.customer_id,
          customer_name: (contract.customers as any)?.name || 'Unknown Customer',
          customer_logo: (contract.customers as any)?.logo || null,
          status: contract.status,
          value: contract.value,
          setup_fee: contract.setup_fee || 0,
          annual_rate: contract.annual_rate || 0,
          start_date: contract.start_date,
          end_date: contract.end_date,
          renewal_date: contract.renewal_date,
          created_at: contract.created_at
        }));

        // Calculate stats
        const total = formattedContracts.length;
        const active = formattedContracts.filter(c => c.status === 'active').length;
        const pending = formattedContracts.filter(c => c.status === 'pending').length;
        const expired = formattedContracts.filter(c => c.status === 'expired').length;
        const totalValue = formattedContracts.reduce((sum, c) => {
          return sum + (c.setup_fee + c.annual_rate || c.value);
        }, 0);

        setStats({ total, active, pending, expired, totalValue });
        setContracts(formattedContracts);
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
    return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  };

  const getContractValue = (contract: ContractDetail) => {
    return contract.setup_fee + contract.annual_rate || contract.value;
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
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Contracts</p>
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
            <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
            <p className="text-sm text-muted-foreground">Expired</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-lg font-bold">{formatCurrency(stats.totalValue)}</p>
            <p className="text-sm text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Contracts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Contracts
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
