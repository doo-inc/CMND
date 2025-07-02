import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface Contract {
  id?: string;
  name: string;
  value: number;
  setup_fee: number;
  annual_rate: number;
  start_date: string;
  end_date: string;
  status: "active" | "pending" | "expired" | "draft";
  terms?: string;
}

export interface ContractsListRef {
  getContracts: () => Contract[];
}

interface ContractsListProps {
  customerId?: string;
  customerName?: string;
  initialData?: any;
}

export const ContractsList = forwardRef<ContractsListRef, ContractsListProps>(({
  customerId,
  customerName = "Customer",
  initialData
}, ref) => {
  console.log('ContractsList: Component rendering');
  
  // CRITICAL: Completely isolated contract state - no parent communication
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  
  // Dialog state - completely isolated
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [isNewContract, setIsNewContract] = useState(false);

  // CRITICAL: Only expose contracts via ref - NO callbacks to parent
  useImperativeHandle(ref, () => ({
    getContracts: () => {
      console.log('ContractsList: getContracts called, returning:', contracts.length, 'contracts');
      return contracts;
    }
  }));

  // Load existing contracts for the customer
  useEffect(() => {
    const loadContracts = async () => {
      if (!customerId) return;
      
      console.log('ContractsList: Loading contracts for customer:', customerId);
      setLoadingContracts(true);
      try {
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('ContractsList: Error loading contracts:', error);
          return;
        }
        
        if (data) {
          const mappedContracts: Contract[] = data.map(contract => ({
            id: contract.id,
            name: contract.name,
            value: contract.value,
            setup_fee: contract.setup_fee || 0,
            annual_rate: contract.annual_rate || 0,
            start_date: contract.start_date,
            end_date: contract.end_date,
            status: contract.status as Contract["status"],
            terms: contract.terms || ""
          }));
          console.log('ContractsList: Loaded contracts:', mappedContracts.length);
          setContracts(mappedContracts);
        }
      } catch (error) {
        console.error('ContractsList: Error loading contracts:', error);
      } finally {
        setLoadingContracts(false);
      }
    };
    
    loadContracts();
  }, [customerId]);

  // Create initial contract from legacy fields if customer has them and no contracts exist
  useEffect(() => {
    const setupFee = initialData?.setup_fee || 0;
    const annualRate = initialData?.annual_rate || 0;
    
    if (!customerId && contracts.length === 0 && (setupFee || annualRate)) {
      if (setupFee > 0 || annualRate > 0) {
        console.log('ContractsList: Creating legacy contract from initial data');
        const legacyContract: Contract = {
          name: "Primary Contract",
          value: setupFee + annualRate,
          setup_fee: setupFee,
          annual_rate: annualRate,
          start_date: initialData?.go_live_date ? format(initialData.go_live_date, "yyyy-MM-dd") : new Date().toISOString().split('T')[0],
          end_date: initialData?.subscription_end_date ? format(initialData.subscription_end_date, "yyyy-MM-dd") : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "active",
          terms: ""
        };
        setContracts([legacyContract]);
      }
    }
  }, [initialData, customerId, contracts.length]);

  // CRITICAL: All contract operations work on isolated local state only
  const handleAddContract = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('ContractsList: Starting to add new contract - ISOLATED operation');
    const newContract: Contract = {
      id: `temp_${Date.now()}`,
      name: `Contract ${contracts.length + 1}`,
      value: 0,
      setup_fee: 0,
      annual_rate: 0,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "active",
      terms: ""
    };
    
    setEditingContract(newContract);
    setIsNewContract(true);
    setIsDialogOpen(true);
    
    console.log('ContractsList: Dialog opened for new contract - NO parent form affected');
  };

  const handleEditContract = (contract: Contract, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('ContractsList: Starting to edit existing contract:', contract.name, '- ISOLATED operation');
    setEditingContract(contract);
    setIsNewContract(false);
    setIsDialogOpen(true);
  };

  // CRITICAL: Only update local state - NO parent callbacks or form interference
  const handleSaveContract = (contract: Contract) => {
    console.log('ContractsList: Saving contract LOCALLY ONLY:', contract.name);
    
    const validatedContract = {
      ...contract,
      setup_fee: Number(contract.setup_fee) || 0,
      annual_rate: Number(contract.annual_rate) || 0,
      value: (Number(contract.setup_fee) || 0) + (Number(contract.annual_rate) || 0)
    };

    if (isNewContract) {
      const contractToAdd = {
        ...validatedContract,
        id: validatedContract.id?.startsWith('temp_') 
          ? `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` 
          : validatedContract.id
      };
      setContracts(prev => {
        const newContracts = [...prev, contractToAdd];
        console.log('ContractsList: Added new contract to LOCAL state only. Total contracts:', newContracts.length);
        return newContracts;
      });
    } else {
      setContracts(prev => {
        const updatedContracts = prev.map(c => 
          c.id === validatedContract.id ? validatedContract : c
        );
        console.log('ContractsList: Updated existing contract in LOCAL state only. Total contracts:', updatedContracts.length);
        return updatedContracts;
      });
    }

    handleCloseDialog();
  };

  const handleDeleteContract = (contractId: string | undefined, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!contractId) return;
    console.log('ContractsList: Deleting contract LOCALLY ONLY:', contractId);
    setContracts(prev => {
      const filteredContracts = prev.filter(c => c.id !== contractId);
      console.log('ContractsList: Deleted contract from LOCAL state only. Remaining contracts:', filteredContracts.length);
      return filteredContracts;
    });
  };

  const handleCloseDialog = () => {
    console.log('ContractsList: Closing dialog - NO parent form affected');
    setEditingContract(null);
    setIsNewContract(false);
    setIsDialogOpen(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: Contract["status"]) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "expired": return "bg-red-100 text-red-800";
      case "draft": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Calculate total lifetime value from setup fees and annual rates
  const totalValue = contracts.reduce((sum, contract) => 
    sum + (contract.setup_fee || 0) + (contract.annual_rate || 0), 0
  );
  const activeContracts = contracts.filter(c => c.status === "active").length;
  const totalSetupFees = contracts.reduce((sum, contract) => sum + (contract.setup_fee || 0), 0);
  const totalAnnualRates = contracts.reduce((sum, contract) => sum + (contract.annual_rate || 0), 0);

  return (
    <>
      <div className="space-y-6">
        {/* Enhanced Total Value Summary */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Total Lifetime Value</h4>
                  <p className="text-sm text-gray-600">
                    {contracts.length} {contracts.length === 1 ? 'Contract' : 'Contracts'} 
                    {activeContracts > 0 && ` • ${activeContracts} Active`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(totalValue)}
                </div>
                {contracts.length > 0 && (
                  <div className="text-sm text-gray-500 mt-1">
                    <div>Setup: {formatCurrency(totalSetupFees)}</div>
                    <div>Annual: {formatCurrency(totalAnnualRates)}</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Header with Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              All Contracts
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage all contracts for {customerName}
            </p>
          </div>
          <Button type="button" onClick={handleAddContract} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Contract
          </Button>
        </div>

        {/* Contracts List */}
        <div className="space-y-3">
          {loadingContracts ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {contracts.map((contract, index) => (
                <Card key={contract.id || index} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-lg">{contract.name}</h4>
                        <Badge className={getStatusColor(contract.status)}>
                          {contract.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleEditContract(contract, e)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleDeleteContract(contract.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Contract Value Breakdown */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="text-xs text-gray-600 uppercase tracking-wide">Setup Fee</div>
                            <div className="text-lg font-bold text-blue-600">
                              {formatCurrency(contract.setup_fee || 0)}
                            </div>
                            <div className="text-xs text-gray-500">One-time</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-purple-500" />
                          <div>
                            <div className="text-xs text-gray-600 uppercase tracking-wide">Annual Rate</div>
                            <div className="text-lg font-bold text-purple-600">
                              {formatCurrency(contract.annual_rate || 0)}
                            </div>
                            <div className="text-xs text-gray-500">Per year</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="text-xs text-gray-600 uppercase tracking-wide">Total Value</div>
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency((contract.setup_fee || 0) + (contract.annual_rate || 0))}
                            </div>
                            <div className="text-xs text-gray-500">Combined</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Start Date:</span>
                        <div className="font-medium flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(contract.start_date), "MMM dd, yyyy")}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">End Date:</span>
                        <div className="font-medium flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(contract.end_date), "MMM dd, yyyy")}
                        </div>
                      </div>
                    </div>

                    {contract.terms && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm">
                          <div className="text-xs text-gray-600 uppercase tracking-wide mb-2">Terms</div>
                          <div className="text-gray-800 bg-white p-3 rounded border text-sm">
                            {contract.terms}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {contracts.length === 0 && (
                <Card className="border-dashed border-2 border-gray-300">
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-4">
                        <DollarSign className="h-16 w-16 mx-auto" />
                      </div>
                      <h3 className="text-xl font-medium text-gray-900 mb-2">No contracts yet</h3>
                      <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                        Add contracts to track setup fees, annual rates and renewal dates for {customerName}. Each contract will contribute to the total lifetime value.
                      </p>
                      <Button type="button" onClick={handleAddContract} size="lg">
                        <Plus className="h-5 w-5 mr-2" />
                        Add First Contract
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Contract Dialog - Rendered outside form using Portal to prevent interference */}
      {editingContract && isDialogOpen && createPortal(
        <ContractEditDialog
          contract={editingContract}
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          onSave={handleSaveContract}
          isNewContract={isNewContract}
        />,
        document.body
      )}
    </>
  );
});

ContractsList.displayName = "ContractsList";

// Contract Edit Dialog Component - Completely isolated from form
interface ContractEditDialogProps {
  contract: Contract;
  isOpen: boolean;
  onClose: () => void;
  onSave: (contract: Contract) => void;
  isNewContract: boolean;
}

const ContractEditDialog: React.FC<ContractEditDialogProps> = ({
  contract,
  isOpen,
  onClose,
  onSave,
  isNewContract
}) => {
  console.log('ContractEditDialog: Rendering dialog for contract:', contract.name);
  
  const [formData, setFormData] = useState<Contract>({ ...contract });

  // Reset form data when contract changes
  React.useEffect(() => {
    console.log('ContractEditDialog: Resetting form data for contract:', contract.name);
    setFormData({ ...contract });
  }, [contract]);

  // Calculate total value whenever setup_fee or annual_rate changes
  React.useEffect(() => {
    const setupFee = Number(formData.setup_fee) || 0;
    const annualRate = Number(formData.annual_rate) || 0;
    const totalValue = setupFee + annualRate;
    setFormData(prev => ({ ...prev, value: totalValue }));
  }, [formData.setup_fee, formData.annual_rate]);

  // CRITICAL: Prevent any form submission events from bubbling up
  const handleSubmit = (e: React.FormEvent) => {
    console.log('ContractEditDialog: ISOLATED form submission - preventing all bubbling');
    e.preventDefault();
    e.stopPropagation();
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert('Contract name is required');
      return;
    }
    
    // Ensure numeric fields are numbers, not empty strings
    const contractToSave = {
      ...formData,
      setup_fee: Number(formData.setup_fee) || 0,
      annual_rate: Number(formData.annual_rate) || 0,
      value: (Number(formData.setup_fee) || 0) + (Number(formData.annual_rate) || 0)
    };
    
    console.log('ContractEditDialog: Saving contract with isolated state:', contractToSave.name);
    onSave(contractToSave);
  };

  const handleInputChange = (field: keyof Contract, value: any) => {
    console.log('ContractEditDialog: Input changed - ISOLATED from parent form:', field);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // CRITICAL: Prevent cancel from triggering any parent form events
  const handleCancel = (e: React.MouseEvent) => {
    console.log('ContractEditDialog: Dialog cancelled - preventing all event bubbling');
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  // CRITICAL: Prevent all events from bubbling to parent
  const handleDialogClick = (e: React.MouseEvent) => {
    console.log('ContractEditDialog: Dialog clicked - preventing event bubbling');
    e.stopPropagation();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
      onClick={handleDialogClick}
    >
      <div 
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" 
        onClick={handleDialogClick}
      >
        <h3 className="text-lg font-semibold mb-4">
          {isNewContract ? "Add New Contract" : "Edit Contract"}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Contract Name*</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Enter contract name"
              onClick={handleDialogClick}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Setup Fee ($)</label>
              <input
                type="number"
                value={formData.setup_fee || ''}
                onChange={(e) => handleInputChange('setup_fee', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                placeholder="0"
                onClick={handleDialogClick}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Annual Rate ($)</label>
              <input
                type="number"
                value={formData.annual_rate || ''}
                onChange={(e) => handleInputChange('annual_rate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                min="0"
                step="0.01"
                placeholder="0"
                onClick={handleDialogClick}
              />
            </div>
          </div>
          
          {/* Total Value Display */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <label className="block text-sm font-medium text-green-800 mb-1">Total Contract Value</label>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency((Number(formData.setup_fee) || 0) + (Number(formData.annual_rate) || 0))}
            </div>
            <div className="text-xs text-green-600 mt-1">
              Auto-calculated from setup fee + annual rate
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date*</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                onClick={handleDialogClick}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">End Date*</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                onClick={handleDialogClick}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as Contract["status"])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={handleDialogClick}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Terms (Optional)</label>
            <textarea
              value={formData.terms || ""}
              onChange={(e) => handleInputChange('terms', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter contract terms and conditions..."
              onClick={handleDialogClick}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {isNewContract ? "Add Contract" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
