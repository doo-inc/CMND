
import React from "react";
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
  MoreHorizontal
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

const contractsData = [
  {
    id: "con_1",
    customer: "Acme Corporation",
    status: "active",
    type: "Service Agreement",
    startDate: "2023-06-01",
    endDate: "2024-06-01",
    value: "$25,000"
  },
  {
    id: "con_2",
    customer: "TechNova Inc",
    status: "pending",
    type: "Implementation",
    startDate: "2023-07-15",
    endDate: "2023-10-15",
    value: "$15,500"
  },
  {
    id: "con_3",
    customer: "Global Solutions",
    status: "expired",
    type: "Support",
    startDate: "2022-12-01",
    endDate: "2023-12-01",
    value: "$12,000"
  },
  {
    id: "con_4",
    customer: "MegaRetail",
    status: "draft",
    type: "Service Agreement",
    startDate: "-",
    endDate: "-",
    value: "$32,000"
  },
  {
    id: "con_5",
    customer: "NextGen Startup",
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
                <DropdownMenuItem>Active Contracts</DropdownMenuItem>
                <DropdownMenuItem>Pending Approval</DropdownMenuItem>
                <DropdownMenuItem>Expiring Soon</DropdownMenuItem>
                <DropdownMenuItem>Drafts</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="glass-button">
              <Plus className="h-4 w-4 mr-2" />
              New Contract
            </Button>
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
                    <h3 className="text-2xl font-bold">24</h3>
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
                    <h3 className="text-2xl font-bold">7</h3>
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
                    <h3 className="text-2xl font-bold">5</h3>
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
                    <h3 className="text-2xl font-bold">$432k</h3>
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
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractsData.map((contract, index) => (
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-card">
                            <DropdownMenuItem>View</DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Download</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
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
