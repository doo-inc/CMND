import React, { useState, useEffect } from "react";
import { BatelcoLayout } from "@/components/batelco/BatelcoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Search,
  FileSignature,
  FileCheck,
  FileWarning,
  Download,
  RefreshCw,
  DollarSign,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ContractData } from "@/components/contracts/AddEditContract";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/contractUtils";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
    case "pending":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Pending</Badge>;
    case "expired":
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Expired</Badge>;
    case "draft":
      return <Badge variant="outline" className="bg-muted text-foreground border-border">Draft</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getContractIcon = (type: string) => {
  switch (type) {
    case "Service Agreement":
      return <FileSignature className="h-4 w-4 text-red-500" />;
    case "Implementation":
      return <FileCheck className="h-4 w-4 text-red-500" />;
    case "Support":
      return <FileWarning className="h-4 w-4 text-red-500" />;
    default:
      return <FileText className="h-4 w-4 text-red-500" />;
  }
};

const BatelcoContracts = () => {
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchContracts = async () => {
    try {
      setLoading(true);

      // Step 1: Find all Batelco customer IDs (partner_label = 'batelco')
      const { data: allCustomers, error: custErr } = await supabase
        .from("customers")
        .select("id, name, partner_label");

      if (custErr) throw custErr;

      const batelcoCustomers = (allCustomers || []).filter(
        (c: any) => c.partner_label && String(c.partner_label).toLowerCase() === "batelco"
      );

      if (batelcoCustomers.length === 0) {
        setContracts([]);
        return;
      }

      const customerIds = batelcoCustomers.map((c: any) => c.id);
      const customerNameMap: Record<string, string> = {};
      batelcoCustomers.forEach((c: any) => { customerNameMap[c.id] = c.name; });

      // Step 2: Fetch all contracts for those customers
      const { data: contractsData, error: contractsErr } = await supabase
        .from("contracts")
        .select("*")
        .in("customer_id", customerIds);

      if (contractsErr) throw contractsErr;

      const formatted: ContractData[] = (contractsData || []).map((c: any) => ({
        id: c.id,
        customer: customerNameMap[c.customer_id] || "Unknown Customer",
        customerId: c.customer_id,
        contractNumber: c.contract_number || "",
        status: (c.status as "active" | "pending" | "expired" | "draft") || "draft",
        type: c.name || "Service Agreement",
        startDate: c.start_date ? new Date(c.start_date).toISOString().split("T")[0] : "-",
        endDate: c.end_date ? new Date(c.end_date).toISOString().split("T")[0] : "-",
        value: `$${(c.value || 0).toLocaleString()}`,
        setupFee: c.setup_fee ? `${c.setup_fee}` : "0",
        annualRate: c.annual_rate ? `${c.annual_rate}` : "0",
        paymentFrequency: c.payment_frequency || "annual",
      }));

      setContracts(formatted);
    } catch (error) {
      console.error("Error fetching Batelco contracts:", error);
      toast.error("Failed to fetch contracts");
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const parseValue = (v: string) => {
    const n = Number(v.replace(/[^0-9.-]+/g, ""));
    return isNaN(n) ? 0 : n;
  };

  const filteredContracts = contracts.filter((c) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return c.customer.toLowerCase().includes(s) || c.contractNumber?.toLowerCase().includes(s);
  });

  const totalValue = filteredContracts.reduce((sum, c) => sum + parseValue(c.value), 0);

  return (
    <BatelcoLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Contracts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Batelco partner contracts</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search contracts..."
                className="pl-8 glass-input w-[220px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchContracts} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="glass-card p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Contracts</p>
                <h3 className="text-2xl font-bold">{filteredContracts.length}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </Card>
          <Card className="glass-card p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <h3 className="text-2xl font-bold">{formatCurrency(totalValue)}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Batelco Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(3)
                      .fill(0)
                      .map((_, i) => (
                        <TableRow key={`loading-${i}`}>
                          <TableCell colSpan={7}>
                            <div className="h-12 bg-muted animate-pulse rounded" />
                          </TableCell>
                        </TableRow>
                      ))
                  ) : filteredContracts.length > 0 ? (
                    filteredContracts.map((contract, i) => (
                      <TableRow key={contract.id} className="animate-slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
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
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No Batelco contracts found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </BatelcoLayout>
  );
};

export default BatelcoContracts;
