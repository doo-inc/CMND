
import React, { useState } from "react";
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
  Edit
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

const contractsData = [
  {
    id: "con_1",
    customer: "Acme Corporation",
    customerId: "cust_1",
    status: "active",
    type: "Service Agreement",
    startDate: "2023-06-01",
    endDate: "2024-06-01",
    value: "$25,000",
    documentUrl: "/contract-template.pdf",
    documentName: "Acme_Service_Agreement.pdf"
  },
  {
    id: "con_2",
    customer: "TechNova Inc",
    customerId: "cust_2",
    status: "pending",
    type: "Implementation",
    startDate: "2023-07-15",
    endDate: "2023-10-15",
    value: "$15,500"
  },
  {
    id: "con_3",
    customer: "Global Solutions",
    customerId: "cust_3",
    status: "expired",
    type: "Support",
    startDate: "2022-12-01",
    endDate: "2023-12-01",
    value: "$12,000"
  },
  {
    id: "con_4",
    customer: "MegaRetail",
    customerId: "cust_4",
    status: "draft",
    type: "Service Agreement",
    startDate: "-",
    endDate: "-",
    value: "$32,000"
  },
  {
    id: "con_5",
    customer: "NextGen Startup",
    customerId: "cust_5",
    status: "active",
    type: "Implementation",
    startDate: "2023-11-15",
    endDate: "2024-02-15",
    value: "$8,500"
  }
];

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
  const [contracts, setContracts] = useState<ContractData[]>(contractsData as ContractData[]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  const handleAddContract = (newContract: Partial<ContractData>) => {
    const contractWithId: ContractData = {
      id: `con_${Date.now()}`,
      customer: newContract.customer || "",
      customerId: newContract.customerId,
      status: newContract.status || "draft",
      type: newContract.type || "Service Agreement",
      startDate: newContract.startDate || "-",
      endDate: newContract.endDate || "-",
      value: newContract.value || "$0",
      documentUrl: newContract.documentUrl,
      documentName: newContract.documentName
    };
    
    setContracts([...contracts, contractWithId]);
  };
  
  const handleUpdateContract = (contractId: string, updatedContract: Partial<ContractData>) => {
    const updatedContracts = contracts.map(contract => {
      if (contract.id === contractId) {
        return { ...contract, ...updatedContract };
      }
      return contract;
    });
    
    setContracts(updatedContracts);
  };
  
  const handleDownloadContract = (contract: ContractData) => {
    if (contract.documentUrl) {
      // In a real app, this would download the actual file
      // Here we just show a toast
      toast.success(`Downloading ${contract.documentName || 'contract'}`);
      
      // Simulate a download
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
    // Filter by search term
    if (searchTerm && !contract.customer.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Contracts</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search contracts..." 
                className="pl-8 glass-input w-[250px]" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
                      ${contracts.reduce((sum, contract) => {
                        const value = Number(contract.value.replace(/[^0-9.-]+/g, ""));
                        return sum + (isNaN(value) ? 0 : value);
                      }, 0).toLocaleString()}
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
                  {filteredContracts.map((contract, index) => (
                    <TableRow key={contract.id} className="animate-slide-in" style={{ animationDelay: `${index * 0.05}s` }}>
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => {
                              // This would open the edit dialog in a real app
                              const updatedContract = { ...contract };
                              handleUpdateContract(contract.id, updatedContract);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleDownloadContract(contract)}
                          >
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass-card">
                              <DropdownMenuItem 
                                onClick={() => {
                                  // Handle view action
                                  toast.info(`Viewing contract: ${contract.id}`);
                                }}
                              >
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <AddEditContract 
                                  contract={contract}
                                  isEditing={true}
                                  onSave={(updatedContract) => handleUpdateContract(contract.id, updatedContract)}
                                />
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDownloadContract(contract)}
                              >
                                Download
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {filteredContracts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
    </DashboardLayout>
  );
};

export default ContractsPage;
