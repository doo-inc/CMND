
import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Filter, 
  Plus, 
  Search, 
  Calendar,
  FileSignature,
  FileCheck,
  FileWarning,
  MoreHorizontal,
  Download,
  Edit,
  RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { AddEditContract, ContractData } from "@/components/contracts/AddEditContract";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { contractQueryKeys, calculateContractValue, formatCurrency } from "@/utils/contractUtils";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ContractsByYearView from "@/components/contracts/ContractsByYearView";

const getStatusBadge = (status: string) => {
  switch(status) {
    case "active":
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
    case "pending":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Pending</Badge>;
    case "expired":
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Expired</Badge>;
    case "draft":
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Draft</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getContractIcon = (type: string) => {
  switch(type) {
    case "Service Agreement":
      return <FileSignature className="h-4 w-4 text-doo-purple-500" />;
    case "Implementation":
      return <FileCheck className="h-4 w-4 text-doo-purple-500" />;
    case "Support":
      return <FileWarning className="h-4 w-4 text-doo-purple-500" />;
    default:
      return <FileText className="h-4 w-4 text-doo-purple-500" />;
  }
};

const ContractsPage = () => {
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  
  const fetchContracts = async () => {
    try {
      setLoading(true);
      
      // Fetch contracts from the database
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customers (name)
        `);
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        // Map database contracts to our ContractData format
        const formattedContracts: ContractData[] = data.map(contract => ({
          id: contract.id,
          customer: contract.customers?.name || "Unknown Customer",
          customerId: contract.customer_id,
          contractNumber: contract.contract_number || "",
          status: (contract.status as "active" | "pending" | "expired" | "draft") || "draft",
          type: contract.name || "Service Agreement",
          startDate: contract.start_date ? new Date(contract.start_date).toISOString().split('T')[0] : "-",
          endDate: contract.end_date ? new Date(contract.end_date).toISOString().split('T')[0] : "-",
          value: `$${contract.value.toLocaleString()}`,
          documentUrl: undefined,
          documentName: undefined
        }));
        
        setContracts(formattedContracts);
      } else {
        // No contracts found, use empty array
        setContracts([]);
      }
    } catch (error) {
      console.error("Error fetching contracts:", error);
      toast.error("Failed to fetch contracts");
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchContracts();
  }, []);
  
  const handleAddContract = async (newContract: Partial<ContractData>) => {
    try {
      if (!newContract.customerId) {
        toast.error("Customer ID is required");
        return;
      }
      
      // Insert into database
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          customer_id: newContract.customerId,
          name: newContract.type || "Service Agreement",
          status: newContract.status || "draft",
          start_date: newContract.startDate && newContract.startDate !== "-" 
            ? new Date(newContract.startDate).toISOString() 
            : null,
          end_date: newContract.endDate && newContract.endDate !== "-" 
            ? new Date(newContract.endDate).toISOString() 
            : null,
          value: parseInt(newContract.value?.replace(/[^0-9.-]+/g, "") || "0"),
          terms: null
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        const newContractData: ContractData = {
          id: data[0].id,
          customer: newContract.customer || "Unknown Customer",
          customerId: newContract.customerId,
          status: newContract.status || "draft",
          type: newContract.type || "Service Agreement",
          startDate: newContract.startDate || "-",
          endDate: newContract.endDate || "-",
          value: newContract.value || "$0",
          documentUrl: newContract.documentUrl,
          documentName: newContract.documentName
        };
        
        setContracts(prevContracts => [...prevContracts, newContractData]);
        
        // Invalidate related queries to sync across pages
        queryClient.invalidateQueries({ queryKey: contractQueryKeys.all });
        queryClient.invalidateQueries({ queryKey: contractQueryKeys.subscription() });
        queryClient.invalidateQueries({ queryKey: ['all-customers-for-filters'] });
        
        toast.success("Contract created successfully");
      }
    } catch (error) {
      console.error("Error adding contract:", error);
      toast.error("Failed to add contract");
    }
  };
  
  const handleUpdateContract = async (contractId: string, updatedContract: Partial<ContractData>) => {
    try {
      // Update in database
      const { error } = await supabase
        .from('contracts')
        .update({
          name: updatedContract.type,
          status: updatedContract.status,
          start_date: updatedContract.startDate && updatedContract.startDate !== "-" 
            ? new Date(updatedContract.startDate).toISOString() 
            : null,
          end_date: updatedContract.endDate && updatedContract.endDate !== "-" 
            ? new Date(updatedContract.endDate).toISOString() 
            : null,
          value: parseInt(updatedContract.value?.replace(/[^0-9.-]+/g, "") || "0")
        })
        .eq('id', contractId);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      const updatedContracts = contracts.map(contract => {
        if (contract.id === contractId) {
          return { ...contract, ...updatedContract };
        }
        return contract;
      });
      
      setContracts(updatedContracts);
      
      // Invalidate related queries to sync across pages
      queryClient.invalidateQueries({ queryKey: contractQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: contractQueryKeys.subscription() });
      queryClient.invalidateQueries({ queryKey: ['all-customers-for-filters'] });
      
      toast.success("Contract updated successfully");
    } catch (error) {
      console.error("Error updating contract:", error);
      toast.error("Failed to update contract");
    }
  };
  
  const handleDownloadContract = (contract: ContractData) => {
    if (contract.documentUrl) {
      toast.success(`Downloading ${contract.documentName || 'contract'}`);
      
      const link = document.createElement('a');
      link.href = contract.documentUrl;
      link.download = contract.documentName || 'contract.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.error("No document available for this contract");
    }
  };
  
  const filteredContracts = contracts.filter(contract => {
    // Filter by search term (search in customer name and contract number)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesCustomer = contract.customer.toLowerCase().includes(searchLower);
      const matchesContractNumber = contract.contractNumber?.toLowerCase().includes(searchLower);
      if (!matchesCustomer && !matchesContractNumber) {
        return false;
      }
    }
    
    // Filter by status
    if (statusFilter && contract.status !== statusFilter) {
      return false;
    }
    
    return true;
  });
  
  const handleFilter = (status: string | null) => {
    setStatusFilter(status);
  };

  const refreshContracts = () => {
    fetchContracts();
    toast.success("Contracts refreshed");
  };

  return (
    <DashboardLayout>
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="by-year">By Year</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-bold">Contracts</h1>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Search contracts or numbers..." 
                    className="pl-8 glass-input w-[250px]" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={refreshContracts}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="glass-input">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="glass-card">
                    <DropdownMenuItem onClick={() => handleFilter(null)}>All Contracts</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleFilter('active')}>Active Contracts</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleFilter('pending')}>Pending Approval</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleFilter('expired')}>Expired</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleFilter('draft')}>Drafts</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <AddEditContract onSave={handleAddContract} />
              </div>
            </div>

            <Card className="glass-card animate-fade-in">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Contract Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-5">
                  <Card className="glass-card p-4 animate-bounce-in" style={{ animationDelay: "0.1s" }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Active Contracts</p>
                        <h3 className="text-2xl font-bold">{contracts.filter(c => c.status === 'active').length}</h3>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-doo-purple-100 flex items-center justify-center">
                        <FileCheck className="h-5 w-5 text-doo-purple-600" />
                      </div>
                    </div>
                  </Card>
                  <Card className="glass-card p-4 animate-bounce-in" style={{ animationDelay: "0.2s" }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Approval</p>
                        <h3 className="text-2xl font-bold">{contracts.filter(c => c.status === 'pending').length}</h3>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-doo-purple-100 flex items-center justify-center">
                        <FileWarning className="h-5 w-5 text-doo-purple-600" />
                      </div>
                    </div>
                  </Card>
                  <Card className="glass-card p-4 animate-bounce-in" style={{ animationDelay: "0.3s" }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Expiring Soon</p>
                        <h3 className="text-2xl font-bold">{contracts.filter(c => c.status === 'expired').length}</h3>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-doo-purple-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-doo-purple-600" />
                      </div>
                    </div>
                  </Card>
                  <Card className="glass-card p-4 animate-bounce-in" style={{ animationDelay: "0.4s" }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <h3 className="text-2xl font-bold">
                          {formatCurrency(contracts.reduce((sum, contract) => {
                            const numericValue = Number(contract.value.replace(/[^0-9.-]+/g, ""));
                            return sum + (isNaN(numericValue) ? 0 : numericValue);
                          }, 0))}
                        </h3>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-doo-purple-100 flex items-center justify-center">
                        <FileSignature className="h-5 w-5 text-doo-purple-600" />
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Contract #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array(3).fill(0).map((_, index) => (
                          <TableRow key={`loading-${index}`}>
                            <TableCell colSpan={8}>
                              <div className="h-12 bg-gray-100 animate-pulse rounded"></div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filteredContracts.length > 0 ? (
                        filteredContracts.map((contract, index) => (
                          <TableRow key={contract.id} className="animate-slide-in" style={{ animationDelay: `${index * 0.05}s` }}>
                            <TableCell className="font-mono text-sm">
                              {contract.contractNumber || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="font-medium">{contract.customer}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {getContractIcon(contract.type)}
                                <span className="ml-2">{contract.type}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(contract.status)}</TableCell>
                            <TableCell>{contract.startDate}</TableCell>
                            <TableCell>{contract.endDate}</TableCell>
                            <TableCell>{contract.value}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="glass-card">
                                    <DropdownMenuItem>
                                      <AddEditContract 
                                        contract={contract}
                                        isEditing={true}
                                        onSave={(updatedContract) => handleUpdateContract(contract.id, updatedContract)}
                                      />
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDownloadContract(contract)}
                                      disabled={!contract.documentUrl}
                                    >
                                      Download
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No contracts found. Try adjusting your filters or create a new contract.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="by-year">
          <ContractsByYearView />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default ContractsPage;
