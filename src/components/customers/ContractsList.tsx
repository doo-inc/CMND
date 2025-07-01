
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export interface Contract {
  id?: string;
  name: string;
  value: number; // Calculated field (setup_fee + annual_rate)
  setup_fee: number;
  annual_rate: number;
  start_date: string;
  end_date: string;
  status: "active" | "pending" | "expired" | "draft";
  terms?: string;
}

interface ContractsListProps {
  contracts: Contract[];
  onContractsChange: (contracts: Contract[]) => void;
  customerName?: string;
}

export const ContractsList: React.FC<ContractsListProps> = ({
  contracts,
  onContractsChange,
  customerName = "Customer"
}) => {
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddContract = () => {
    const newContract: Contract = {
      id: `temp_${Date.now()}`, // Temporary ID for new contracts
      name: `Contract ${contracts.length + 1}`,
      value: 0,
      setup_fee: 0,
      annual_rate: 0,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "draft",
      terms: ""
    };
    setEditingContract(newContract);
    setShowAddForm(true);
  };

  const handleSaveContract = (contract: Contract) => {
    if (showAddForm) {
      // Adding new contract - assign a proper ID
      const contractToAdd = {
        ...contract,
        id: contract.id?.startsWith('temp_') ? `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : contract.id
      };
      onContractsChange([...contracts, contractToAdd]);
      setShowAddForm(false);
    } else {
      // Editing existing contract
      const updatedContracts = contracts.map(c => 
        c.id === contract.id ? contract : c
      );
      onContractsChange(updatedContracts);
    }
    setEditingContract(null);
  };

  const handleDeleteContract = (contractId: string | undefined) => {
    if (!contractId) return;
    const updatedContracts = contracts.filter(c => c.id !== contractId);
    onContractsChange(updatedContracts);
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
        <Button onClick={handleAddContract} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Contract
        </Button>
      </div>

      {/* Contracts List */}
      <div className="space-y-3">
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
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingContract(contract);
                      setShowAddForm(false);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteContract(contract.id)}
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
      </div>

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
              <Button onClick={handleAddContract} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Add First Contract
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Contract Dialog */}
      {editingContract && (
        <ContractEditDialog
          contract={editingContract}
          isOpen={!!editingContract}
          onClose={() => {
            setEditingContract(null);
            setShowAddForm(false);
          }}
          onSave={handleSaveContract}
          isNewContract={showAddForm}
        />
      )}
    </div>
  );
};

// Contract Edit Dialog Component
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
  const [formData, setFormData] = useState<Contract>({ ...contract });

  // Calculate total value whenever setup_fee or annual_rate changes
  React.useEffect(() => {
    const setupFee = Number(formData.setup_fee) || 0;
    const annualRate = Number(formData.annual_rate) || 0;
    const totalValue = setupFee + annualRate;
    setFormData(prev => ({ ...prev, value: totalValue }));
  }, [formData.setup_fee, formData.annual_rate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
    
    onSave(contractToSave);
  };

  const handleInputChange = (field: keyof Contract, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
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
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as Contract["status"])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
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
