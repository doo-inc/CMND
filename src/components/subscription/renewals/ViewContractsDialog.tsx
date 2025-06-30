
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, DollarSign, CreditCard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ViewContractsDialogProps {
  customerId: string;
  customerName: string;
}

export const ViewContractsDialog: React.FC<ViewContractsDialogProps> = ({
  customerId,
  customerName
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['customer-contracts', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen
  });

  // Also fetch customer data for setup fee
  const { data: customer } = useQuery({
    queryKey: ['customer-setup-fee', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('setup_fee')
        .eq('id', customerId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: isOpen
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate total lifetime value
  const contractsValue = contracts.reduce((sum, contract) => sum + (contract.value || 0), 0);
  const contractSetupFees = contracts.reduce((sum, contract) => sum + (contract.setup_fee || 0), 0);
  const customerSetupFee = customer?.setup_fee || 0;
  const totalLifetimeValue = contractsValue + contractSetupFees + customerSetupFee;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          View Contracts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contracts for {customerName}</DialogTitle>
          <DialogDescription>
            View all contracts and their detailed information for this customer.
          </DialogDescription>
        </DialogHeader>
        
        {/* Total Lifetime Value Summary */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg text-green-800">Total Lifetime Value</h3>
              <p className="text-sm text-green-600">
                Combined value of all contracts and setup fees
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-800">
                {formatCurrency(totalLifetimeValue)}
              </div>
              <div className="text-sm text-green-600">
                {contracts.length} {contracts.length === 1 ? 'Contract' : 'Contracts'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Contracts Found</h3>
              <p className="text-gray-500">No contracts have been created for this customer yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract, index) => (
                <Card key={contract.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-lg mb-1">
                          {contract.name || `Contract ${index + 1}`}
                        </h4>
                        <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
                          {contract.status || 'Active'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wide">Start Date</div>
                          <div className="font-medium">{formatDate(contract.start_date)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wide">End Date</div>
                          <div className="font-medium">{formatDate(contract.end_date)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Contract Financial Details */}
                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wide">Setup Fee</div>
                          <div className="font-semibold text-blue-600">
                            {formatCurrency(contract.setup_fee || 0)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wide">Annual Rate</div>
                          <div className="font-semibold text-green-600">
                            {formatCurrency(contract.annual_rate || 0)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-purple-500" />
                        <div>
                          <div className="text-xs text-gray-600 uppercase tracking-wide">Total Value</div>
                          <div className="font-bold text-purple-600">
                            {formatCurrency((contract.setup_fee || 0) + (contract.annual_rate || 0) + (contract.value || 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {contract.renewal_date && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-orange-500" />
                          <div>
                            <div className="text-xs text-gray-600 uppercase tracking-wide">Next Renewal</div>
                            <div className="font-medium">{formatDate(contract.renewal_date)}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {contract.terms && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm">
                          <div className="text-xs text-gray-600 uppercase tracking-wide mb-2">Terms</div>
                          <div className="text-gray-800 bg-white p-3 rounded border">
                            {contract.terms}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
